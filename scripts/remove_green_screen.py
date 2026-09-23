#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
remove_green_screen.py

Reads the raw Nano Banana renders from assets/img/hero/raw/ (each shot on a
solid pure chroma-key green background, #00FF00), removes the green
background, and writes clean transparent PNGs into assets/img/hero/ using
the final filenames the website's HTML expects.

The one exception is `hero-base-scene`, which is a normal finished
background photo (no green screen) -- it is only resized/re-compressed, not
keyed.

Usage:
    python scripts/remove_green_screen.py

Re-run any time new/updated raw files are dropped into assets/img/hero/raw/.
Safe to re-run repeatedly -- it always re-reads the raw source and
overwrites the matching output file.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

# Windows' console defaults to a legacy codepage that can't print Arabic
# path characters (this project's folder name is Arabic) -- force UTF-8
# stdout so the summary printout never crashes on non-ASCII paths.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except AttributeError:
    pass

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = PROJECT_ROOT / "assets" / "img" / "hero" / "raw"
OUT_DIR = PROJECT_ROOT / "assets" / "img" / "hero"

# ---------------------------------------------------------------------------
# Which raw file maps to which final output file, and how to process it.
#   "key"  -> chroma-key the green background out, save as transparent PNG
#   "copy" -> no green screen involved, just resize + re-encode
# ---------------------------------------------------------------------------
ASSET_MAP = {
    "dough-ball.jpeg":      {"out": "dough-ball.webp",     "mode": "key"},
    "dough-flat.jpeg":      {"out": "dough-flat.webp",     "mode": "key"},
    "sauce.jpeg":           {"out": "sauce-layer.webp",    "mode": "key"},
    "cheese.jpeg":          {"out": "cheese-layer.webp",   "mode": "key"},
    "salami.jpeg":          {"out": "salami-layer.webp",   "mode": "key"},
    "olives.jpeg":          {"out": "olives-layer.webp",   "mode": "key"},
    "oven-glow.jpeg":       {"out": "oven-glow.webp",      "mode": "key"},
    "pizza-baked.jpeg":     {"out": "pizza-baked.webp",    "mode": "key"},
    "hero-base-scene.jpeg": {"out": "hero-base-scene.jpg", "mode": "copy"},
}

# Chroma-key sensitivity. A pixel is considered "background green" once
# (G - max(R, B)) crosses LOW, and fully background once it crosses HIGH.
# Values between LOW and HIGH get a smooth, feathered alpha in between.
# LOW was lowered from 15 -> 4: the first pass left a visible green fringe
# on several cutouts (olives/salami/dough-ball especially) because pixels
# with only a mild green cast were still being kept fully opaque.
LOW_THRESHOLD = 4
HIGH_THRESHOLD = 55

# How much to pull green spill out of semi-transparent edge pixels
# (0 = no correction, 1 = fully desaturate the green tint on edges).
# Raised from 0.6 -> 1.0 (full desaturation) for the same reason.
SPILL_SUPPRESSION = 1.0

# Cap the longest side of exported cutout layers to keep file sizes
# reasonable for mobile, without visibly softening the detail. 1000px is
# still crisp for a disc rendered at roughly 400-500 CSS px on a retina
# phone screen.
MAX_LAYER_DIM = 1000

# WebP quality for the cutout layers (0-100). 82 keeps texture detail
# (flour, cheese melt, char) while cutting file size drastically vs PNG.
LAYER_WEBP_QUALITY = 82

# Cap the base scene's longest side (it is a portrait 9:16 shot).
MAX_BASE_SCENE_HEIGHT = 1920


def chroma_key(img: Image.Image) -> Image.Image:
    """Remove a solid green-screen background from `img`, returning RGBA."""
    rgb = img.convert("RGB")
    arr = np.asarray(rgb).astype(np.float32)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    max_rb = np.maximum(r, b)
    diff = g - max_rb  # how much greener than red/blue this pixel is

    # Feathered alpha: opaque below LOW, transparent above HIGH, linear ramp between.
    alpha = (HIGH_THRESHOLD - diff) / (HIGH_THRESHOLD - LOW_THRESHOLD)
    alpha = np.clip(alpha, 0.0, 1.0)
    alpha = np.where(diff <= LOW_THRESHOLD, 1.0, alpha)
    alpha = np.where(diff >= HIGH_THRESHOLD, 0.0, alpha)

    # Green-spill suppression on the remaining semi-transparent edge pixels:
    # pull their green channel back toward max(R, B) proportionally, so no
    # green halo survives around the cutout's silhouette.
    spill_amount = np.clip(diff / HIGH_THRESHOLD, 0.0, 1.0) * SPILL_SUPPRESSION
    g_corrected = g - spill_amount * (g - max_rb)
    g_final = np.where(diff > 0, g_corrected, g)

    rgba = np.dstack([r, g_final, b, alpha * 255.0])
    rgba = np.clip(rgba, 0, 255).astype(np.uint8)
    out = Image.fromarray(rgba, mode="RGBA")

    # Slightly shrink the alpha mask (kills stray green fringe pixels) then
    # blur it a touch so the cutout edge isn't jagged.
    alpha_channel = out.getchannel("A").filter(ImageFilter.MinFilter(5))
    alpha_channel = alpha_channel.filter(ImageFilter.GaussianBlur(0.8))
    out.putalpha(alpha_channel)
    return out


def resize_to_max(img: Image.Image, max_dim: int, by: str = "longest") -> Image.Image:
    w, h = img.size
    current = max(w, h) if by == "longest" else h
    if current <= max_dim:
        return img
    scale = max_dim / float(current)
    new_size = (max(1, round(w * scale)), max(1, round(h * scale)))
    return img.resize(new_size, Image.LANCZOS)


def process_key(src: Path, dst: Path) -> None:
    img = Image.open(src)
    cutout = chroma_key(img)
    cutout = resize_to_max(cutout, MAX_LAYER_DIM, by="longest")
    dst.parent.mkdir(parents=True, exist_ok=True)
    cutout.save(dst, format="WEBP", quality=LAYER_WEBP_QUALITY, method=6)


# The base scene render has a near-black band behind the headline area
# (~16-29% of the height) that ends in a hard horizontal edge against the
# stone below it. Darken the stone just under the band with a smooth ramp so
# the band fades into the stone instead of cutting off.
BAND_FEATHER_START = 0.285  # fraction of height where the black band ends
BAND_FEATHER_END = 0.43     # fraction of height where the photo is untouched
BAND_FEATHER_MIN = 0.22     # brightness multiplier right at the band edge


def feather_band(img: Image.Image) -> Image.Image:
    arr = np.asarray(img).astype(np.float32)
    h = arr.shape[0]
    y0, y1 = int(h * BAND_FEATHER_START), int(h * BAND_FEATHER_END)
    t = np.linspace(0.0, 1.0, y1 - y0)
    ramp = t * t * (3 - 2 * t)  # smoothstep
    factor = BAND_FEATHER_MIN + (1.0 - BAND_FEATHER_MIN) * ramp
    arr[y0:y1] *= factor[:, None, None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), mode="RGB")


