#!/usr/bin/env python3
"""Regenerate detail-page problem-section rasters (Figma node 249:6094).

Requires: pip install --user Pillow

Place Figma exports in assets/detail/ as:
  problem-grid-178-src.png
  problem-deform-294-src.png
  problem-gizmos-291-src.png

Writes 1×/2× PNG + WebP for each at design dimensions (361×314, 430×315, 807×431).

Run from repo root: python3 scripts/export-detail-problem.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "assets" / "detail"
WEBP_Q = 98
WEBP_METHOD = 6

ASSETS = (
    ("problem-grid-178-src.png", "problem-grid-178", 361, 314),
    ("problem-deform-294-src.png", "problem-deform-294", 430, 315),
    ("problem-gizmos-291-src.png", "problem-gizmos-291", 807, 431),
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


def export_set(src_name: str, base: str, width: int, height: int) -> None:
    src = DIR / src_name
    if not src.is_file():
        raise SystemExit(f"Missing source image: {src}")

    one = fit_cover_crop(Image.open(src).convert("RGBA"), width, height)
    two = one.resize((width * 2, height * 2), Image.Resampling.LANCZOS)

    one.save(DIR / f"{base}.png", format="PNG", compress_level=9, optimize=True)
    two.save(DIR / f"{base}@2x.png", format="PNG", compress_level=9, optimize=True)
    one.save(DIR / f"{base}.webp", format="WEBP", quality=WEBP_Q, method=WEBP_METHOD, lossless=False)
    two.save(
        DIR / f"{base}@2x.webp",
        format="WEBP",
        quality=WEBP_Q,
        method=WEBP_METHOD,
        lossless=False,
    )

    for path in (
        DIR / f"{base}.png",
        DIR / f"{base}@2x.png",
        DIR / f"{base}.webp",
        DIR / f"{base}@2x.webp",
    ):
        print("Wrote", path.name, path.stat().st_size, "bytes")


def main() -> None:
    DIR.mkdir(parents=True, exist_ok=True)
    for src_name, base, width, height in ASSETS:
        export_set(src_name, base, width, height)


if __name__ == "__main__":
    main()
