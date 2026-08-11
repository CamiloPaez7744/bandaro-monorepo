#!/usr/bin/env python3
"""
Automatic billiard table + ball detection pipeline.

No manual corner selection needed. The system automatically:
1. Detects the green felt region (table surface)
2. Finds the table boundary via contour approximation
3. Applies perspective correction to get top-down view
4. Detects billiard balls and classifies by color

Usage:
    python detect_balls.py <image_path> [<corners_json>]

corners_json is OPTIONAL. If provided, it overrides auto-detection.
Output: JSON to stdout with detected ball positions (normalized 0-1).
"""

import base64
import json
import sys
from dataclasses import dataclass

import cv2
import numpy as np

# Standard 3-cushion table dimensions (matches @bandaro/core DEFAULT_TABLE)
DEFAULT_TABLE_W = 284.0
DEFAULT_TABLE_H = 142.0
RAIL_CUSHION_OFFSET = 13.0  # rail(8.27) + cushion(4.73)


@dataclass
class DetectedBall:
    label: str
    x: float  # normalized 0-1 relative to top-down image
    y: float
    radius: float
    confidence: float
    hsv_sample: np.ndarray | None = None


def find_table_contour(image: np.ndarray) -> np.ndarray | None:
    """Find the billiard table by detecting the green felt region.

    Strategy:
    1. Convert to HSV and threshold for green (billiard felt color)
    2. Find contours in the green mask
    3. Pick the largest contour that approximates to a quadrilateral
    """
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    # Green felt: H=35-85, S=40-255, V=40-255 (wide range for different lighting)
    lower_green = np.array([35, 40, 40])
    upper_green = np.array([85, 255, 255])
    mask = cv2.inRange(hsv, lower_green, upper_green)

    # Clean up noise
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=3)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=2)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    # Sort by area, largest first
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    for contour in contours[:5]:
        area = cv2.contourArea(contour)
        img_area = image.shape[0] * image.shape[1]

        # Table should be at least 10% of the image
        if area < img_area * 0.08:
            continue

        # Approximate contour to polygon
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)

        if len(approx) == 4:
            return approx.reshape(4, 2).astype(np.float32)

        # If not exactly 4 points, try with larger epsilon
        approx = cv2.approxPolyDP(contour, 0.04 * peri, True)
        if len(approx) == 4:
            return approx.reshape(4, 2).astype(np.float32)

    # Fallback: use minimum area rectangle of the largest green contour
    largest = contours[0]
    rect = cv2.minAreaRect(largest)
    box = cv2.boxPoints(rect)
    return box.astype(np.float32)