def process_copy(src: Path, dst: Path) -> None:
    img = Image.open(src).convert("RGB")
    img = resize_to_max(img, MAX_BASE_SCENE_HEIGHT, by="height")
    img = feather_band(img)
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, format="JPEG", quality=85, optimize=True)
    # WebP twin served first via <picture> (JPG stays as the fallback)
    img.save(dst.with_suffix(".webp"), format="WEBP", quality=80, method=6)


def main() -> None:
    if not RAW_DIR.exists():
        print(f"Raw folder not found: {RAW_DIR}")
        return

    raw_files = {p.name for p in RAW_DIR.iterdir() if p.is_file()}
    processed, missing, unmapped = [], [], []

    for raw_name, spec in ASSET_MAP.items():
        src = RAW_DIR / raw_name
        dst = OUT_DIR / spec["out"]
        if not src.exists():
            missing.append(raw_name)
            continue
        if spec["mode"] == "key":
            process_key(src, dst)
        else:
            process_copy(src, dst)
        size_kb = dst.stat().st_size / 1024
        with Image.open(dst) as out_im:
            dims = out_im.size
        processed.append((raw_name, spec["out"], dims, size_kb))

    unmapped = sorted(raw_files - set(ASSET_MAP.keys()))

    print("=" * 60)
    print(f"Processed {len(processed)}/{len(ASSET_MAP)} assets:")
    for raw_name, out_name, dims, size_kb in processed:
        print(f"  [OK] {raw_name:<24} -> {out_name:<20} {dims[0]}x{dims[1]}  {size_kb:6.0f} KB")

    if missing:
        print("\nMissing raw files (skipped):")
        for name in missing:
            print(f"  [--] {name}")

    if unmapped:
        print("\nFiles in raw/ not recognized by ASSET_MAP (ignored):")
        for name in unmapped:
            print(f"  [??] {name}")

    print("=" * 60)
    print(f"Output folder: {OUT_DIR}")


if __name__ == "__main__":
    main()
