#!/usr/bin/env python3
"""
Automatic billiard table + ball detection pipeline v2.

Improvements over v1:
- Multi-colorspace table detection (HSV + LAB + adaptive)
- SimpleBlobDetector for more robust ball detection
- Diamond-based coordinate calibration
- Better perspective warp with cushion-edge detection
- Multiple detection strategies merged

Usage:
    python detect_balls.py <image_path> [<corners_json>]

Output: JSON to stdout with detected ball positions (normalized 0-1).
"""

import base64
import json
import sys
from dataclasses import dataclass, field

import cv2
import numpy as np

# Standard 3-cushion table dimensions (matches @bandaro/core DEFAULT_TABLE)
DEFAULT_TABLE_W = 284.0
DEFAULT_TABLE_H = 142.0
TABLE_ASPECT = DEFAULT_TABLE_W / DEFAULT_TABLE_H  # ~2.0


@dataclass
class DetectedBall:
    label: str
    x: float  # normalized 0-1 relative to playing surface
    y: float
    radius: float
    confidence: float
    hsv_sample: np.ndarray | None = None


# ---------------------------------------------------------------------------
# Table detection
# ---------------------------------------------------------------------------

def find_table_contour(image: np.ndarray) -> np.ndarray | None:
    """Find the billiard table using multi-colorspace detection.

    Tries HSV green detection with multiple threshold ranges, then falls back
    to LAB colorspace and adaptive thresholding.
    """
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)

    # Multiple green/blue felt threshold ranges for different table colors
    green_ranges = [
        (np.array([35, 40, 40]),  np.array([85, 255, 255])),   # standard green
        (np.array([30, 25, 25]),  np.array([90, 255, 255])),   # wider tolerance
        (np.array([38, 50, 50]),  np.array([82, 255, 255])),   # tighter hue
        (np.array([25, 30, 30]),  np.array([95, 255, 255])),   # very wide
        (np.array([85, 30, 30]),  np.array([120, 255, 255])),  # blue-green / cyan
    ]

    best_contour = None
    best_area = 0
    img_area = image.shape[0] * image.shape[1]

    for lower, upper in green_ranges:
        mask = cv2.inRange(hsv, lower, upper)
        contour = _extract_quadrilateral(mask, image, min_area_ratio=0.08)
        if contour is not None:
            area = cv2.contourArea(contour)
            if area > best_area:
                best_area = area
                best_contour = contour

    if best_contour is not None and best_area >= img_area * 0.08:
        return best_contour

    # Fallback: LAB colorspace (L>80, a<130, b>120 for green felt)
    lower_lab = np.array([60, 0, 100])
    upper_lab = np.array([255, 140, 200])
    mask_lab = cv2.inRange(lab, lower_lab, upper_lab)
    contour = _extract_quadrilateral(mask_lab, image, min_area_ratio=0.10)
    if contour is not None:
        return contour

    # Fallback: adaptive threshold on saturation channel
    s_channel = hsv[:, :, 1]
    _, sat_mask = cv2.threshold(s_channel, 40, 255, cv2.THRESH_BINARY)
    contour = _extract_quadrilateral(sat_mask, image, min_area_ratio=0.10)
    if contour is not None:
        return contour

    # Fallback: largest edge contour via minAreaRect (handles non-quadrilateral contours)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.dilate(edges, kernel, iterations=1)
    edge_contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if edge_contours:
        edge_contours = sorted(edge_contours, key=cv2.contourArea, reverse=True)
        img_area = image.shape[0] * image.shape[1]
        for cnt in edge_contours[:5]:
            area = cv2.contourArea(cnt)
            if area < img_area * 0.15:
                continue
            rect = cv2.minAreaRect(cnt)
            box = cv2.boxPoints(rect)
            return box.astype(np.float32)

    return None


def _extract_quadrilateral(mask: np.ndarray, image: np.ndarray, min_area_ratio: float = 0.08) -> np.ndarray | None:
    """Try to extract a quadrilateral from a binary mask."""
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=3)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=2)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    img_area = image.shape[0] * image.shape[1]

    for contour in contours[:5]:
        area = cv2.contourArea(contour)
        if area < img_area * min_area_ratio:
            continue

        # Try multiple epsilon values for polygon approximation
        peri = cv2.arcLength(contour, True)
        for eps_factor in [0.02, 0.03, 0.04, 0.05]:
            approx = cv2.approxPolyDP(contour, eps_factor * peri, True)
            if len(approx) == 4:
                return approx.reshape(4, 2).astype(np.float32)

    # Fallback: minimum area rectangle
    largest = contours[0]
    rect = cv2.minAreaRect(largest)
    box = cv2.boxPoints(rect)
    return box.astype(np.float32)