def find_table_by_edges(image: np.ndarray) -> np.ndarray | None:
    """Fallback: detect table via edge detection when green detection fails.

    Works for tables with non-standard felt colors or poor lighting.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    img_area = image.shape[0] * image.shape[1]

    for contour in contours[:10]:
        area = cv2.contourArea(contour)
        if area < img_area * 0.15:
            continue

        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)

        if len(approx) == 4:
            return approx.reshape(4, 2).astype(np.float32)

    return None


def order_corners(pts: np.ndarray) -> np.ndarray:
    """Order 4 corners as: top-left, top-right, bottom-right, bottom-left."""
    s = pts.sum(axis=1)
    d = np.diff(pts, axis=1).flatten()

    ordered = np.zeros((4, 2), dtype=np.float32)
    ordered[0] = pts[np.argmin(s)]   # top-left
    ordered[2] = pts[np.argmax(s)]   # bottom-right
    ordered[1] = pts[np.argmin(d)]   # top-right
    ordered[3] = pts[np.argmax(d)]   # bottom-left

    return ordered


def detect_diamonds_on_rails(image: np.ndarray, corners: np.ndarray) -> list[tuple[float, float]]:
    """Detect diamond markers on the table rails.

    Diamonds are small bright circular features on the dark wood rails.
    Returns list of (x, y) positions in image coordinates.
    """
    ordered = order_corners(corners)

    # Expand the contour outward to cover the rail area
    center = np.mean(ordered, axis=0)
    expanded = []
    for pt in ordered:
        direction = pt - center
        expanded.append(pt + direction * 0.25)
    expanded = np.array(expanded, dtype=np.float32)

    # Create mask for rail region (between table contour and expanded contour)
    rail_mask = np.zeros(image.shape[:2], dtype=np.uint8)
    cv2.fillPoly(rail_mask, [expanded.astype(np.int32)], 255)
    table_mask = np.zeros(image.shape[:2], dtype=np.uint8)
    cv2.fillPoly(table_mask, [ordered.astype(np.int32)], 255)
    rail_only = cv2.subtract(rail_mask, table_mask)

    # Detect bright spots on the rail (diamonds are white/silver)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, bright = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)
    diamond_mask = cv2.bitwise_and(bright, rail_only)

    # Clean up
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    diamond_mask = cv2.morphologyEx(diamond_mask, cv2.MORPH_OPEN, kernel)

    # Find contours of bright spots
    contours, _ = cv2.findContours(diamond_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return []

    # Filter by size (diamonds are small, roughly circular)
    diamonds = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 20 or area > 500:
            continue
        perimeter = cv2.arcLength(cnt, True)
        if perimeter == 0:
            continue
        circularity = 4 * np.pi * area / (perimeter * perimeter)
        if circularity < 0.4:
            continue
        M = cv2.moments(cnt)
        if M["m00"] == 0:
            continue
        cx = int(M["m10"] / M["m00"])
        cy = int(M["m01"] / M["m00"])
        diamonds.append((float(cx), float(cy)))

    return diamonds


def map_balls_with_diamonds(
    balls: list[DetectedBall],
    diamonds: list[tuple[float, float]],
    corners: np.ndarray,
    warped_shape: tuple,
) -> list[DetectedBall]:
    """Use detected diamonds to improve coordinate normalization.

    Diamonds are at known fractional positions along the table rails.
    Standard 3-cushion table:
    - Long rail: 6 diamonds at 1/7, 2/7, 3/7, 4/7, 5/7, 6/7
    - Short rail: 3 diamonds at 1/4, 2/4, 3/4

    If we detect enough diamonds, we can establish a more accurate
    coordinate mapping for partial tables.
    """
    if len(diamonds) < 2:
        return balls

    img_h, img_w = warped_shape[:2]

    # Sort diamonds by position to identify which rail they're on
    # For now, use simple min/max of diamond positions as reference
    xs = [d[0] for d in diamonds]
    ys = [d[1] for d in diamonds]

    # Reference bounds from diamonds (more accurate than contour for partial tables)
    ref_left = min(xs)
    ref_right = max(xs)
    ref_top = min(ys)
    ref_bottom = max(ys)

    ref_w = ref_right - ref_left
    ref_h = ref_bottom - ref_top

    if ref_w < 10 or ref_h < 10:
        return balls

    # Re-normalize balls using diamond-derived bounds
    for ball in balls:
        ball.x = float(round((ball.x * img_w - ref_left) / ref_w, 4))
        ball.y = float(round((ball.y * img_h - ref_top) / ref_h, 4))

    return balls


def warp_perspective(image: np.ndarray, corners: np.ndarray) -> np.ndarray:
    """Apply perspective warp to get top-down view of the table.

    Auto-detects orientation: if the table is taller than wide in the photo,
    the output is portrait (500x1000) instead of landscape (1000x500).
    """
    ordered = order_corners(corners)

    # Detect orientation from the contour shape
    top_w = np.linalg.norm(ordered[1] - ordered[0])
    bot_w = np.linalg.norm(ordered[2] - ordered[3])
    left_h = np.linalg.norm(ordered[3] - ordered[0])
    right_h = np.linalg.norm(ordered[2] - ordered[1])
    avg_w = (top_w + bot_w) / 2
    avg_h = (left_h + right_h) / 2

    if avg_h > avg_w * 1.2:
        # Portrait orientation
        dst_w = 500
        dst_h = 1000
    else:
        # Landscape orientation (default)
        dst_w = 1000
        dst_h = 500

    dst_pts = np.array([
        [0, 0],
        [dst_w - 1, 0],
        [dst_w - 1, dst_h - 1],
        [0, dst_h - 1],
    ], dtype=np.float32)

    matrix = cv2.getPerspectiveTransform(ordered, dst_pts)
    return cv2.warpPerspective(image, matrix, (dst_w, dst_h))


def detect_circles(warped: np.ndarray) -> np.ndarray | None:
    """Detect circular shapes (billiard balls) using Hough Circle Transform."""
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (9, 9), 2)

    circles = cv2.HoughCircles(
        blurred,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=20,
        param1=50,
        param2=20,
        minRadius=8,
        maxRadius=45,
    )

    return circles[0] if circles is not None else None


def detect_balls_by_color(warped: np.ndarray) -> np.ndarray | None:
    """Detect billiard balls by finding non-green blobs on the felt.

    More robust than HoughCircles for partial tables, varying angles,
    and imperfect circle shapes. Works by:
    1. Masking out the green felt
    2. Finding contours of remaining colored regions
    3. Filtering by circularity and size
    """
    hsv = cv2.cvtColor(warped, cv2.COLOR_BGR2HSV)
    img_h, img_w = warped.shape[:2]
    min_dim = min(img_h, img_w)

    # Mask: everything that is NOT green felt
    lower_green = np.array([30, 30, 30])
    upper_green = np.array([90, 255, 255])
    felt_mask = cv2.inRange(hsv, lower_green, upper_green)

    # Also exclude very dark areas (shadows, rails)
    _, bright_mask = cv2.threshold(cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY), 25, 255, cv2.THRESH_BINARY)

    # Ball mask = not green AND not too dark
    ball_mask = cv2.bitwise_and(cv2.bitwise_not(felt_mask), bright_mask)

    # Clean up noise
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    ball_mask = cv2.morphologyEx(ball_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    ball_mask = cv2.morphologyEx(ball_mask, cv2.MORPH_OPEN, kernel, iterations=1)

    # Find contours
    contours, _ = cv2.findContours(ball_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    # Filter contours that look like balls
    candidates = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        # Ball area should be reasonable relative to image size
        # Min: very small ball (far away), Max: not the whole table
        min_area = max(50, (min_dim * 0.005) ** 2 * np.pi)
        max_area = (min_dim * 0.15) ** 2 * np.pi
        if area < min_area or area > max_area:
            continue

        # Check circularity
        perimeter = cv2.arcLength(cnt, True)
        if perimeter == 0:
            continue
        circularity = 4 * np.pi * area / (perimeter * perimeter)
        # Balls are roughly circular (0.5+ even with perspective distortion)
        if circularity < 0.3:
            continue

        # Get center and equivalent radius
        M = cv2.moments(cnt)
        if M["m00"] == 0:
            continue
        cx = M["m10"] / M["m00"]
        cy = M["m01"] / M["m00"]
        radius = np.sqrt(area / np.pi)

        candidates.append((float(cx), float(cy), float(radius)))

    if not candidates:
        return None

    # Sort by area (largest first), take top 10
    candidates.sort(key=lambda c: c[2], reverse=True)
    candidates = candidates[:10]

    return np.array(candidates, dtype=np.float32)


def classify_ball_color(hsv_mean: np.ndarray) -> str:
    """Classify ball color from mean HSV values.

    Supports all 3-cushion ball sets:
    - Standard: white, yellow, red
    - Variant 1: white, orange, red
    - Variant 2: white, yellow, blue
    - Variant 3: habana, orange, red

    NEVER returns 'unknown' — always maps to a standard color.
    Check colored balls FIRST, white LAST (white = low saturation fallback).
    """
    h, s, v = float(hsv_mean[0]), float(hsv_mean[1]), float(hsv_mean[2])

    # Blue: hue 85-145, must have clear blue hue
    if 85 <= h <= 145 and s > 40 and v > 30:
        return "blue"

    # Red: hue near 0 or 180 (wraps around)
    if (h < 20 or h > 160) and s > 40 and v > 30:
        return "red"

    # Orange: hue 5-25, warm and saturated
    if 5 <= h <= 25 and s > 50 and v > 50:
        return "orange"

    # Yellow: hue 20-55, warm and saturated
    if 20 <= h <= 55 and s > 50 and v > 50:
        return "yellow"

    # Habana (cream/tan): warm hue, moderate saturation, bright
    if 10 <= h <= 40 and 20 < s < 120 and v > 120:
        return "habana"

    # White: ONLY if nothing else matched — very low saturation
    if s < 30 and v > 140:
        return "white"

    # Fallback based on hue (never return unknown)
    if h < 20 or h > 160:
        return "red"
    if h < 40:
        return "yellow"
    return "white"


def extract_and_classify(warped: np.ndarray, circles: np.ndarray, is_partial: bool = False) -> list[DetectedBall]:
    """Extract color features for each detected circle and classify.

    Coordinates are normalized to 0-1 across the warped image.
    No size filtering — all detected blobs are considered potential balls.
    """
    hsv = cv2.cvtColor(warped, cv2.COLOR_BGR2HSV)
    balls = []

    img_h, img_w = warped.shape[:2]

    for i, (x, y, r) in enumerate(circles):
        xi, yi = int(x), int(y)
        ri = int(r)
        y1 = max(0, yi - ri)
        y2 = min(hsv.shape[0], yi + ri)
        x1 = max(0, xi - ri)
        x2 = min(hsv.shape[1], xi + ri)

        roi_h = y2 - y1
        roi_w = x2 - x1
        if roi_h == 0 or roi_w == 0:
            continue

        roi = hsv[y1:y2, x1:x2]

        # Center of ball relative to ROI (handles edge clipping)
        cx = xi - x1
        cy = yi - y1
        actual_r = min(cx, cy, roi_w - cx, roi_h - cy)

        mask = np.zeros((roi_h, roi_w), dtype=np.uint8)
        cv2.circle(mask, (cx, cy), max(1, actual_r), 255, -1)

        masked_hsv = roi[mask > 0]
        if len(masked_hsv) == 0:
            continue

        hsv_mean = np.mean(masked_hsv, axis=0)
        label = classify_ball_color(hsv_mean)

        # Normalize to warped image coordinates (0-1)
        norm_x = x / img_w
        norm_y = y / img_h

        balls.append(DetectedBall(
            label=label,
            x=float(round(norm_x, 4)),
            y=float(round(norm_y, 4)),
            radius=float(r),
            confidence=1.0,
        ))

    return balls


def deduplicate(balls: list[DetectedBall], min_dist: float = 0.03) -> list[DetectedBall]:
    """Remove duplicate detections."""
    if not balls:
        return []

    sorted_balls = sorted(balls, key=lambda b: b.confidence, reverse=True)
    kept: list[DetectedBall] = []

    for ball in sorted_balls:
        is_dup = False
        for existing in kept:
            dx = ball.x - existing.x
            dy = ball.y - existing.y
            if (dx * dx + dy * dy) < (min_dist * min_dist):
                is_dup = True
                break
        if not is_dup:
            kept.append(ball)

    return kept


def disambiguate_colors(balls: list[DetectedBall], hsv_image: np.ndarray) -> list[DetectedBall]:
    """Ensure all 3 balls have different colors: white, yellow, red.

    If duplicates exist, reclassify based on HSV proximity to expected colors.
    Expected target colors in HSV (OpenCV scale, H=0-180):
      white:  H=any, S=0-30,   V=200-255
      yellow: H=25-35, S=150-255, V=180-255
      red:    H=0-10 or 170-180, S=150-255, V=150-255
    """
    TARGET_HSV = {
        "white":  np.array([0, 15, 230]),     # low S, high V
        "yellow": np.array([30, 200, 220]),    # warm hue, high S
        "red":    np.array([5, 200, 200]),     # red hue, high S
    }

    if len(balls) < 2:
        return balls

    # Check for duplicate labels
    labels = [b.label for b in balls]
    has_dup = len(labels) != len(set(labels))

    if not has_dup:
        return balls

    # Re-read HSV from the warped image for each ball
    img_h, img_w = hsv_image.shape[:2]
    for ball in balls:
        xi, yi = int(ball.x * img_w), int(ball.y * img_h)
        ri = max(1, int(ball.radius))
        y1, y2 = max(0, yi - ri), min(img_h, yi + ri)
        x1, x2 = max(0, xi - ri), min(img_w, xi + ri)
        roi = hsv_image[y1:y2, x1:x2]
        if roi.size > 0:
            ball.hsv_sample = np.mean(roi.reshape(-1, 3), axis=0)
        else:
            ball.hsv_sample = np.array([0, 0, 0])

    # Find which target colors are missing and which are duplicated
    target_colors = ["white", "yellow", "red"]
    used = {}
    for b in balls:
        used[b.label] = used.get(b.label, 0) + 1

    missing = [c for c in target_colors if c not in labels]

    # For each duplicate, reassign the one closest to a missing color
    for missing_color in missing:
        # Find the ball whose HSV is closest to the missing color's target
        best_idx = -1
        best_dist = float("inf")
        for i, ball in enumerate(balls):
            if used.get(ball.label, 0) > 1:
                dist = np.linalg.norm(ball.hsv_sample - TARGET_HSV[missing_color])
                if dist < best_dist:
                    best_dist = dist
                    best_idx = i

        if best_idx >= 0:
            used[balls[best_idx].label] -= 1
            balls[best_idx].label = missing_color
            used[missing_color] = used.get(missing_color, 0) + 1

    return balls


def filter_valid(balls: list[DetectedBall]) -> list[DetectedBall]:
    """Keep all detected balls — the classifier always returns a valid color."""
    return balls


def detect_from_image(image_path: str, corners_override: list[dict] | None = None) -> dict:
    """Main detection pipeline. Automatically finds the table.

    If corners_override is provided, uses those instead of auto-detection.
    """
    image = cv2.imread(image_path)
    if image is None:
        return {"error": f"Could not read image: {image_path}", "balls": []}

    # 1. Get table corners
    if corners_override and len(corners_override) == 4:
        corners = np.array(
            [[c["x"] * image.shape[1], c["y"] * image.shape[0]] for c in corners_override],
            dtype=np.float32,
        )
        detection_method = "manual"
    else:
        corners = find_table_contour(image)
        detection_method = "auto_green"

        if corners is None:
            corners = find_table_by_edges(image)
            detection_method = "auto_edges"

        if corners is None:
            return {
                "error": "No se pudo detectar la mesa de billar. Intenta con otra foto.",
                "balls": [],
                "topDownImage": "",
                "detectionMethod": "none",
            }

    # 2. Detect if table is partial (doesn't fill the full image)
    img_area = image.shape[0] * image.shape[1]
    contour_area = cv2.contourArea(corners)
    is_partial = contour_area < img_area * 0.6

    # 3. Warp perspective
    warped = warp_perspective(image, corners)

    # 4. Detect balls — try color-based first (more robust), fall back to Hough
    circles = detect_balls_by_color(warped)
    detection_source = "color_blob"

    if circles is None or len(circles) < 3:
        # Try HoughCircles with multiple param sets
        gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
        param_sets = [
            (1.2, 20, 50, 20, 8, 45, 9, 2),
            (1.2, 15, 50, 15, 5, 50, 9, 2),
            (1.0, 12, 40, 12, 5, 55, 7, 1),
            (1.0, 10, 35, 10, 4, 60, 5, 1),
        ]
        for dp, minDist, p1, p2, minR, maxR, bk, bs in param_sets:
            blurred = cv2.GaussianBlur(gray, (bk, bk), bs)
            result = cv2.HoughCircles(
                blurred, cv2.HOUGH_GRADIENT,
                dp=dp, minDist=minDist, param1=p1, param2=p2,
                minRadius=minR, maxRadius=maxR,
            )
            if result is not None and len(result[0]) >= 3:
                circles = result[0]
                detection_source = f"hough({dp},{minDist},{p2},{minR}-{maxR})"
                break

        # Last resort: ultra-lenient Hough
        if circles is None or len(circles) < 3:
            blurred = cv2.GaussianBlur(gray, (5, 5), 1)
            result = cv2.HoughCircles(
                blurred, cv2.HOUGH_GRADIENT,
                dp=1.0, minDist=8, param1=30, param2=8,
                minRadius=3, maxRadius=65,
            )
            if result is not None:
                circles = result[0]
                detection_source = "hough_ultra"

    import sys as _sys
    circle_count = 0 if circles is None else len(circles)
    print(f"[debug] detection: {detection_source}, circles: {circle_count}, warped: {warped.shape[1]}x{warped.shape[0]}", file=_sys.stderr)

    if circles is None or len(circles) == 0:
        return {
            "error": "No se detectaron bolas en la imagen.",
            "balls": [],
            "topDownImage": "",
            "detectionMethod": detection_method,
            "isPartial": is_partial,
        }

    # 5. Classify balls
    balls = extract_and_classify(warped, circles, is_partial=is_partial)
    balls = deduplicate(balls)

    # 5b. Ensure no duplicate colors — each ball must be white, yellow, or red
    hsv_warped = cv2.cvtColor(warped, cv2.COLOR_BGR2HSV)
    balls = disambiguate_colors(balls, hsv_warped)

    for b in balls:
        print(f"[debug]   ball: {b.label} ({b.x:.3f}, {b.y:.3f}) r={b.radius:.1f}", file=_sys.stderr)

    balls = filter_valid(balls)
    print(f"[debug] final: {len(balls)} balls", file=_sys.stderr)

    if len(balls) < 3:
        return {
            "error": f"Se detectaron {len(balls)} bola(s) pero se necesitan 3. Intenta con otra foto con mejor iluminación.",
            "balls": [
                {"label": b.label, "x": float(round(b.x, 4)), "y": float(round(b.y, 4))}
                for b in balls
            ],
            "topDownImage": "",
            "detectionMethod": detection_method,
            "isPartial": is_partial,
        }

    # 6. Encode top-down image
    _, buffer = cv2.imencode('.jpg', warped, [cv2.IMWRITE_JPEG_QUALITY, 85])
    top_down_b64 = base64.b64encode(buffer).decode('utf-8')

    return {
        "balls": [
            {
                "label": b.label,
                "x": float(round(b.x, 4)),
                "y": float(round(b.y, 4)),
                "radius": float(round(b.radius, 2)),
                "confidence": float(round(b.confidence, 3)),
            }
            for b in balls
        ],
        "topDownImage": top_down_b64,
        "totalDetected": len(circles),
        "totalValid": len(balls),
        "detectionMethod": detection_method,
        "isPartial": is_partial,
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: detect_balls.py <image> [<corners_json>]"}))
        sys.exit(1)

    image_path = sys.argv[1]
    corners_override = None

    if len(sys.argv) >= 3:
        try:
            corners_override = json.loads(sys.argv[2])
        except json.JSONDecodeError:
            pass  # ignore invalid corners, use auto-detection

    result = detect_from_image(image_path, corners_override)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
