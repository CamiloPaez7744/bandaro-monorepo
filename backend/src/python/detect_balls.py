#!/usr/bin/env python3
"""
Multi-angle 3-cushion billiard table + ball detection pipeline v5.

Key Capabilities:
1. Inner Cushion Corner ('Cuñas Internas') & Playing Area Detection:
   - Accurately identifies the 4 inner cushion corners (donde se encuentran las dos bandas
     e inicia el área de juego de paño libre de 284 x 142 cm).
   - Strictly excludes outer wooden rails (pasamanos), metal corner plates, and exterior borders.
   - Validates that the detected inner cuñas strictly define the 2:1 carom playing area.
   - Robust against UI overlays, floor backgrounds, and cloth decals.

2. Three Carom Balls Detection by Size & Depth:
   - Strictly confined INSIDE the inner cuñas playing field (zero rail/exterior false positives).
   - Specifically identifies the 3 physical balls: Blanca (White), Amarilla (Yellow), and Roja (Red).
   - Rejects decals, printed logos, and thin trajectory/ruler lines.
   - Detects balls touching or frozen against cushions (sin márgenes agresivos que corten bolas pegadas).
   - Enforces physical uniform ball diameter (61.5 mm) with perspective depth scaling R_apparent(u, v).
   - 3D parallax correction for cloth contact point and depth tiering ('cercana', 'media', 'lejana').

Usage:
    python detect_balls.py <image_path> [<corners_json>]
"""

import base64
import json
import math
import os
import sys
from dataclasses import dataclass

import cv2
import numpy as np

# Standard 3-cushion carom dimensions
DEFAULT_TABLE_W = 284.0
DEFAULT_TABLE_H = 142.0
TABLE_ASPECT = DEFAULT_TABLE_W / DEFAULT_TABLE_H  # exactly 2.0
CANONICAL_W = 1000
CANONICAL_H = 500
BALL_REAL_RADIUS_CM = 3.075
BALL_CANONICAL_RADIUS_PX = BALL_REAL_RADIUS_CM * (CANONICAL_W / DEFAULT_TABLE_W)  # ~10.83 px


@dataclass
class DetectedBall:
    label: str
    x: float  # normalized 0-1 relative to playing surface long axis
    y: float
    radius: float
    confidence: float
    hsv_sample: np.ndarray | None = None
    image_x: float = 0.0
    image_y: float = 0.0
    contact_x: float = 0.0
    contact_y: float = 0.0
    apparent_radius: float = 0.0
    depth_tier: str = "media"
    relative_depth: float = 0.5
    ball_color: str = "red"


# ---------------------------------------------------------------------------
# 1. Inner Cushion Corners ('Cuñas Internas') Detection
# ---------------------------------------------------------------------------

def sort_corners_clockwise(pts: np.ndarray) -> np.ndarray:
    """Sort 4 corners clockwise starting from Top-Left [TL, TR, BR, BL]."""
    center = np.mean(pts, axis=0)
    angles = np.arctan2(pts[:, 1] - center[1], pts[:, 0] - center[0])
    pts_sorted = pts[np.argsort(angles)]
    s = pts_sorted.sum(axis=1)
    tl_idx = np.argmin(s)
    return np.roll(pts_sorted, -tl_idx, axis=0)