def find_table_by_edges(image: np.ndarray) -> np.ndarray | None:
    """Fallback: detect table via edge detection when green detection fails."""
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
        for eps_factor in [0.02, 0.03, 0.04]:
            approx = cv2.approxPolyDP(contour, eps_factor * peri, True)
            if len(approx) == 4:
                return approx.reshape(4, 2).astype(np.float32)

    return None


# ---------------------------------------------------------------------------
# Corner ordering and perspective warp
# ---------------------------------------------------------------------------

def order_corners(pts: np.ndarray) -> np.ndarray:
    """Order 4 corners so that the LONG edges are always horizontal (top/bottom).

    Standard billiard table orientation:
        [0]----[1]    <- long rail (top)
         |      |
        [3]----[2]    <- long rail (bottom)

    The long rails always map to the x-axis, short rails to y-axis.
    """
    # Compute all 4 edge lengths
    edges = []
    for i in range(4):
        j = (i + 1) % 4
        length = np.linalg.norm(pts[j] - pts[i])
        edges.append((i, j, length))

    # Opposite edge pairs: (0-1, 2-3) and (1-2, 3-0)
    pair_a_len = edges[0][2] + edges[2][2]  # edges 0-1 and 2-3
    pair_b_len = edges[1][2] + edges[3][2]  # edges 1-2 and 3-0

    if pair_a_len >= pair_b_len:
        # Edges 0-1 and 2-3 are the long rails
        # Vertices: 0=top-left, 1=top-right, 2=bottom-right, 3=bottom-left
        # Check if we need to flip to ensure left side is correct
        # Use the midpoints to determine orientation
        mid_top = (pts[0] + pts[1]) / 2
        mid_bot = (pts[2] + pts[3]) / 2
        mid_left = (pts[0] + pts[3]) / 2
        mid_right = (pts[1] + pts[2]) / 2

        # Ensure top edge is "above" bottom edge in image coordinates
        # (smaller y = higher in image)
        if mid_top[1] > mid_bot[1]:
            # Swap: what was "top" is actually bottom
            pts = np.array([pts[3], pts[2], pts[1], pts[0]], dtype=np.float32)
    else:
        # Edges 1-2 and 3-0 are the long rails
        # Re-map vertices: new[0]=old[1], new[1]=old[2], new[2]=old[3], new[3]=old[0]
        pts = np.array([pts[1], pts[2], pts[3], pts[0]], dtype=np.float32)

        mid_top = (pts[0] + pts[1]) / 2
        mid_bot = (pts[2] + pts[3]) / 2

        if mid_top[1] > mid_bot[1]:
            pts = np.array([pts[3], pts[2], pts[1], pts[0]], dtype=np.float32)

    return pts


def warp_perspective(image: np.ndarray, corners: np.ndarray) -> np.ndarray:
    """Apply perspective warp to get top-down panoramic view.

    Always produces landscape orientation with long rail as width.
    """
    ordered = order_corners(corners)

    # Long rail (top and bottom edges)
    top_w = np.linalg.norm(ordered[1] - ordered[0])
    bot_w = np.linalg.norm(ordered[2] - ordered[3])
    # Short rail (left and right edges)
    left_h = np.linalg.norm(ordered[3] - ordered[0])
    right_h = np.linalg.norm(ordered[2] - ordered[1])

    # Output is always landscape: width = long rail, height = short rail
    dst_w = 1000
    dst_h = int(dst_w / TABLE_ASPECT)

    dst_pts = np.array([
        [0, 0],
        [dst_w - 1, 0],
        [dst_w - 1, dst_h - 1],
        [0, dst_h - 1],
    ], dtype=np.float32)

    matrix = cv2.getPerspectiveTransform(ordered, dst_pts)
    return cv2.warpPerspective(image, matrix, (dst_w, dst_h))


