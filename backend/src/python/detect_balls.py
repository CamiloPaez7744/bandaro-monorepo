#!/usr/bin/env python3
"""
Multi-angle 3-cushion billiard table + ball detection pipeline v3.

Key Capabilities:
- Multi-angle table detection (corner views, broadcast side angles, overhead, mobile shots).
- Perspective rectification to canonical 2:1 carom playing surface (284 x 142 cm).
- Precise rail diamond detection (7 on long rails, 3 on short rails).
- Elevation 3D parallax correction for ball contact points.
- Strict 3-cushion ball classifier (White, Yellow, Red) via optimal Hungarian assignment.
- Telemetry: returns detected corners, diamonds, camera angle, and rectified 2D table image.

Usage:
    python detect_balls.py <image_path> [<corners_json>]
"""

import base64
import json
import os
import sys
from dataclasses import dataclass

import math

import cv2
import numpy as np
from scipy.optimize import linear_sum_assignment

# Standard 3-cushion carom dimensions
DEFAULT_TABLE_W = 284.0
DEFAULT_TABLE_H = 142.0
TABLE_ASPECT = DEFAULT_TABLE_W / DEFAULT_TABLE_H  # exactly 2.0


@dataclass
class DetectedBall:
    label: str
    x: float  # normalized 0-1 relative to playing surface
    y: float
    radius: float
    confidence: float
    hsv_sample: np.ndarray | None = None


# ---------------------------------------------------------------------------
# 1. Multi-colorspace Table Contour & Perspective Detection
# ---------------------------------------------------------------------------

def find_table_contour_robust(image: np.ndarray) -> np.ndarray | None:
    """Detect billiard table contour across diverse camera angles and cloth colors."""
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    img_h, img_w = image.shape[:2]
    img_area = img_h * img_w

    # Broad felt color ranges for tournament Blue (Simonis/Million) and Green
    masks = [
        cv2.inRange(hsv, np.array([85, 35, 30]), np.array([135, 255, 255])),   # Blue cloth
        cv2.inRange(hsv, np.array([30, 30, 30]), np.array([90, 255, 255])),    # Green cloth
        cv2.inRange(hsv, np.array([80, 20, 20]), np.array([145, 255, 255])),   # Wide cyan/blue
        cv2.inRange(hsv, np.array([25, 20, 20]), np.array([95, 255, 255])),    # Wide yellow-green
    ]

    best_corners = None
    best_score = 0.0

    for mask in masks:
        kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 17))
        closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel_close, iterations=2)
        kernel_open = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
        cleaned = cv2.morphologyEx(closed, cv2.MORPH_OPEN, kernel_open, iterations=1)

        contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue

        contours = sorted(contours, key=cv2.contourArea, reverse=True)
        for cnt in contours[:4]:
            area = cv2.contourArea(cnt)
            if area < img_area * 0.08:
                continue

            # Convex hull bridges player arms, cue sticks, and scoreboard occlusions
            hull = cv2.convexHull(cnt)
            peri = cv2.arcLength(hull, True)

            for eps_factor in [0.015, 0.02, 0.03, 0.04, 0.05, 0.06]:
                approx = cv2.approxPolyDP(hull, eps_factor * peri, True)
                if len(approx) == 4:
                    pts = approx.reshape(4, 2).astype(np.float32)
                    quad_area = cv2.contourArea(pts)
                    score = quad_area / img_area
                    if score > best_score and cv2.isContourConvex(pts.astype(np.int32)):
                        best_score = score
                        best_corners = pts
                        break

    if best_corners is not None:
        return best_corners

    # Fallback: largest contour minAreaRect
    for mask in masks[:2]:
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest = max(contours, key=cv2.contourArea)
            if cv2.contourArea(largest) > img_area * 0.10:
                rect = cv2.minAreaRect(largest)
                return cv2.boxPoints(rect).astype(np.float32)

    return None


def sort_corners_clockwise(pts: np.ndarray) -> np.ndarray:
    """Sort 4 points clockwise starting from top-left."""
    center = np.mean(pts, axis=0)
    angles = np.arctan2(pts[:, 1] - center[1], pts[:, 0] - center[0])
    pts_sorted = pts[np.argsort(angles)]
    s = pts_sorted.sum(axis=1)
    tl_idx = np.argmin(s)
    return np.roll(pts_sorted, -tl_idx, axis=0)