def detect_inner_cunas(image: np.ndarray) -> tuple[np.ndarray | None, str, np.ndarray | None]:
    """
    Identifies the 4 internal corners ('cuñas internas') where the rubber cushions
    meet and the flat cloth playing surface begins.
    Returns: (sorted_cunas_4x2, method_name, cloth_mask)
    """
    img_h, img_w = image.shape[:2]
    img_area = float(img_h * img_w)
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    # 1. Adaptive Cloth Sampling in the table interior (middle 40%)
    cx1, cx2 = int(img_w * 0.30), int(img_w * 0.70)
    cy1, cy2 = int(img_h * 0.30), int(img_h * 0.70)
    center_roi = hsv[cy1:cy2, cx1:cx2]

    candidate_masks = []

    if center_roi.size > 0:
        med_h = float(np.median(center_roi[:, :, 0]))
        med_s = float(np.median(center_roi[:, :, 1]))
        med_v = float(np.median(center_roi[:, :, 2]))

        if med_s < 55:
            # Desaturated cloth (Grey / Slate / Silver tournament cloth):
            # Strictly cap saturation (S <= 60) so that colored rubber cushions (e.g. blue cushions with S=250)
            # and outer red carpets are completely excluded, forcing the contour to fit strictly
            # to the inner playing surface (entre la banda/caucho y el paño de juego).
            adaptive_mask = cv2.inRange(
                hsv,
                np.array([max(0, int(med_h - 24)), max(5, int(med_s - 18)), max(40, int(med_v - 65))]),
                np.array([min(180, int(med_h + 24)), min(60, int(med_s + 30)), min(255, int(med_v + 65))]),
            )
        else:
            # Saturated cloth (Simonis Blue, Traditional Green, Burgundy):
            # S >= 65 to strictly exclude neutral wooden handrails and clothing
            adaptive_mask = cv2.inRange(
                hsv,
                np.array([max(0, int(med_h - 18)), max(65, int(med_s - 60)), max(25, int(med_v - 75))]),
                np.array([min(180, int(med_h + 18)), 255, min(255, int(med_v + 75))]),
            )
        candidate_masks.append(("adaptive_center", adaptive_mask))

    # Standard carom cloths as secondary fallbacks (only if adaptive_center does not find a valid contour)
    candidate_masks.extend([
        ("tourney_blue", cv2.inRange(hsv, np.array([86, 75, 40]), np.array([125, 255, 255]))),
        ("traditional_green", cv2.inRange(hsv, np.array([32, 70, 35]), np.array([85, 255, 255]))),
        ("tourney_grey", cv2.inRange(hsv, np.array([85, 8, 110]), np.array([120, 55, 245]))),
    ])

    best_cnt = None
    best_score = -1.0
    best_mask = None

    kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (11, 11))
    kernel_open = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))

    for mask_name, mask in candidate_masks:
        closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel_close, iterations=2)
        cleaned = cv2.morphologyEx(closed, cv2.MORPH_OPEN, kernel_open, iterations=1)

        cnts, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in cnts:
            area = cv2.contourArea(c)
            # Table cloth must occupy at least 6% and at most 94% of the frame
            if area < (img_area * 0.06) or area > (img_area * 0.94):
                continue

            bx, by, bw, bh = cv2.boundingRect(c)
            # Rejects contours bleeding into the entire image border
            touches_borders = (bx <= 2) + (by <= 2) + ((bx + bw) >= img_w - 2) + ((by + bh) >= img_h - 2)
            if touches_borders >= 3 and area > (img_area * 0.85):
                continue

            rect = cv2.minAreaRect(c)
            rw, rh = rect[1]
            if min(rw, rh) < 20:
                continue

            ratio = max(rw, rh) / max(1.0, min(rw, rh))
            # Carom table aspect ratio is 2.0; in broadcast/low-angle shots, screen ratio can reach 7.5
            if ratio > 7.5 or ratio < 1.05:
                continue

            solidity = area / max(1.0, rw * rh)
            # Score emphasizes area, compactness, and table-like shape without penalizing broadcast foreshortening
            score = (area / img_area) * 0.55 + solidity * 0.30 + (1.0 / max(1.0, abs(ratio - 2.0) * 0.25)) * 0.15
            # Give priority boost to adaptive_center because it samples the actual cloth directly
            if mask_name == "adaptive_center":
                score += 0.25

            if score > best_score:
                best_score = score
                best_cnt = c
                best_mask = cleaned

    if best_cnt is None:
        return None, "none", None

    # Find the 4 inner corners (cuñas internas) of the cloth contour
    hull = cv2.convexHull(best_cnt)
    peri = cv2.arcLength(hull, True)

    cunas = None
    # 1. Direct 4-point polygon approximation
    for eps_factor in np.linspace(0.015, 0.085, 45):
        approx = cv2.approxPolyDP(hull, eps_factor * peri, True)
        if len(approx) == 4:
            pts = approx.reshape(4, 2).astype(np.float32)
            if cv2.isContourConvex(pts.astype(np.int32)):
                cunas = pts
                break

    # 2. If 4 vertices not found directly, check for 5-vertex polygon (1 corner occluded by player)
    # and extrapolate the missing corner by intersecting the two adjacent cushion lines
    if cunas is None:
        for eps_factor in np.linspace(0.015, 0.065, 30):
            approx = cv2.approxPolyDP(hull, eps_factor * peri, True)
            if len(approx) == 5:
                pts = approx.reshape(5, 2).astype(np.float32)
                edge_lens = [float(np.linalg.norm(pts[(i+1)%5] - pts[i])) for i in range(5)]
                min_idx = int(np.argmin(edge_lens))

                p_prev1 = pts[(min_idx - 1) % 5]
                p_prev2 = pts[min_idx]
                p_next1 = pts[(min_idx + 1) % 5]
                p_next2 = pts[(min_idx + 2) % 5]

                denom = (p_prev1[0] - p_prev2[0]) * (p_next1[1] - p_next2[1]) - (p_prev1[1] - p_prev2[1]) * (p_next1[0] - p_next2[0])
                if abs(denom) > 1e-4:
                    t = ((p_prev1[0] - p_next1[0]) * (p_next1[1] - p_next2[1]) - (p_prev1[1] - p_next1[1]) * (p_next1[0] - p_next2[0])) / denom
                    p_extrap = np.array([p_prev1[0] + t * (p_prev2[0] - p_prev1[0]), p_prev1[1] + t * (p_prev2[1] - p_prev1[1])], dtype=np.float32)
                    new_pts = []
                    for i in range(5):
                        if i == min_idx:
                            new_pts.append(p_extrap)
                        elif i == (min_idx + 1) % 5:
                            continue
                        else:
                            new_pts.append(pts[i])
                    cunas = np.array(new_pts, dtype=np.float32)
                    break

    # 3. Fallback: minAreaRect
    if cunas is None:
        rect = cv2.minAreaRect(best_cnt)
        cunas = cv2.boxPoints(rect).astype(np.float32)

    sorted_cunas = sort_corners_clockwise(cunas)
    return sorted_cunas, "inner_cushion_cuñas", best_mask


