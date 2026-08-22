#!/usr/bin/env python3
"""Regenerate about page image 2 from a native Figma 4× export (-src.png).

Requires: pip install --user Pillow

Place native 4× Figma exports in assets/about/ as {base}-src.png, then run:
  python3 scripts/export-about-images.py

Writes 1× and @4× PNG + WebP at design dimensions.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "assets" / "about"
WEBP_Q = 98
WEBP_METHOD = 6

# (src filename, output base, 1× width, 1× height)
ASSETS = (
    ("image-2-src.png", "image-2", 839, 839),
    ("image-3-src.png", "image-3", 839, 481),
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