def evaluate_warp_hypothesis(image: np.ndarray, ordered_pts: np.ndarray, dst_w: int = 1000, dst_h: int = 500) -> tuple[np.ndarray, float]:
    """Warp image to 2:1 aspect and measure ball circularity to verify orientation."""
    dst_pts = np.array([
        [0, 0],
        [dst_w - 1, 0],
        [dst_w - 1, dst_h - 1],
        [0, dst_h - 1],
    ], dtype=np.float32)

    M = cv2.getPerspectiveTransform(ordered_pts, dst_pts)
    warped = cv2.warpPerspective(image, M, (dst_w, dst_h))

    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    m_x, m_y = int(dst_w * 0.05), int(dst_h * 0.05)
    inner_gray = gray[m_y:dst_h-m_y, m_x:dst_w-m_x]
    
    med = np.median(inner_gray)
    diff = cv2.absdiff(inner_gray, int(med))
    _, thresh = cv2.threshold(diff, 28, 255, cv2.THRESH_BINARY)
    
    cnts, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    circularities = []
    
    for cnt in cnts:
        area = cv2.contourArea(cnt)
        if 80 < area < 2500:
            perimeter = cv2.arcLength(cnt, True)
            if perimeter > 0:
                circ = 4 * np.pi * area / (perimeter * perimeter)
                circularities.append(circ)

    avg_circ = float(np.mean(sorted(circularities, reverse=True)[:3])) if circularities else 0.5
    return warped, avg_circ


def order_corners_perspective(image: np.ndarray, pts: np.ndarray) -> tuple[np.ndarray, str]:
    """Order corners into 2:1 landscape orientation with metric foreshortening resolution."""
    cw_pts = sort_corners_clockwise(pts)
    hyp_1 = cw_pts.copy()
    hyp_2 = np.array([cw_pts[1], cw_pts[2], cw_pts[3], cw_pts[0]], dtype=np.float32)

    _, score_1 = evaluate_warp_hypothesis(image, hyp_1)
    _, score_2 = evaluate_warp_hypothesis(image, hyp_2)

    len_01 = np.linalg.norm(cw_pts[1] - cw_pts[0])
    len_23 = np.linalg.norm(cw_pts[2] - cw_pts[3])
    len_12 = np.linalg.norm(cw_pts[2] - cw_pts[1])
    len_30 = np.linalg.norm(cw_pts[3] - cw_pts[0])
    long_ratio_1 = (len_01 + len_23) / max(len_12 + len_30, 1e-3)

    if abs(score_1 - score_2) > 0.07:
        is_hyp_1 = score_1 >= score_2
    else:
        is_hyp_1 = long_ratio_1 >= 1.05

    chosen_corners = hyp_1 if is_hyp_1 else hyp_2
    orientation = "horizontal" if is_hyp_1 else "vertical"
    return chosen_corners, orientation


def classify_camera_perspective(corners: np.ndarray, img_shape: tuple) -> str:
    """Classify camera viewpoint: 'corner_perspective', 'broadcast_side', or 'overhead'."""
    img_h, img_w = img_shape[:2]
    ys = corners[:, 1]
    
    # Check if one corner is significantly lower (closest to bottom) than the rest
    sorted_y = sorted(ys)
    bottom_gap = sorted_y[-1] - sorted_y[-2]
    
    if bottom_gap > img_h * 0.12:
        return "corner_perspective"
    
    # If the two bottom corners are roughly level and perspective convergence is strong
    top_w = np.linalg.norm(corners[1] - corners[0])
    bot_w = np.linalg.norm(corners[2] - corners[3])
    if bot_w > top_w * 1.3:
        return "broadcast_side"
        
    return "overhead"


# ---------------------------------------------------------------------------
# 2. Rail Diamond Detection
# ---------------------------------------------------------------------------