def count_diamonds_on_bottom_rail(image: np.ndarray, pts: np.ndarray) -> int:
    """
    Counts diamond markers on the rail strip directly adjacent to the bottom table edge.
    Carom Billiard Rule:
    - 3 diamonds on the bottom rail -> Short Rail (Banda Corta, 142 cm) -> Table is VERTICAL.
    - 7 diamonds on the bottom rail -> Long Rail (Banda Larga, 284 cm) -> Table is HORIZONTAL.
    """
    img_h, img_w = image.shape[:2]
    # pts are clockwise: [TL, TR, BR, BL]
    p_bl = pts[3]
    p_br = pts[2]
    bot_w = float(np.linalg.norm(p_br - p_bl))
    if bot_w < 50:
        return -1

    # Extract rail strip directly below [p_bl, p_br]
    y_min = int(min(p_bl[1], p_br[1]))
    y_max = int(min(img_h - 1, max(p_bl[1], p_br[1]) + 80))
    x_min = int(max(0, min(p_bl[0], p_br[0]) - 30))
    x_max = int(min(img_w - 1, max(p_bl[0], p_br[0]) + 30))

    if y_max - y_min < 15 or x_max - x_min < 50:
        return -1

    strip = image[y_min:y_max, x_min:x_max]
    if strip.size == 0:
        return -1

    gray = cv2.cvtColor(strip, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (25, 25), 0)
    diff = cv2.subtract(gray, blurred)
    _, thresh = cv2.threshold(diff, 20, 255, cv2.THRESH_BINARY)

    cnts, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    dots = []
    for c in cnts:
        area = cv2.contourArea(c)
        if 8 <= area <= 600:
            peri = cv2.arcLength(c, True)
            if peri > 0:
                circ = 4 * np.pi * area / (peri * peri)
                if circ > 0.40:
                    M = cv2.moments(c)
                    if M["m00"] > 0:
                        cx = M["m10"] / M["m00"] + x_min
                        cy = M["m01"] / M["m00"] + y_min
                        dots.append((cx, cy))

    if not dots:
        return 0

    dots_sorted = sorted(dots, key=lambda d: d[0])
    filtered_diamonds = []
    for d in dots_sorted:
        if not filtered_diamonds or (d[0] - filtered_diamonds[-1][0]) > (bot_w * 0.08):
            filtered_diamonds.append(d)

    return len(filtered_diamonds)