# ---------------------------------------------------------------------------
# Diamond detection for coordinate calibration
# ---------------------------------------------------------------------------

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
        expanded.append(pt + direction * 0.30)
    expanded = np.array(expanded, dtype=np.float32)

    # Create mask for rail region
    rail_mask = np.zeros(image.shape[:2], dtype=np.uint8)
    cv2.fillPoly(rail_mask, [expanded.astype(np.int32)], 255)
    table_mask = np.zeros(image.shape[:2], dtype=np.uint8)
    cv2.fillPoly(table_mask, [ordered.astype(np.int32)], 255)
    rail_only = cv2.subtract(rail_mask, table_mask)

    # Detect bright spots on the rail (diamonds are white/silver)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, bright = cv2.threshold(gray, 160, 255, cv2.THRESH_BINARY)
    diamond_mask = cv2.bitwise_and(bright, rail_only)

    # Clean up
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    diamond_mask = cv2.morphologyEx(diamond_mask, cv2.MORPH_OPEN, kernel)

    # Find contours of bright spots
    contours, _ = cv2.findContours(diamond_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return []

    # Filter by size and circularity
    diamonds = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 15 or area > 600:
            continue
        perimeter = cv2.arcLength(cnt, True)
        if perimeter == 0:
            continue
        circularity = 4 * np.pi * area / (perimeter * perimeter)
        if circularity < 0.3:
            continue
        M = cv2.moments(cnt)
        if M["m00"] == 0:
            continue
        cx = int(M["m10"] / M["m00"])
        cy = int(M["m01"] / M["m00"])
        diamonds.append((float(cx), float(cy)))

    return diamonds


def calibrate_with_diamonds(
    balls: list[DetectedBall],
    diamonds: list[tuple[float, float]],
    img_shape: tuple,
) -> list[DetectedBall]:
    """Use detected diamonds to improve coordinate normalization.

    Diamonds are at known fractional positions along the table rails.
    Standard 3-cushion table:
    - Long rail: 7 diamonds at 1/8, 2/8, ..., 7/8
    - Short rail: 3 diamonds at 1/4, 2/4, 3/4

    If we detect enough diamonds, we establish a more accurate coordinate
    mapping that accounts for partial tables or imperfect perspective warp.
    """
    if len(diamonds) < 3:
        return balls

    img_h, img_w = img_shape[:2]

    # Convert diamond positions from image coords to normalized coords
    norm_diamonds = [(d[0] / img_w, d[1] / img_h) for d in diamonds]

    # Separate into horizontal and vertical clusters
    xs = [d[0] for d in norm_diamonds]
    ys = [d[1] for d in norm_diamonds]

    # Diamonds on long rails have similar y (top/bottom), short rails have similar x
    x_std = np.std(xs)
    y_std = np.std(ys)

    # If we have diamonds on both axes, we can calibrate
    if x_std > 0.1 and y_std > 0.1:
        # Has diamonds on both long and short rails
        ref_left = min(xs)
        ref_right = max(xs)
        ref_top = min(ys)
        ref_bottom = max(ys)
        ref_w = ref_right - ref_left
        ref_h = ref_bottom - ref_top

        if ref_w > 0.1 and ref_h > 0.1:
            # Re-normalize balls using diamond-derived bounds
            for ball in balls:
                ball.x = float(round((ball.x - ref_left) / ref_w, 4))
                ball.y = float(round((ball.y - ref_top) / ref_h, 4))

    return balls


# ---------------------------------------------------------------------------
# Playing surface mask
# ---------------------------------------------------------------------------

def _create_felt_mask(warped: np.ndarray) -> np.ndarray:
    """Create a binary mask of the playing surface (felt area, excluding rails).

    The warped image includes both the felt and the rail/cushion border.
    This mask identifies just the playing surface where balls can be.
    """
    hsv = cv2.cvtColor(warped, cv2.COLOR_BGR2HSV)
    img_h, img_w = warped.shape[:2]

    # Detect dominant felt color
    s_channel = hsv[:, :, 1]
    h_channel = hsv[:, :, 0]
    saturated = s_channel > 25

    if np.sum(saturated) < 500:
        # Fallback: use center crop (90% of image)
        margin_x = int(img_w * 0.05)
        margin_y = int(img_h * 0.05)
        mask = np.zeros((img_h, img_w), dtype=np.uint8)
        mask[margin_y:img_h - margin_y, margin_x:img_w - margin_x] = 255
        return mask

    h_vals = h_channel[saturated]
    hist, bin_edges = np.histogram(h_vals, bins=18, range=(0, 180))
    dominant_bin = np.argmax(hist)
    dominant_hue_low = int(bin_edges[dominant_bin])
    dominant_hue_high = int(bin_edges[dominant_bin + 1])

    # Build felt mask
    hue_margin = 15
    low_h = max(0, dominant_hue_low - hue_margin)
    high_h = min(179, dominant_hue_high + hue_margin)

    felt_mask = cv2.inRange(hsv, np.array([low_h, 20, 20]), np.array([high_h, 255, 255]))

    # Clean up: close holes, remove noise
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    felt_mask = cv2.morphologyEx(felt_mask, cv2.MORPH_CLOSE, kernel, iterations=3)
    felt_mask = cv2.morphologyEx(felt_mask, cv2.MORPH_OPEN, kernel, iterations=2)

    # Find the largest connected component (should be the playing surface)
    contours, _ = cv2.findContours(felt_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        margin_x = int(img_w * 0.05)
        margin_y = int(img_h * 0.05)
        mask = np.zeros((img_h, img_w), dtype=np.uint8)
        mask[margin_y:img_h - margin_y, margin_x:img_w - margin_x] = 255
        return mask

    # Keep only the largest contour
    largest = max(contours, key=cv2.contourArea)
    mask = np.zeros((img_h, img_w), dtype=np.uint8)
    cv2.drawContours(mask, [largest], -1, 255, -1)

    # Erode slightly to exclude cushion/felt boundary
    kernel_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    mask = cv2.erode(mask, kernel_small, iterations=2)
    return mask


# ---------------------------------------------------------------------------
# Ball detection
# ---------------------------------------------------------------------------

def detect_balls_multi_method(warped: np.ndarray, felt_mask: np.ndarray | None = None) -> tuple[np.ndarray | None, str]:
    """Detect balls using multiple methods and return the best result.

    Methods:
    1. Color-blob detection (non-green regions)
    2. SimpleBlobDetector with tuned parameters
    3. HoughCircles with multiple parameter sets
    """
    results = []

    # Apply felt mask to exclude rail area
    masked_warped = warped.copy()
    if felt_mask is not None:
        masked_warped[felt_mask == 0] = [0, 0, 0]

    # Method 1: Color-blob detection
    circles_color = _detect_balls_by_color(masked_warped)
    if circles_color is not None and len(circles_color) >= 3:
        results.append((circles_color, "color_blob"))

    # Method 2: SimpleBlobDetector
    circles_blob = _detect_balls_by_blob(masked_warped)
    if circles_blob is not None and len(circles_blob) >= 3:
        results.append((circles_blob, "simple_blob"))

    # Method 3: HoughCircles with multiple param sets
    circles_hough = _detect_balls_by_hough(masked_warped)
    if circles_hough is not None and len(circles_hough) >= 3:
        results.append((circles_hough, "hough"))

    # Pick the result with the most detections (up to 6)
    if not results:
        # Method 4: Edge-based contour detection (works regardless of table color)
        circles_edge = _detect_balls_by_edge_contours(masked_warped)
        if circles_edge is not None and len(circles_edge) >= 3:
            return circles_edge, "edge_contours"

        # Last resort: ultra-lenient Hough
        circles_last = _detect_balls_by_hough_ultra(masked_warped)
        if circles_last is not None and len(circles_last) > 0:
            return circles_last, "hough_ultra"
        return None, "none"

    # Prefer color_blob (most reliable for billiard tables), then by count
    results.sort(key=lambda r: (0 if r[1] == "color_blob" else 1, -len(r[0])))
    return results[0]


def _detect_balls_by_color(warped: np.ndarray) -> np.ndarray | None:
    """Detect balls by finding blobs that contrast with the dominant table color.

    Automatically detects the felt color (green, brown, blue, etc.) and finds
    blobs that differ significantly from it.
    """
    hsv = cv2.cvtColor(warped, cv2.COLOR_BGR2HSV)
    img_h, img_w = warped.shape[:2]
    min_dim = min(img_h, img_w)

    # Detect dominant table color by hue histogram of saturated pixels
    s_channel = hsv[:, :, 1]
    h_channel = hsv[:, :, 0]
    saturated = s_channel > 25
    if np.sum(saturated) < 500:
        return None

    h_vals = h_channel[saturated]
    hist, bin_edges = np.histogram(h_vals, bins=18, range=(0, 180))
    dominant_bin = np.argmax(hist)
    dominant_hue_low = int(bin_edges[dominant_bin])
    dominant_hue_high = int(bin_edges[dominant_bin + 1])

    # Build felt mask: dominant hue ± 15 degrees, moderate saturation, moderate brightness
    hue_margin = 15
    low_h = max(0, dominant_hue_low - hue_margin)
    high_h = min(179, dominant_hue_high + hue_margin)

    if low_h >= 0 and high_h <= 179:
        felt_mask = cv2.inRange(hsv, np.array([low_h, 25, 25]), np.array([high_h, 255, 255]))
    else:
        # Hue wraps around 0/180 (red tables)
        mask_lo = cv2.inRange(hsv, np.array([0, 25, 25]), np.array([high_h, 255, 255]))
        mask_hi = cv2.inRange(hsv, np.array([low_h, 25, 25]), np.array([179, 255, 255]))
        felt_mask = cv2.bitwise_or(mask_lo, mask_hi)

    # Also exclude very dark areas (shadows, rails)
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    _, bright_mask = cv2.threshold(gray, 20, 255, cv2.THRESH_BINARY)

    # Ball mask = not felt color AND not too dark
    ball_mask = cv2.bitwise_and(cv2.bitwise_not(felt_mask), bright_mask)

    # Clean up
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    ball_mask = cv2.morphologyEx(ball_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    ball_mask = cv2.morphologyEx(ball_mask, cv2.MORPH_OPEN, kernel, iterations=1)

    # Find contours
    contours, _ = cv2.findContours(ball_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    candidates = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        min_area = max(100, (min_dim * 0.006) ** 2 * np.pi)
        max_area = (min_dim * 0.18) ** 2 * np.pi
        if area < min_area or area > max_area:
            continue

        perimeter = cv2.arcLength(cnt, True)
        if perimeter == 0:
            continue
        circularity = 4 * np.pi * area / (perimeter * perimeter)
        if circularity < 0.30:
            continue

        M = cv2.moments(cnt)
        if M["m00"] == 0:
            continue
        cx = M["m10"] / M["m00"]
        cy = M["m01"] / M["m00"]
        radius = np.sqrt(area / np.pi)

        candidates.append((float(cx), float(cy), float(radius)))

    if not candidates:
        return None

    candidates.sort(key=lambda c: c[2], reverse=True)
    candidates = candidates[:10]

    return np.array(candidates, dtype=np.float32)


def _detect_balls_by_blob(warped: np.ndarray) -> np.ndarray | None:
    """Detect balls using OpenCV SimpleBlobDetector."""
    img_h, img_w = warped.shape[:2]
    min_dim = min(img_h, img_w)

    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (9, 9), 2)

    params = cv2.SimpleBlobDetector_Params()
    params.filterByArea = True
    params.minArea = max(100, int((min_dim * 0.006) ** 2 * np.pi))
    params.maxArea = int((min_dim * 0.18) ** 2 * np.pi)

    params.filterByCircularity = True
    params.minCircularity = 0.3

    params.filterByConvexity = True
    params.minConvexity = 0.4

    params.filterByInertia = True
    params.minInertiaRatio = 0.3

    params.filterByColor = True
    params.blobColor = 255  # detect bright blobs

    detector = cv2.SimpleBlobDetector_create(params)
    keypoints = detector.detect(blurred)

    if not keypoints:
        # Try with less strict params
        params.minCircularity = 0.15
        params.minConvexity = 0.2
        params.minInertiaRatio = 0.15
        detector = cv2.SimpleBlobDetector_create(params)
        keypoints = detector.detect(blurred)

    if not keypoints:
        # Try dark blobs too (dark balls on light felt)
        params.blobColor = 0
        params.minCircularity = 0.15
        detector = cv2.SimpleBlobDetector_create(params)
        keypoints = detector.detect(blurred)

    if not keypoints:
        return None

    candidates = []
    for kp in keypoints:
        x, y = kp.pt
        r = kp.size / 2  # keypoint.size is diameter
        candidates.append((float(x), float(y), float(r)))

    candidates.sort(key=lambda c: c[2], reverse=True)
    candidates = candidates[:10]

    return np.array(candidates, dtype=np.float32)


def _detect_balls_by_hough(warped: np.ndarray) -> np.ndarray | None:
    """Detect balls using HoughCircles with multiple parameter sets."""
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    img_h, img_w = warped.shape[:2]
    min_dim = min(img_h, img_w)

    min_r = max(3, int(min_dim * 0.006))
    max_r = int(min_dim * 0.12)

    param_sets = [
        (1.2, 20, 50, 20, min_r, max_r, 9, 2),
        (1.2, 15, 50, 15, min_r, max_r, 9, 2),
        (1.0, 12, 40, 12, max(3, min_r - 2), max_r + 5, 7, 1),
        (1.0, 10, 35, 10, 3, max_r + 10, 5, 1),
    ]

    for dp, minDist, p1, p2, minR, maxR, bk, bs in param_sets:
        blurred = cv2.GaussianBlur(gray, (bk, bk), bs)
        result = cv2.HoughCircles(
            blurred, cv2.HOUGH_GRADIENT,
            dp=dp, minDist=minDist, param1=p1, param2=p2,
            minRadius=minR, maxRadius=maxR,
        )
        if result is not None and len(result[0]) >= 3:
            return result[0]

    return None


def _detect_balls_by_hough_ultra(warped: np.ndarray) -> np.ndarray | None:
    """Ultra-lenient HoughCircles as last resort."""
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 1)

    result = cv2.HoughCircles(
        blurred, cv2.HOUGH_GRADIENT,
        dp=1.0, minDist=8, param1=25, param2=8,
        minRadius=3, maxRadius=80,
    )
    return result[0] if result is not None else None


def _detect_balls_by_edge_contours(warped: np.ndarray) -> np.ndarray | None:
    """Detect balls via edge detection and circular contour matching.

    Works regardless of table color — finds strong circular edges.
    """
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    img_h, img_w = warped.shape[:2]
    min_dim = min(img_h, img_w)

    blurred = cv2.GaussianBlur(gray, (9, 9), 2)
    edges = cv2.Canny(blurred, 30, 100)

    # Dilate to connect broken edges
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    edges = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    candidates = []
    min_r = max(3, int(min_dim * 0.006))
    max_r = int(min_dim * 0.12)
    min_area_circ = np.pi * min_r ** 2
    max_area_circ = np.pi * max_r ** 2

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area_circ * 0.5 or area > max_area_circ * 2:
            continue

        perimeter = cv2.arcLength(cnt, True)
        if perimeter == 0:
            continue
        circularity = 4 * np.pi * area / (perimeter * perimeter)
        if circularity < 0.3:
            continue

        M = cv2.moments(cnt)
        if M["m00"] == 0:
            continue
        cx = M["m10"] / M["m00"]
        cy = M["m01"] / M["m00"]
        radius = np.sqrt(area / np.pi)

        if radius < min_r * 0.5 or radius > max_r * 1.5:
            continue

        candidates.append((float(cx), float(cy), float(radius)))

    if len(candidates) < 3:
        return None

    candidates.sort(key=lambda c: c[2], reverse=True)
    candidates = candidates[:10]

    return np.array(candidates, dtype=np.float32)


# ---------------------------------------------------------------------------
# Ball color classification
# ---------------------------------------------------------------------------

def classify_ball_color(hsv_mean: np.ndarray) -> str:
    """Classify ball color from mean HSV values.

    Supports all 3-cushion ball sets. NEVER returns 'unknown'.
    Check colored balls FIRST, white LAST.
    """
    h, s, v = float(hsv_mean[0]), float(hsv_mean[1]), float(hsv_mean[2])

    # Blue: hue 85-145
    if 85 <= h <= 145 and s > 40 and v > 30:
        return "blue"

    # Red: hue near 0 or 180
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

    # Fallback based on hue
    if h < 20 or h > 160:
        return "red"
    if h < 40:
        return "yellow"
    return "white"


# ---------------------------------------------------------------------------
# Extraction and classification
# ---------------------------------------------------------------------------

def extract_and_classify(warped: np.ndarray, circles: np.ndarray) -> list[DetectedBall]:
    """Extract color features for each detected circle and classify."""
    hsv = cv2.cvtColor(warped, cv2.COLOR_BGR2HSV)
    balls = []
    img_h, img_w = warped.shape[:2]

    for x, y, r in circles:
        xi, yi = int(x), int(y)
        ri = int(r)
        y1 = max(0, yi - ri)
        y2 = min(img_h, yi + ri)
        x1 = max(0, xi - ri)
        x2 = min(img_w, xi + ri)

        roi_h = y2 - y1
        roi_w = x2 - x1
        if roi_h == 0 or roi_w == 0:
            continue

        roi = hsv[y1:y2, x1:x2]

        # Center of ball relative to ROI
        cx = xi - x1
        cy = yi - y1
        actual_r = min(cx, cy, roi_w - cx, roi_h - cy)

        # Sample from inner 60% of ball radius to avoid felt bleed
        inner_r = max(1, int(actual_r * 0.6))
        mask = np.zeros((roi_h, roi_w), dtype=np.uint8)
        cv2.circle(mask, (cx, cy), inner_r, 255, -1)

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
    """Ensure all 3 balls have different colors: white, yellow, red."""
    TARGET_HSV = {
        "white":  np.array([0, 15, 230]),
        "yellow": np.array([30, 200, 220]),
        "red":    np.array([5, 200, 200]),
    }

    if len(balls) < 2:
        return balls

    labels = [b.label for b in balls]
    has_dup = len(labels) != len(set(labels))

    if not has_dup:
        return balls

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

    target_colors = ["white", "yellow", "red"]
    used = {}
    for b in balls:
        used[b.label] = used.get(b.label, 0) + 1

    missing = [c for c in target_colors if c not in labels]

    for missing_color in missing:
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


# ---------------------------------------------------------------------------
# Coordinate validation
# ---------------------------------------------------------------------------

def validate_and_clamp(balls: list[DetectedBall]) -> list[DetectedBall]:
    """Validate ball positions are within expected bounds and clamp if needed.

    Balls should be within the playing surface (0-1 normalized).
    Balls too close to edges (<2% from border) are suspicious and may
    indicate detection error.
    """
    for ball in balls:
        # Clamp to valid range
        ball.x = max(0.0, min(1.0, ball.x))
        ball.y = max(0.0, min(1.0, ball.y))

        # Reduce confidence for balls near edges
        edge_margin = 0.02
        if ball.x < edge_margin or ball.x > (1 - edge_margin):
            ball.confidence *= 0.7
        if ball.y < edge_margin or ball.y > (1 - edge_margin):
            ball.confidence *= 0.7

    return balls


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def detect_from_image(image_path: str, corners_override: list[dict] | None = None) -> dict:
    """Main detection pipeline."""
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

    # 2. Detect diamonds for calibration
    diamonds = detect_diamonds_on_rails(image, corners)

    # 3. Warp perspective
    warped = warp_perspective(image, corners)

    # 3b. Create playing surface mask (exclude rail area)
    felt_mask = _create_felt_mask(warped)

    # 4. Detect balls using multiple methods
    circles, detection_source = detect_balls_multi_method(warped, felt_mask)

    import sys as _sys
    circle_count = 0 if circles is None else len(circles)
    print(f"[debug] detection: {detection_source}, circles: {circle_count}, warped: {warped.shape[1]}x{warped.shape[0]}, diamonds: {len(diamonds)}", file=_sys.stderr)

    if circles is None or len(circles) == 0:
        return {
            "error": "No se detectaron bolas en la imagen.",
            "balls": [],
            "topDownImage": "",
            "detectionMethod": detection_method,
        }

    # 5. Classify balls
    balls = extract_and_classify(warped, circles)
    balls = deduplicate(balls)

    # 5b. Ensure no duplicate colors
    hsv_warped = cv2.cvtColor(warped, cv2.COLOR_BGR2HSV)
    balls = disambiguate_colors(balls, hsv_warped)

    # 5c. Calibrate coordinates using diamonds if available
    if len(diamonds) >= 3:
        balls = calibrate_with_diamonds(balls, diamonds, warped.shape)

    # 5d. Validate and clamp positions
    balls = validate_and_clamp(balls)

    # 5e. Filter to best 3 balls by size consistency and confidence
    if len(balls) > 3:
        # Keep only the 3 balls closest to the median radius
        if len(balls) > 0:
            radii = [b.radius for b in balls]
            median_r = sorted(radii)[len(radii) // 2]
            for b in balls:
                size_penalty = abs(b.radius - median_r) / max(median_r, 1)
                b.confidence *= max(0.3, 1.0 - size_penalty)
        balls.sort(key=lambda b: b.confidence, reverse=True)
        balls = balls[:3]

    for b in balls:
        print(f"[debug]   ball: {b.label} ({b.x:.3f}, {b.y:.3f}) r={b.radius:.1f} conf={b.confidence:.2f}", file=_sys.stderr)

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
        "totalDetected": circle_count,
        "totalValid": len(balls),
        "detectionMethod": detection_method,
        "diamondsDetected": len(diamonds),
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
            pass

    result = detect_from_image(image_path, corners_override)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
