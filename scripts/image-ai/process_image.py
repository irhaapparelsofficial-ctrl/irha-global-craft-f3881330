#!/usr/bin/env python3
"""Guarded product-image enhancement for Irha Apparels.

The original is never modified. The processor removes the source background,
optionally applies one bounded EDSR x2 super-resolution pass, composites the
product onto the approved charcoal B2B studio, and writes a high-resolution
master plus responsive WebP derivatives. Unsafe masks are marked for manual
review.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from dataclasses import asdict, dataclass
from io import BytesIO
from pathlib import Path
from typing import Iterable

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from rembg import new_session, remove

MASTER_WIDTH = 2400
MASTER_HEIGHT = 3000
SOURCE_MAX_EDGE = 2400
SEGMENT_MAX_EDGE = 1600
EDSR_MAX_EDGE = 700
RESPONSIVE_WIDTHS = (360, 720, 1200, 1600)
BACKGROUND_STYLE = "charcoal_studio_v1"
BACKGROUND_HEX = "#101722"
TOP_RGB = (10, 15, 24)
BOTTOM_RGB = (36, 43, 55)
WEBP_QUALITY = {360: 80, 720: 84, 1200: 86, 1600: 88}


@dataclass
class ProcessManifest:
    status: str
    backgroundStyle: str
    backgroundHex: str
    enhanced: bool
    upscaled: bool
    qualityScore: float
    reviewReason: str | None
    sourceWidth: int
    sourceHeight: int
    masterWidth: int
    masterHeight: int
    sourceSharpness: float
    foregroundRatio: float
    translucentRatio: float
    majorComponents: int
    outputBytes: dict[str, int]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--edsr-model", type=Path, default=Path(os.getenv("IRHA_EDSR_MODEL", "models/EDSR_x2.pb")))
    parser.add_argument("--rembg-model", default=os.getenv("IRHA_REMBG_MODEL", "isnet-general-use"))
    parser.add_argument("--asset-id", default="")
    parser.add_argument("--file-name", default="")
    return parser.parse_args()


def resize_to_max_edge(image: Image.Image, maximum: int) -> Image.Image:
    max_edge = max(image.size)
    if max_edge <= maximum:
        return image
    scale = maximum / max_edge
    return image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )


def load_rgb(path: Path) -> Image.Image:
    with Image.open(path) as source:
        source.load()
        image = source.convert("RGBA")
    return resize_to_max_edge(image, SOURCE_MAX_EDGE)


def sharpness_score(image: Image.Image) -> float:
    preview = resize_to_max_edge(image.convert("RGB"), 1200)
    rgb = np.asarray(preview)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def upscale_edsr(image: Image.Image, model_path: Path) -> Image.Image:
    if not model_path.is_file():
        raise FileNotFoundError(f"EDSR model is missing: {model_path}")
    if max(image.size) > EDSR_MAX_EDGE:
        raise ValueError(f"EDSR input exceeds bounded edge of {EDSR_MAX_EDGE}px")

    sr = cv2.dnn_superres.DnnSuperResImpl_create()
    sr.readModel(str(model_path))
    sr.setModel("edsr", 2)
    bgr = cv2.cvtColor(np.asarray(image.convert("RGB")), cv2.COLOR_RGB2BGR)
    enlarged = sr.upsample(bgr)
    return Image.fromarray(cv2.cvtColor(enlarged, cv2.COLOR_BGR2RGB)).convert("RGBA")


def remove_background(image: Image.Image, model_name: str) -> Image.Image:
    session = new_session(model_name)
    result = remove(image, session=session, alpha_matting=False, post_process_mask=True)
    if isinstance(result, Image.Image):
        return result.convert("RGBA")
    if isinstance(result, bytes):
        return Image.open(BytesIO(result)).convert("RGBA")
    raise RuntimeError("Background remover returned an unsupported result")


def mask_metrics(subject: Image.Image) -> tuple[float, float, int, tuple[int, int, int, int] | None, list[str]]:
    alpha = np.asarray(subject.getchannel("A"), dtype=np.uint8)
    foreground = alpha >= 16
    foreground_count = int(foreground.sum())
    total = alpha.size
    ratio = foreground_count / total if total else 0.0
    translucent = ((alpha > 15) & (alpha < 245)).sum()
    translucent_ratio = float(translucent / foreground_count) if foreground_count else 0.0

    binary = foreground.astype(np.uint8)
    component_count, _, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
    major_components = 0
    minimum_component = max(40, int(total * 0.0015))
    for index in range(1, component_count):
        if int(stats[index, cv2.CC_STAT_AREA]) >= minimum_component:
            major_components += 1

    bbox = subject.getchannel("A").getbbox()
    reasons: list[str] = []
    if bbox is None:
        reasons.append("No product foreground was detected")
        return ratio, translucent_ratio, major_components, bbox, reasons

    if ratio < 0.025:
        reasons.append("Detected product occupies less than 2.5% of the source")
    if ratio > 0.93:
        reasons.append("Background separation is uncertain because almost the entire source was retained")

    left, top, right, bottom = bbox
    edge_margin_x = max(2, round(subject.width * 0.004))
    edge_margin_y = max(2, round(subject.height * 0.004))
    touched = sum(
        (
            left <= edge_margin_x,
            top <= edge_margin_y,
            right >= subject.width - edge_margin_x,
            bottom >= subject.height - edge_margin_y,
        )
    )
    if touched >= 3:
        reasons.append("Product mask touches at least three source edges")
    if translucent_ratio > 0.42:
        reasons.append("High transparency or fine lace/fringe requires visual review")
    if major_components > 8:
        reasons.append("Foreground contains many disconnected components")

    return ratio, translucent_ratio, major_components, bbox, reasons


def crop_subject(subject: Image.Image, bbox: tuple[int, int, int, int]) -> Image.Image:
    left, top, right, bottom = bbox
    padding_x = max(8, round((right - left) * 0.035))
    padding_y = max(8, round((bottom - top) * 0.035))
    return subject.crop(
        (
            max(0, left - padding_x),
            max(0, top - padding_y),
            min(subject.width, right + padding_x),
            min(subject.height, bottom + padding_y),
        )
    )


def studio_background(width: int, height: int) -> Image.Image:
    # Build a one-pixel-wide vertical gradient, then expand it. This avoids the
    # several hundred megabytes allocated by full-size NumPy mesh grids.
    strip = Image.new("RGB", (1, height))
    strip.putdata([
        tuple(round(TOP_RGB[channel] + (BOTTOM_RGB[channel] - TOP_RGB[channel]) * (y / max(1, height - 1))) for channel in range(3))
        for y in range(height)
    ])
    background = strip.resize((width, height), Image.Resampling.NEAREST).convert("RGBA")
    strip.close()

    # Render the soft spotlight at quarter resolution and upscale it. The visual
    # result is smooth after blur while peak memory remains bounded.
    preview_width = max(1, width // 4)
    preview_height = max(1, height // 4)
    spotlight = Image.new("RGBA", (preview_width, preview_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(spotlight, "RGBA")
    draw.ellipse(
        (
            round(preview_width * 0.13),
            round(preview_height * 0.04),
            round(preview_width * 0.87),
            round(preview_height * 0.72),
        ),
        fill=(255, 255, 255, 24),
    )
    spotlight = spotlight.filter(ImageFilter.GaussianBlur(radius=max(8, preview_width // 10)))
    expanded = spotlight.resize((width, height), Image.Resampling.BILINEAR)
    background.alpha_composite(expanded)
    spotlight.close()
    expanded.close()
    return background


def composite_subject(subject: Image.Image) -> Image.Image:
    background = studio_background(MASTER_WIDTH, MASTER_HEIGHT)
    max_subject_width = round(MASTER_WIDTH * 0.84)
    max_subject_height = round(MASTER_HEIGHT * 0.82)
    scale = min(max_subject_width / subject.width, max_subject_height / subject.height)
    width = max(1, round(subject.width * scale))
    height = max(1, round(subject.height * scale))
    subject = subject.resize((width, height), Image.Resampling.LANCZOS)

    x = (MASTER_WIDTH - width) // 2
    baseline = round(MASTER_HEIGHT * 0.90)
    y = max(round(MASTER_HEIGHT * 0.055), baseline - height)

    alpha = subject.getchannel("A")
    shadow_mask = Image.new("L", (MASTER_WIDTH, MASTER_HEIGHT), 0)
    shadow_mask.paste(alpha, (x, min(MASTER_HEIGHT - height, y + 34)))
    shadow_mask = shadow_mask.filter(ImageFilter.GaussianBlur(radius=32))
    shadow = Image.new("RGBA", (MASTER_WIDTH, MASTER_HEIGHT), (0, 0, 0, 0))
    shadow.putalpha(shadow_mask.point(lambda value: round(value * 0.28)))
    background.alpha_composite(shadow)
    background.alpha_composite(subject, (x, y))

    draw = ImageDraw.Draw(background, "RGBA")
    floor_y = round(MASTER_HEIGHT * 0.925)
    draw.line((round(MASTER_WIDTH * 0.08), floor_y, round(MASTER_WIDTH * 0.92), floor_y), fill=(255, 255, 255, 18), width=2)
    output = background.convert("RGB")
    alpha.close()
    shadow_mask.close()
    shadow.close()
    subject.close()
    background.close()
    return output


def quality_score(
    source_width: int,
    source_height: int,
    sharpness: float,
    foreground_ratio: float,
    translucent_ratio: float,
    reasons: Iterable[str],
) -> float:
    resolution = min(40.0, max(source_width, source_height) / 2400.0 * 40.0)
    detail = min(25.0, math.sqrt(max(0.0, sharpness)) / math.sqrt(320.0) * 25.0)
    mask = 25.0
    if foreground_ratio < 0.05 or foreground_ratio > 0.88:
        mask -= 8.0
    if translucent_ratio > 0.35:
        mask -= 5.0
    penalty = min(25.0, len(list(reasons)) * 7.0)
    return round(max(0.0, min(100.0, resolution + detail + max(0.0, mask) + 10.0 - penalty)), 2)


def write_webp(image: Image.Image, path: Path, quality: int) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="WEBP", quality=quality, method=4, exact=True)
    return path.stat().st_size


def process(args: argparse.Namespace) -> ProcessManifest:
    source = load_rgb(args.input)
    source_width, source_height = source.size
    sharpness = sharpness_score(source)
    upscaled = False
    reasons: list[str] = []

    working = resize_to_max_edge(source, SEGMENT_MAX_EDGE)
    if max(working.size) <= EDSR_MAX_EDGE:
        try:
            enhanced = upscale_edsr(working, args.edsr_model)
            if enhanced is not working:
                working.close()
            working = enhanced
            upscaled = True
        except Exception as error:  # the original remains available and review blocks publication
            reasons.append(f"AI super-resolution was requested but unavailable: {error}")

    subject = remove_background(working, args.rembg_model)
    if working is not source:
        working.close()
    foreground_ratio, translucent_ratio, major_components, bbox, mask_reasons = mask_metrics(subject)
    reasons.extend(mask_reasons)
    if bbox is None:
        subject.close()
        source.close()
        raise RuntimeError("No product foreground was detected")

    cropped = crop_subject(subject, bbox)
    subject.close()
    master = composite_subject(cropped)
    cropped.close()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    output_bytes: dict[str, int] = {}
    output_bytes["master"] = write_webp(master, args.output_dir / "master.webp", 92)
    for width in RESPONSIVE_WIDTHS:
        height = max(1, round(MASTER_HEIGHT * (width / MASTER_WIDTH)))
        variant = master.resize((width, height), Image.Resampling.LANCZOS)
        output_bytes[str(width)] = write_webp(variant, args.output_dir / f"{width}.webp", WEBP_QUALITY[width])
        variant.close()
    master.close()
    source.close()

    score = quality_score(
        source_width,
        source_height,
        sharpness,
        foreground_ratio,
        translucent_ratio,
        reasons,
    )
    if score < 55:
        reasons.append(f"Automated quality score is low ({score})")

    unique_reasons = list(dict.fromkeys(reason.strip() for reason in reasons if reason.strip()))
    status = "review_required" if unique_reasons else "ready"
    manifest = ProcessManifest(
        status=status,
        backgroundStyle=BACKGROUND_STYLE,
        backgroundHex=BACKGROUND_HEX,
        enhanced=True,
        upscaled=upscaled,
        qualityScore=score,
        reviewReason="; ".join(unique_reasons) if unique_reasons else None,
        sourceWidth=source_width,
        sourceHeight=source_height,
        masterWidth=MASTER_WIDTH,
        masterHeight=MASTER_HEIGHT,
        sourceSharpness=round(sharpness, 2),
        foregroundRatio=round(foreground_ratio, 5),
        translucentRatio=round(translucent_ratio, 5),
        majorComponents=major_components,
        outputBytes=output_bytes,
    )
    (args.output_dir / "manifest.json").write_text(json.dumps(asdict(manifest), indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> int:
    args = parse_args()
    try:
        manifest = process(args)
        print(json.dumps(asdict(manifest), separators=(",", ":")))
        return 0
    except Exception as error:
        print(json.dumps({"status": "failed", "error": str(error)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