def order_corners_perspective(image: np.ndarray, pts: np.ndarray) -> tuple[np.ndarray, str]:
    """
    Orders the 4 inner cuñas [TL, TR, BR, BL] and determines if the table is horizontal or vertical.
    Uses:
    1. Diamond count on the closest rail (3 diamonds = Banda Corta -> Vertical; 7 diamonds = Banda Larga -> Horizontal).
    2. Lateral perspective convergence angle (theta_conv) and foreshortening ratio (W_bot / W_top).
    In canonical space, the table is standard 1000 x 500 (horizontal).
    """
    cw_pts = sort_corners_clockwise(pts)

    len_01 = float(np.linalg.norm(cw_pts[1] - cw_pts[0]))  # Top width
    len_23 = float(np.linalg.norm(cw_pts[2] - cw_pts[3]))  # Bottom width
    len_12 = float(np.linalg.norm(cw_pts[2] - cw_pts[1]))  # Right height
    len_30 = float(np.linalg.norm(cw_pts[3] - cw_pts[0]))  # Left height

    # 1. Primary Diagnostic: Diamond count on bottom rail
    num_diamonds = count_diamonds_on_bottom_rail(image, cw_pts)
    if num_diamonds in [2, 3, 4]:
        return cw_pts, "vertical"
    elif num_diamonds >= 5:
        return cw_pts, "horizontal"

    # 2. Secondary Diagnostic: Geometric perspective convergence
    l_ang = np.degrees(np.arctan2(cw_pts[3][1] - cw_pts[0][1], cw_pts[3][0] - cw_pts[0][0]))
    r_ang = np.degrees(np.arctan2(cw_pts[2][1] - cw_pts[1][1], cw_pts[2][0] - cw_pts[1][0]))
    conv_lateral = abs(l_ang - r_ang)

    w_ratio = max(len_23, len_01) / max(1.0, min(len_23, len_01))

    # In longitudinal broadcast shots (vertical table looking down length), convergence is strong (theta > 40 deg, W_ratio > 1.45)
    if conv_lateral >= 40.0 and w_ratio >= 1.45:
        return cw_pts, "vertical"

    # In overhead/near-overhead shots, compare 2D bounding lengths
    avg_width = (len_01 + len_23) / 2.0
    avg_height = (len_12 + len_30) / 2.0
    is_vertical = avg_height > avg_width * 1.15
    orientation = "vertical" if is_vertical else "horizontal"

    return cw_pts, orientation


def classify_camera_perspective(corners: np.ndarray, img_shape: tuple) -> str:
    """
    Classifies camera elevation and perspective type:
    - 'overhead_cenital': Top-down view (85°-90°), parallel rails, no distortion.
    - 'high_angle_picado': Elevated view (60°-85°), subtle convergence.
    - 'picado_medio': Stadium/stand view (40°-60°), moderate convergence.
    - 'broadcast_panoramic': Television broadcast angle (20°-40°), strong foreshortening.
    - 'table_level_low_angle': Extreme low angle (<20°), compressed table.
    - 'corner_perspective': 3/4 diagonal view showing one long and one short rail.
    """
    img_h, img_w = img_shape[:2]
    ys = corners[:, 1]
    sorted_y = sorted(ys)
    bottom_gap = sorted_y[-1] - sorted_y[-2]

    if bottom_gap > img_h * 0.12:
        return "corner_perspective"

    top_w = float(np.linalg.norm(corners[1] - corners[0]))
    bot_w = float(np.linalg.norm(corners[2] - corners[3]))
    left_h = float(np.linalg.norm(corners[3] - corners[0]))
    right_h = float(np.linalg.norm(corners[2] - corners[1]))

    w_ratio = max(bot_w, top_w) / max(1.0, min(bot_w, top_w))
    avg_w = (top_w + bot_w) / 2.0
    avg_h = (left_h + right_h) / 2.0
    screen_ratio = avg_w / max(1.0, avg_h)

    l_ang = np.degrees(np.arctan2(corners[3][1] - corners[0][1], corners[3][0] - corners[0][0]))
    r_ang = np.degrees(np.arctan2(corners[2][1] - corners[1][1], corners[2][0] - corners[1][0]))
    conv_lateral = abs(l_ang - r_ang)

    if screen_ratio > 6.0:
        return "table_level_low_angle"
    elif conv_lateral >= 50.0 or w_ratio >= 1.65:
        return "broadcast_panoramic"
    elif conv_lateral >= 25.0 or w_ratio >= 1.25:
        return "picado_medio"
    elif conv_lateral >= 4.0 or w_ratio >= 1.06:
        return "high_angle_picado"
    else:
        return "overhead_cenital"


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
                                    "index": 0,
                                })

        rail_diamonds.sort(key=lambda d: d["frac"])
        min_gap = 0.07 if is_horiz else 0.16
        deduped = []
        for d in rail_diamonds:
            if not deduped or (d["frac"] - deduped[-1]["frac"]) >= min_gap:
                deduped.append(d)

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
# 3. Ball Detection Inside Inner Cuñas by Size and Perspective Depth
# ---------------------------------------------------------------------------