def detect_diamonds_on_rails(warped: np.ndarray) -> list[dict]:
    """Detect diamond markers on the rails of the rectified table image."""
    h, w = warped.shape[:2]
    diamonds = []
    
    rail_strips = [
        ("bottom", int(h * 0.93), h, 0, w, True, 7),
        ("top", 0, int(h * 0.07), 0, w, True, 7),
        ("left", 0, h, 0, int(w * 0.05), False, 3),
        ("right", 0, h, int(w * 0.95), w, False, 3),
    ]

    for name, y1, y2, x1, x2, is_horiz, max_expected in rail_strips:
        strip = warped[y1:y2, x1:x2]
        if strip.size == 0:
            continue
        gray = cv2.cvtColor(strip, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)
        cnts, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        rail_diamonds = []
        for cnt in cnts:
            area = cv2.contourArea(cnt)
            if 6 < area < 160:
                peri = cv2.arcLength(cnt, True)
                if peri > 0:
                    circ = 4 * np.pi * area / (peri * peri)
                    if circ > 0.40:
                        M = cv2.moments(cnt)
                        if M["m00"] > 0:
                            cx = M["m10"] / M["m00"] + x1
                            cy = M["m01"] / M["m00"] + y1
                            coord = cx / w if is_horiz else cy / h
                            if 0.04 < coord < 0.96:
                                rail_diamonds.append({
                                    "x": round(cx / w, 4),
                                    "y": round(cy / h, 4),
                                    "rail": name,
                                    "frac": coord,
                                })

        rail_diamonds.sort(key=lambda d: d["frac"])
        
        # Deduplicate diamonds closer than expected minimum diamond gap
        min_gap = 0.07 if is_horiz else 0.16
        deduped = []
        for d in rail_diamonds:
            if not deduped or (d["frac"] - deduped[-1]["frac"]) >= min_gap:
                deduped.append(d)

        # Cap at maximum expected diamonds per rail
        deduped = deduped[:max_expected]

        for idx, d in enumerate(deduped):
            diamonds.append({
                "x": d["x"],
                "y": d["y"],
                "rail": d["rail"],
                "index": idx + 1,
            })

    return diamonds


# ---------------------------------------------------------------------------
# 3. Ball Candidate Detection & Hungarian Classifier
# ---------------------------------------------------------------------------

