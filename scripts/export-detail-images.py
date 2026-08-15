#!/usr/bin/env python3
"""Regenerate detail-page rasters from native Figma 4× exports (-src.png).

Requires: pip install --user Pillow

Place native 4× Figma exports in assets/detail/ as {base}-src.png, then run:
  python3 scripts/export-detail-images.py

Writes 1× and @4× PNG + WebP at design dimensions.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "assets" / "detail"
WEBP_Q = 98
WEBP_METHOD = 6

# (src filename, output base, 1× width, 1× height)
ASSETS = (
    ("problem-grid-178-src.png", "problem-grid-178", 361, 314),
    ("problem-deform-294-src.png", "problem-deform-294", 430, 315),
    ("problem-gizmos-291-src.png", "problem-gizmos-291", 807, 431),
    ("discovery-839-src.png", "discovery-839", 839, 882),
    ("principles-839-src.png", "principles-839", 839, 737),
    ("exploration-839-src.png", "exploration-839", 839, 945),
    ("design-839-src.png", "design-839", 839, 408),
    ("design-dark-839-src.png", "design-dark-839", 839, 408),
    ("design-chromatic-839-src.png", "design-chromatic-839", 839, 408),
    ("mini-gizmo-839-src.png", "mini-gizmo-839", 839, 762),
    ("mini-gizmo-2-839-src.png", "mini-gizmo-2-839", 839, 849),
    ("mini-gizmo-3-839-src.png", "mini-gizmo-3-839", 839, 540),
    ("precision-gizmo-839-src.png", "precision-gizmo-839", 839, 2805),
    ("precision-scale-839-src.png", "precision-scale-839", 839, 3155),
)


def fit_cover_crop(im: Image.Image, target_w: int, target_h: int) -> Image.Image:
    src_w, src_h = im.size
    scale = max(target_w / src_w, target_h / src_h)
    resized_w = round(src_w * scale)
    resized_h = round(src_h * scale)
    resized = im.resize((resized_w, resized_h), Image.Resampling.LANCZOS)
    left = (resized_w - target_w) // 2
    top = (resized_h - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def save_webp(im: Image.Image, path: Path) -> None:
    im.save(path, format="WEBP", quality=WEBP_Q, method=WEBP_METHOD, lossless=False)


def export_set(src_name: str, base: str, width: int, height: int) -> None:
    src_path = DIR / src_name
    if not src_path.is_file():
        raise SystemExit(f"Missing source image: {src_path}")

    master = Image.open(src_path).convert("RGBA")
    four_w, four_h = width * 4, height * 4
    four = fit_cover_crop(master, four_w, four_h)
    one = four.resize((width, height), Image.Resampling.LANCZOS)

    one.save(DIR / f"{base}.png", format="PNG", compress_level=9, optimize=True)
    four.save(DIR / f"{base}@4x.png", format="PNG", compress_level=9, optimize=True)
    save_webp(one, DIR / f"{base}.webp")
    save_webp(four, DIR / f"{base}@4x.webp")

    for path in (
        DIR / f"{base}.png",
        DIR / f"{base}@4x.png",
        DIR / f"{base}.webp",
        DIR / f"{base}@4x.webp",
    ):
        print(f"Wrote {path.name} ({path.stat().st_size:,} bytes)")


def main() -> None:
    DIR.mkdir(parents=True, exist_ok=True)
    for src_name, base, width, height in ASSETS:
        export_set(src_name, base, width, height)


if __name__ == "__main__":
    main()