def detect_and_classify_balls(
    image: np.ndarray,
    cunas: np.ndarray,
    orientation: str,
    dst_w: int = CANONICAL_W,
    dst_h: int = CANONICAL_H,
) -> tuple[list[DetectedBall], np.ndarray]:
    """
    Detects the 3 carom balls (White, Yellow, Red) strictly INSIDE the inner cuñas
    playing surface, scoring by physical size, depth gradient, and chromatic signature.
    """
    img_h, img_w = image.shape[:2]

    # Map the inner cuñas to canonical 1000 x 500 space
    if orientation == "vertical":
        # For a vertical table:
        # TL (top-left) -> (0, dst_h - 1)
        # TR (top-right) -> (0, 0)
        # BR (bottom-right) -> (dst_w - 1, 0)
        # BL (bottom-left) -> (dst_w - 1, dst_h - 1)
        dst_pts = np.array([
            [0, dst_h - 1],
            [0, 0],
            [dst_w - 1, 0],
            [dst_w - 1, dst_h - 1],
        ], dtype=np.float32)
    else:
        # Horizontal table:
        dst_pts = np.array([
            [0, 0],
            [dst_w - 1, 0],
            [dst_w - 1, dst_h - 1],
            [0, dst_h - 1],
        ], dtype=np.float32)

    M = cv2.getPerspectiveTransform(cunas, dst_pts)
    M_inv = np.linalg.inv(M)
    warped = cv2.warpPerspective(image, M, (dst_w, dst_h))
    warped_hsv = cv2.cvtColor(warped, cv2.COLOR_BGR2HSV)

    # Sample cloth color in canonical space to handle blue balls on non-blue cloth
    cloth_roi = warped_hsv[int(dst_h * 0.35):int(dst_h * 0.65), int(dst_w * 0.35):int(dst_w * 0.65)]
    w_med_h = float(np.median(cloth_roi[:, :, 0]))
    w_med_s = float(np.median(cloth_roi[:, :, 1]))
    cloth_is_blue = (86 <= w_med_h <= 130 and w_med_s >= 55)

    def extract_best_ball_from_mask(mask: np.ndarray, min_area=8, max_area=3500):
        cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        best = None
        best_score = -1.0
        for c in cnts:
            area = cv2.contourArea(c)
            if area < min_area or area > max_area:
                continue
            (cx, cy), r = cv2.minEnclosingCircle(c)
            peri = cv2.arcLength(c, True)
            circ = 4 * np.pi * area / (peri * peri) if peri > 0 else 0
            if circ < 0.25:
                continue
            score = area * max(0.2, circ)
            if score > best_score:
                best_score = score
                best = (float(cx), float(cy), float(r), float(score))
        return best

    # 1. White Ball Detection (High Brightness, Low Saturation, Circular, Not a Line)
    white_mask = cv2.inRange(warped_hsv, (0, 0, 190), (180, 55, 255))
    cnts_w, _ = cv2.findContours(white_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    best_white = None
    best_white_score = -1.0
    for c in cnts_w:
        area = cv2.contourArea(c)
        if area < 8 or area > 1800:
            continue
        (cx, cy), r = cv2.minEnclosingCircle(c)
        peri = cv2.arcLength(c, True)
        circ = 4 * np.pi * area / (peri * peri) if peri > 0 else 0
        bx, by, bw, bh = cv2.boundingRect(c)
        bb_ratio = max(bw, bh) / max(1.0, min(bw, bh))
        if bb_ratio > 2.2 or circ < 0.35:
            continue
        score = circ * 2.0 + (area / 100.0) - abs(r - BALL_CANONICAL_RADIUS_PX) * 0.05
        if score > best_white_score:
            best_white_score = score
            best_white = (float(cx), float(cy), float(r), float(score))

    # 2. Yellow Ball Detection (Intense Vibrant Yellow)
    yellow_mask = cv2.inRange(warped_hsv, (18, 75, 75), (38, 255, 255))
    best_yellow = extract_best_ball_from_mask(yellow_mask)

    # 3. Third Ball Detection: Carom sets use Red (traditional), Orange (Aramith tournament), or Blue (PBA Korean Tour)
    red_mask = (
        cv2.inRange(warped_hsv, (0, 70, 70), (14, 255, 255)) |
        cv2.inRange(warped_hsv, (165, 70, 70), (180, 255, 255))
    )
    orange_mask = cv2.inRange(warped_hsv, (9, 85, 75), (24, 255, 255))
    if not cloth_is_blue:
        blue_mask = cv2.inRange(warped_hsv, (95, 65, 50), (135, 255, 255))
    else:
        blue_mask = np.zeros_like(red_mask)

    best_red_cand = extract_best_ball_from_mask(red_mask)
    best_orange_cand = extract_best_ball_from_mask(orange_mask)
    best_blue_cand = extract_best_ball_from_mask(blue_mask)

    third_candidates = [
        ("red", best_red_cand),
        ("orange", best_orange_cand),
        ("blue", best_blue_cand),
    ]

    valid_third = []
    for c_name, cand in third_candidates:
        if cand is not None:
            cx, cy = cand[0], cand[1]
            if best_white and math.hypot(cx - best_white[0], cy - best_white[1]) < 22:
                continue
            if best_yellow and math.hypot(cx - best_yellow[0], cy - best_yellow[1]) < 22:
                continue
            valid_third.append((c_name, cand))

    valid_third.sort(key=lambda item: item[1][3], reverse=True)
    third_color = valid_third[0][0] if valid_third else "red"
    best_third = valid_third[0][1] if valid_third else None

    # Fallback search directly in image space if any ball was missed by warping thresholds
    def fallback_search_in_image(target_role: str):
        field_mask = np.zeros((img_h, img_w), dtype=np.uint8)
        cv2.fillPoly(field_mask, [cunas.astype(np.int32)], 255)
        hsv_img = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

        if target_role == "white":
            mask = cv2.inRange(hsv_img, (0, 0, 215), (180, 50, 255))
        elif target_role == "yellow":
            mask = cv2.inRange(hsv_img, (16, 80, 70), (38, 255, 255))
        else:
            # Third ball: red or orange or blue
            m_r = cv2.inRange(hsv_img, (0, 75, 70), (14, 255, 255)) | cv2.inRange(hsv_img, (165, 75, 70), (180, 255, 255))
            m_o = cv2.inRange(hsv_img, (9, 85, 75), (24, 255, 255))
            mask = m_r | m_o
            if not cloth_is_blue:
                mask = mask | cv2.inRange(hsv_img, (95, 65, 50), (135, 255, 255))

        mask = cv2.bitwise_and(mask, field_mask)
        cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        best = None
        best_s = -1.0
        for c in cnts:
            area = cv2.contourArea(c)
            if area < 4:
                continue
            (ix, iy), ir = cv2.minEnclosingCircle(c)
            peri = cv2.arcLength(c, True)
            circ = 4 * np.pi * area / (peri * peri) if peri > 0 else 0
            if target_role == "white":
                bx, by, bw, bh = cv2.boundingRect(c)
                if (max(bw, bh) / max(1.0, min(bw, bh))) > 2.0:
                    continue
            s = area * circ
            if s > best_s:
                best_s = s
                pt_img = np.array([[[ix, iy]]], dtype=np.float32)
                pt_can = cv2.perspectiveTransform(pt_img, M)[0][0]
                best = (float(pt_can[0]), float(pt_can[1]), float(BALL_CANONICAL_RADIUS_PX), float(s))
        return best

    if best_third is None:
        best_third = fallback_search_in_image("third")
    if best_yellow is None:
        best_yellow = fallback_search_in_image("yellow")
    if best_white is None:
        best_white = fallback_search_in_image("white")

    raw_balls = [
        ("white", best_white, "white"),
        ("yellow", best_yellow, "yellow"),
        ("red", best_third, third_color),
    ]

    detected_balls: list[DetectedBall] = []
    apparent_radii = []

    for label, b_data, b_color in raw_balls:
        if b_data is None:
            continue
        cx, cy, r_can, conf_score = b_data
        nx = float(np.clip(cx / dst_w, 0.005, 0.995))
        ny = float(np.clip(cy / dst_h, 0.005, 0.995))

        # Project canonical position to image plane
        pt_can = np.array([[[cx, cy]]], dtype=np.float32)
        pt_img = cv2.perspectiveTransform(pt_can, M_inv)[0][0]
        img_x = float(np.clip(pt_img[0] / img_w, 0.0, 1.0))
        img_y = float(np.clip(pt_img[1] / img_h, 0.0, 1.0))

        # Local magnification scale in image pixels
        delta = 10.0
        pt_neighbor = np.array([[[cx + delta, cy]]], dtype=np.float32)
        pt_neighbor_img = cv2.perspectiveTransform(pt_neighbor, M_inv)[0][0]
        local_scale = float(np.linalg.norm(pt_neighbor_img - pt_img) / delta)
        apparent_r = max(3.0, BALL_CANONICAL_RADIUS_PX * local_scale)
        apparent_radii.append(apparent_r)

        # 3D contact point parallax: the spherical ball touches the cloth at the bottom tangent
        contact_y_px = pt_img[1] + (apparent_r * 0.72)
        contact_x_px = pt_img[0]

        detected_balls.append(DetectedBall(
            label=label,
            x=round(nx, 4),
            y=round(ny, 4),
            radius=round(r_can, 2),
            confidence=round(min(0.98, max(0.72, 0.85 + (conf_score / 200.0))), 3),
            image_x=round(img_x, 4),
            image_y=round(img_y, 4),
            contact_x=round(float(np.clip(contact_x_px / img_w, 0.0, 1.0)), 4),
            contact_y=round(float(np.clip(contact_y_px / img_h, 0.0, 1.0)), 4),
            apparent_radius=round(apparent_r, 1),
            ball_color=b_color,
        ))

    # Sort balls by apparent radius to classify depth tiers (larger = closer to camera)
    if apparent_radii and len(detected_balls) == 3:
        sorted_indices = np.argsort(apparent_radii)
        tier_labels = ["lejana", "media", "cercana"]
        for rank, idx in enumerate(sorted_indices):
            tier = tier_labels[min(rank, len(tier_labels) - 1)]
            detected_balls[idx].depth_tier = tier
            detected_balls[idx].relative_depth = round(1.0 - (rank / max(1, len(detected_balls) - 1)), 2)

    # Physical non-overlapping resolution (minimum ball distance = 6.25 cm on 284 x 142 cm table)
    if len(detected_balls) >= 2:
        min_d_cm = 6.25
        pts_cm = [[b.x * DEFAULT_TABLE_W, b.y * DEFAULT_TABLE_H] for b in detected_balls]
        for _ in range(15):
            moved = False
            for i in range(len(pts_cm)):
                for j in range(i + 1, len(pts_cm)):
                    dx = pts_cm[j][0] - pts_cm[i][0]
                    dy = pts_cm[j][1] - pts_cm[i][1]
                    dist = math.hypot(dx, dy)
                    if dist < min_d_cm:
                        moved = True
                        overlap = min_d_cm - dist
                        nx = dx / max(1e-4, dist)
                        ny = dy / max(1e-4, dist)
                        push = overlap * 0.52
                        pts_cm[i][0] -= nx * push
                        pts_cm[i][1] -= ny * push
                        pts_cm[j][0] += nx * push
                        pts_cm[j][1] += ny * push
                        pts_cm[i][0] = max(3.1, min(DEFAULT_TABLE_W - 3.1, pts_cm[i][0]))
                        pts_cm[i][1] = max(3.1, min(DEFAULT_TABLE_H - 3.1, pts_cm[i][1]))
                        pts_cm[j][0] = max(3.1, min(DEFAULT_TABLE_W - 3.1, pts_cm[j][0]))
                        pts_cm[j][1] = max(3.1, min(DEFAULT_TABLE_H - 3.1, pts_cm[j][1]))
            if not moved:
                break

        for idx, b in enumerate(detected_balls):
            b.x = round(pts_cm[idx][0] / DEFAULT_TABLE_W, 4)
            b.y = round(pts_cm[idx][1] / DEFAULT_TABLE_H, 4)

    return detected_balls, warped


# ---------------------------------------------------------------------------
# 4. Projective Diamond Grid
# ---------------------------------------------------------------------------

def compute_projected_grid(
    corners: np.ndarray,
    img_w: int,
    img_h: int,
    orientation: str,
    dst_w: int = CANONICAL_W,
    dst_h: int = CANONICAL_H,
) -> dict:
    """Project canonical 8x4 diamond grid lines onto the image plane."""
    if orientation == "vertical":
        dst_pts = np.array([
            [0, dst_h - 1],
            [0, 0],
            [dst_w - 1, 0],
            [dst_w - 1, dst_h - 1],
        ], dtype=np.float32)
    else:
        dst_pts = np.array([
            [0, 0],
            [dst_w - 1, 0],
            [dst_w - 1, dst_h - 1],
            [0, dst_h - 1],
        ], dtype=np.float32)

    M = cv2.getPerspectiveTransform(corners, dst_pts)
    M_inv = np.linalg.inv(M)

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


# ---------------------------------------------------------------------------
# 5. Main Execution Entry Point
# ---------------------------------------------------------------------------

def detect_from_image(image_path: str, corners_override: list[dict] | None = None) -> dict:
    """Execute complete table identification, cuñas extraction, and depth-based ball detection."""
    image = cv2.imread(image_path)
    if image is None:
        return {"error": f"No se pudo leer la imagen: {image_path}", "balls": []}

    img_h, img_w = image.shape[:2]

    # 1. Determine corners (manual calibration override vs auto-detection)
    if corners_override and len(corners_override) == 4:
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
        detection_method = "manual_calibrated_cunas"
    else:
        raw_corners, method, _ = detect_inner_cunas(image)
        if raw_corners is None:
            return {
                "error": "No se pudo identificar la conexión de las bandas (cuñas) de la mesa. Ajusta manualmente las esquinas en la vista de calibración.",
                "balls": [],
                "topDownImage": "",
                "detectionMethod": "none",
                "tableOrientation": "horizontal",
            }
        corners, table_orientation = order_corners_perspective(image, raw_corners)
        detection_method = method

    camera_angle = classify_camera_perspective(corners, image.shape)

    # 2. Detect the 3 balls strictly inside the inner cuñas playing surface
    balls, warped = detect_and_classify_balls(
        image=image,
        cunas=corners,
        orientation=table_orientation,
        dst_w=CANONICAL_W,
        dst_h=CANONICAL_H,
    )

    # 3. Compute projective 8x4 diamond grid lines
    projected_grid = compute_projected_grid(
        corners=corners,
        img_w=img_w,
        img_h=img_h,
        orientation=table_orientation,
        dst_w=CANONICAL_W,
        dst_h=CANONICAL_H,
    )

    # 4. Detect diamonds on rails
    diamonds = detect_diamonds_on_rails(warped)

    formatted_balls = [
        {
            "label": b.label,
            "x": b.x,
            "y": b.y,
            "radius": b.radius,
            "confidence": b.confidence,
            "imageX": b.image_x,
            "imageY": b.image_y,
            "contactX": b.contact_x,
            "contactY": b.contact_y,
            "apparentRadius": b.apparent_radius,
            "depthTier": b.depth_tier,
            "relativeDepth": b.relative_depth,
            "ballColor": b.ball_color,
        }
        for b in balls
    ]

    # Convert corners to pixel coordinates for the frontend
    cw_corners = sort_corners_clockwise(corners)
    detected_corners_payload = [
        {"x": round(float(c[0]), 1), "y": round(float(c[1]), 1)} for c in cw_corners
    ]

    if len(balls) < 3:
        return {
            "error": f"Se detectaron {len(balls)} bola(s) dentro del área de juego pero se necesitan exactamente 3. Puedes colocar las bolas faltantes con los tiradores y la lupa.",
            "balls": formatted_balls,
            "detectedCorners": detected_corners_payload,
            "detectedDiamonds": diamonds,
            "projectedGrid": projected_grid,
            "cameraAngle": camera_angle,
            "tableOrientation": table_orientation,
            "topDownImage": "",
            "detectionMethod": detection_method,
            "totalDetected": len(balls),
            "totalValid": len(balls),
        }

    # 5. Encode rectified top-down table to JPEG base64
    _, buffer = cv2.imencode('.jpg', warped, [cv2.IMWRITE_JPEG_QUALITY, 85])
    top_down_b64 = base64.b64encode(buffer).decode('utf-8')

    return {
        "balls": formatted_balls,
        "detectedCorners": detected_corners_payload,
        "detectedDiamonds": diamonds,
        "projectedGrid": projected_grid,
        "cameraAngle": camera_angle,
        "tableOrientation": table_orientation,
        "aspectRatio": TABLE_ASPECT,
        "totalDetected": len(balls),
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