def detect_ball_candidates(warped: np.ndarray) -> list[tuple[float, float, float]]:
    """Detect circular ball candidates inside the rectified playing area."""
    h, w = warped.shape[:2]
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(warped, cv2.COLOR_BGR2HSV)
    
    # Measure dominant cloth color in the middle 70% of table
    m_x, m_y = int(w * 0.15), int(h * 0.15)
    cloth_sample = hsv[m_y:h-m_y, m_x:w-m_x]
    cloth_med_h = np.median(cloth_sample[:, :, 0])
    cloth_med_s = np.median(cloth_sample[:, :, 1])
    cloth_med_v = np.median(cloth_sample[:, :, 2])
    
    # Subtraction mask against cloth
    h_diff = np.minimum(np.abs(hsv[:, :, 0] - cloth_med_h), 180 - np.abs(hsv[:, :, 0] - cloth_med_h))
    s_diff = np.abs(hsv[:, :, 1] - cloth_med_s)
    v_diff = np.abs(hsv[:, :, 2] - cloth_med_v)
    
    ball_mask = ((h_diff > 25) | (s_diff > 45) | (v_diff > 50)).astype(np.uint8) * 255
    
    # Mask out outer cushion margin (3%)
    margin_x, margin_y = int(w * 0.025), int(h * 0.035)
    inner_mask = np.zeros((h, w), dtype=np.uint8)
    inner_mask[margin_y:h-margin_y, margin_x:w-margin_x] = 255
    ball_mask = cv2.bitwise_and(ball_mask, inner_mask)
    
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    ball_mask = cv2.morphologyEx(ball_mask, cv2.MORPH_OPEN, kernel)
    
    cnts, _ = cv2.findContours(ball_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates = []
    
    for cnt in cnts:
        area = cv2.contourArea(cnt)
        if 70 < area < 2800:
            perimeter = cv2.arcLength(cnt, True)
            if perimeter == 0:
                continue
            circ = 4 * np.pi * area / (perimeter * perimeter)
            if circ > 0.35:
                (cx, cy), r = cv2.minEnclosingCircle(cnt)
                if 6 <= r <= 32:
                    candidates.append((float(cx), float(cy), float(r)))

    # Supplementary Hough Circles
    blurred = cv2.GaussianBlur(gray, (5, 5), 1.5)
    hough = cv2.HoughCircles(
        blurred,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=20,
        param1=60,
        param2=16,
        minRadius=7,
        maxRadius=25,
    )
    if hough is not None:
        for c in hough[0]:
            cx, cy, r = c
            if margin_x < cx < w - margin_x and margin_y < cy < h - margin_y:
                candidates.append((float(cx), float(cy), float(r)))

    # Deduplicate candidates (within 18 px)
    deduped: list[tuple[float, float, float]] = []
    for c in candidates:
        cx, cy, r = c
        is_dup = False
        for i, existing in enumerate(deduped):
            ex, ey, er = existing
            if np.hypot(cx - ex, cy - ey) < 18:
                is_dup = True
                deduped[i] = ((cx + ex)/2, (cy + ey)/2, max(r, er))
                break
        if not is_dup:
            deduped.append(c)

    return deduped


def classify_three_carom_balls(warped: np.ndarray, candidates: list[tuple[float, float, float]]) -> list[DetectedBall]:
    """Strictly assign candidates to exactly {white, yellow, red} using Hungarian optimization."""
    h, w = warped.shape[:2]
    hsv = cv2.cvtColor(warped, cv2.COLOR_BGR2HSV)
    
    if len(candidates) < 3:
        return []

    ball_data = []
    for cx, cy, r in candidates:
        xi, yi, ri = int(cx), int(cy), max(2, int(r * 0.7))
        y1, y2 = max(0, yi - ri), min(h, yi + ri)
        x1, x2 = max(0, xi - ri), min(w, xi + ri)
        roi = hsv[y1:y2, x1:x2]
        
        if roi.size > 0:
            mean_h = np.mean(roi[:, :, 0])
            mean_s = np.mean(roi[:, :, 1])
            mean_v = np.mean(roi[:, :, 2])
        else:
            mean_h, mean_s, mean_v = 0, 0, 0
            
        ball_data.append({
            "x": cx / w,
            "y": cy / h,
            "r": r,
            "hsv": np.array([mean_h, mean_s, mean_v]),
        })

    # Cost Matrix for [Candidate i] x [Role j]: 0=White, 1=Yellow, 2=Red
    cost_matrix = np.zeros((len(ball_data), 3), dtype=np.float32)

    for i, b in enumerate(ball_data):
        bh, bs, bv = b["hsv"]
        
        # White cost: desires low saturation, high brightness
        cost_white = (bs * 1.5) + max(0, 240 - bv) * 1.0
        
        # Yellow cost: desires hue 35-50, high saturation, high brightness
        h_diff_yellow = abs(bh - 42)
        cost_yellow = (h_diff_yellow * 2.0) + max(0, 150 - bs) * 1.2 + max(0, 180 - bv) * 0.8
        
        # Red cost: desires hue near 0 or 150-180, high saturation
        h_diff_red = min(abs(bh - 5), abs(bh - 155))
        cost_red = (h_diff_red * 2.0) + max(0, 150 - bs) * 1.2 + max(0, 160 - bv) * 0.8
        
        # Cushion border noise penalty
        border_dist = min(b["x"], 1.0 - b["x"], b["y"], 1.0 - b["y"])
        if border_dist < 0.04:
            cost_white += 120
            cost_yellow += 120
            cost_red += 120
            
        cost_matrix[i, 0] = cost_white
        cost_matrix[i, 1] = cost_yellow
        cost_matrix[i, 2] = cost_red

    row_ind, col_ind = linear_sum_assignment(cost_matrix)
    
    role_names = ["white", "yellow", "red"]
    assigned_balls: list[DetectedBall] = []
    
    for role_idx, role_name in enumerate(role_names):
        matching_rows = [r for r, c in zip(row_ind, col_ind) if c == role_idx]
        if matching_rows:
            best_cand_idx = matching_rows[0]
            b = ball_data[best_cand_idx]
            
            # Contact point correction: in perspective, ball optical center is elevated
            corrected_y = min(0.98, max(0.02, b["y"] + 0.006 * (1.0 - b["y"])))
            
            assigned_balls.append(DetectedBall(
                label=role_name,
                x=float(round(b["x"], 4)),
                y=float(round(corrected_y, 4)),
                radius=float(round(b["r"], 2)),
                confidence=float(round(max(0.65, 1.0 - (float(cost_matrix[best_cand_idx, role_idx]) / 300.0)), 3)),
                hsv_sample=b["hsv"],
            ))

    # Enforce cushion bounds and physical non-overlapping between balls (R = 3.1 cm)
    if assigned_balls:
        min_d_cm = 6.25
        pts = [[b.x * 284.0, b.y * 142.0] for b in assigned_balls]
        fallback_angles = [0.0, (2.0 * math.pi) / 3.0, (4.0 * math.pi) / 3.0]

        for it in range(25):
            moved = False
            pair_idx = 0
            for i in range(len(pts)):
                for j in range(i + 1, len(pts)):
                    dx = pts[j][0] - pts[i][0]
                    dy = pts[j][1] - pts[i][1]
                    dist = math.hypot(dx, dy)
                    if dist < min_d_cm:
                        moved = True
                        overlap = min_d_cm - dist
                        if dist < 1e-4:
                            ang = fallback_angles[pair_idx % len(fallback_angles)]
                            nx = math.cos(ang)
                            ny = math.sin(ang)
                        else:
                            nx = dx / dist
                            ny = dy / dist
                        push = overlap * 0.55
                        pts[i][0] -= nx * push
                        pts[i][1] -= ny * push
                        pts[j][0] += nx * push
                        pts[j][1] += ny * push
                        pts[i][0] = max(3.1, min(280.9, pts[i][0]))
                        pts[i][1] = max(3.1, min(138.9, pts[i][1]))
                        pts[j][0] = max(3.1, min(280.9, pts[j][0]))
                        pts[j][1] = max(3.1, min(138.9, pts[j][1]))
                    pair_idx += 1
            if not moved:
                break

        for idx, b in enumerate(assigned_balls):
            b.x = float(round(pts[idx][0] / 284.0, 4))
            b.y = float(round(pts[idx][1] / 142.0, 4))

    return assigned_balls


# ---------------------------------------------------------------------------
# 4. Projective 8x4 Grid & Perspective Depth Analysis
# ---------------------------------------------------------------------------

def compute_projected_grid(corners: np.ndarray, img_w: int, img_h: int, dst_w: int = 1000, dst_h: int = 500) -> dict:
    """
    Project canonical 8x4 diamond grid lines (9 long-rail and 5 short-rail lines)
    onto the original image plane using inverse homography M^-1.
    All coordinates returned are normalized [0..1] relative to image dimensions.
    """
    dst_pts = np.array([
        [0, 0],
        [dst_w - 1, 0],
        [dst_w - 1, dst_h - 1],
        [0, dst_h - 1],
    ], dtype=np.float32)

    M = cv2.getPerspectiveTransform(corners, dst_pts)
    M_inv = np.linalg.inv(M)

    # 9 vertical lines (8 segments of 35.5 cm across 284 cm)
    vertical_lines = []
    for i in range(9):
        x_can = float(i * (dst_w - 1) / 8.0)
        pts_can = np.array([[[x_can, 0.0]], [[x_can, float(dst_h - 1)]]], dtype=np.float32)
        pts_img = cv2.perspectiveTransform(pts_can, M_inv)
        p1 = pts_img[0][0]
        p2 = pts_img[1][0]
        vertical_lines.append({
            "diamondIndex": i,
            "x1": round(float(np.clip(p1[0] / img_w, 0.0, 1.0)), 4),
            "y1": round(float(np.clip(p1[1] / img_h, 0.0, 1.0)), 4),
            "x2": round(float(np.clip(p2[0] / img_w, 0.0, 1.0)), 4),
            "y2": round(float(np.clip(p2[1] / img_h, 0.0, 1.0)), 4),
        })

    # 5 horizontal lines (4 segments of 35.5 cm across 142 cm)
    horizontal_lines = []
    for j in range(5):
        y_can = float(j * (dst_h - 1) / 4.0)
        pts_can = np.array([[[0.0, y_can]], [[float(dst_w - 1), y_can]]], dtype=np.float32)
        pts_img = cv2.perspectiveTransform(pts_can, M_inv)
        p1 = pts_img[0][0]
        p2 = pts_img[1][0]
        horizontal_lines.append({
            "diamondIndex": j,
            "x1": round(float(np.clip(p1[0] / img_w, 0.0, 1.0)), 4),
            "y1": round(float(np.clip(p1[1] / img_h, 0.0, 1.0)), 4),
            "x2": round(float(np.clip(p2[0] / img_w, 0.0, 1.0)), 4),
            "y2": round(float(np.clip(p2[1] / img_h, 0.0, 1.0)), 4),
        })

    return {
        "verticalLines": vertical_lines,
        "horizontalLines": horizontal_lines,
    }


def compute_ball_depth_telemetry(
    balls: list[DetectedBall],
    corners: np.ndarray,
    img_w: int,
    img_h: int,
    dst_w: int = 1000,
    dst_h: int = 500
) -> list[dict]:
    """
    Compute original image coordinates, apparent pixel radius, depth tiering
    (closer = larger apparent radius), and true 3D felt contact points.
    """
    dst_pts = np.array([
        [0, 0],
        [dst_w - 1, 0],
        [dst_w - 1, dst_h - 1],
        [0, dst_h - 1],
    ], dtype=np.float32)

    M = cv2.getPerspectiveTransform(corners, dst_pts)
    M_inv = np.linalg.inv(M)

    enhanced_balls = []
    apparent_radii = []

    for b in balls:
        # Project canonical position back to original image
        px_can = b.x * (dst_w - 1)
        py_can = b.y * (dst_h - 1)
        
        pt_can = np.array([[[px_can, py_can]]], dtype=np.float32)
        pt_img = cv2.perspectiveTransform(pt_can, M_inv)[0][0]
        
        # Local scale factor in image pixels:
        delta_x = 15.0
        pt_neighbor = np.array([[[px_can + delta_x, py_can]]], dtype=np.float32)
        pt_neighbor_img = cv2.perspectiveTransform(pt_neighbor, M_inv)[0][0]
        local_scale = np.linalg.norm(pt_neighbor_img - pt_img) / delta_x
        apparent_r = max(4.0, b.radius * local_scale)
        apparent_radii.append(apparent_r)

        # 3D contact point parallax: the sphere center is elevated by radius R above the cloth.
        # Its ground contact point in perspective view is at the bottom tangent towards the viewer.
        contact_y_px = pt_img[1] + (apparent_r * 0.72)
        contact_x_px = pt_img[0]

        enhanced_balls.append({
            "label": b.label,
            "x": b.x,
            "y": b.y,
            "radius": b.radius,
            "confidence": b.confidence,
            "imageX": round(float(np.clip(pt_img[0] / img_w, 0.0, 1.0)), 4),
            "imageY": round(float(np.clip(pt_img[1] / img_h, 0.0, 1.0)), 4),
            "contactX": round(float(np.clip(contact_x_px / img_w, 0.0, 1.0)), 4),
            "contactY": round(float(np.clip(contact_y_px / img_h, 0.0, 1.0)), 4),
            "apparentRadius": round(float(apparent_r), 1),
        })

    # Sort balls by apparent radius to classify depth tiers
    # Larger apparent radius = closer to the camera
    if apparent_radii:
        sorted_indices = np.argsort(apparent_radii)  # ascending: smallest first
        tier_labels = ["lejana", "media", "cercana"]
        for rank, idx in enumerate(sorted_indices):
            tier = tier_labels[min(rank, len(tier_labels) - 1)]
            enhanced_balls[idx]["depthTier"] = tier
            enhanced_balls[idx]["relativeDepth"] = round(1.0 - (rank / max(1, len(balls) - 1)), 2)

    return enhanced_balls


# ---------------------------------------------------------------------------
# 5. Main API Entry Point
# ---------------------------------------------------------------------------

def detect_from_image(image_path: str, corners_override: list[dict] | None = None) -> dict:
    """Execute complete multi-angle table detection, diamond grid, and ball extraction pipeline."""
    image = cv2.imread(image_path)
    if image is None:
        return {"error": f"No se pudo leer la imagen: {image_path}", "balls": []}

    img_h, img_w = image.shape[:2]

    # 1. Determine corners (manual calibration override vs auto-detection)
    if corners_override and len(corners_override) == 4:
        # Support normalized (extended bounds) or pixel coordinates
        is_normalized = all(-1.0 <= c["x"] <= 3.0 and -1.0 <= c["y"] <= 3.0 for c in corners_override)
        if is_normalized:
            corners = np.array(
                [[c["x"] * img_w, c["y"] * img_h] for c in corners_override],
                dtype=np.float32,
            )
        else:
            corners = np.array(
                [[c["x"], c["y"]] for c in corners_override],
                dtype=np.float32,
            )
        corners, table_orientation = order_corners_perspective(image, corners)
        detection_method = "manual_calibrated"
    else:
        raw_corners = find_table_contour_robust(image)
        if raw_corners is None:
            return {
                "error": "No se pudo detectar el paño de la mesa de billar. Intenta con otra toma.",
                "balls": [],
                "topDownImage": "",
                "detectionMethod": "none",
                "tableOrientation": "horizontal",
            }
        corners, table_orientation = order_corners_perspective(image, raw_corners)
        detection_method = "auto_multi_space"

    camera_angle = classify_camera_perspective(corners, image.shape)

    # 2. Warp to canonical 2:1 playing surface (1000 x 500 px)
    dst_w, dst_h = 1000, 500
    dst_pts = np.array([
        [0, 0],
        [dst_w - 1, 0],
        [dst_w - 1, dst_h - 1],
        [0, dst_h - 1],
    ], dtype=np.float32)

    M = cv2.getPerspectiveTransform(corners, dst_pts)
    warped = cv2.warpPerspective(image, M, (dst_w, dst_h))

    # 3. Compute projective 8x4 diamond grid lines in image space
    projected_grid = compute_projected_grid(corners, img_w, img_h, dst_w, dst_h)

    # 4. Detect diamonds on rails
    diamonds = detect_diamonds_on_rails(warped)

    # 5. Detect and classify 3 carom balls
    candidates = detect_ball_candidates(warped)
    balls = classify_three_carom_balls(warped, candidates)
    detailed_balls = compute_ball_depth_telemetry(balls, corners, img_w, img_h, dst_w, dst_h)

    cw_corners = sort_corners_clockwise(corners)

    if len(balls) < 3:
        return {
            "error": f"Se detectaron {len(balls)} bola(s) pero se necesitan exactamente 3. Ajusta las esquinas manualmente o intenta con otra foto.",
            "balls": detailed_balls,
            "detectedCorners": [
                {"x": round(float(c[0]), 1), "y": round(float(c[1]), 1)} for c in cw_corners
            ],
            "detectedDiamonds": diamonds,
            "projectedGrid": projected_grid,
            "cameraAngle": camera_angle,
            "tableOrientation": table_orientation,
            "topDownImage": "",
            "detectionMethod": detection_method,
        }

    # 6. Encode rectified top-down table to JPEG base64
    _, buffer = cv2.imencode('.jpg', warped, [cv2.IMWRITE_JPEG_QUALITY, 85])
    top_down_b64 = base64.b64encode(buffer).decode('utf-8')

    return {
        "balls": detailed_balls,
        "detectedCorners": [
            {"x": round(float(c[0]), 1), "y": round(float(c[1]), 1)} for c in cw_corners
        ],
        "detectedDiamonds": diamonds,
        "projectedGrid": projected_grid,
        "cameraAngle": camera_angle,
        "tableOrientation": table_orientation,
        "aspectRatio": TABLE_ASPECT,
        "totalDetected": len(candidates),
        "totalValid": len(balls),
        "detectionMethod": detection_method,
        "diamondsDetected": len(diamonds),
        "topDownImage": top_down_b64,
    }



def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Uso: detect_balls.py <image_path> [<corners_json>]"}))
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
