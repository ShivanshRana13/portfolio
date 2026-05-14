#!/usr/bin/env python3
"""Regenerate detail-page gizmo rasters from the 1× PNG (Figma export).

Requires: pip install --user Pillow

Writes:
  gizmo-content-70-637@2x.png   — 2× lossless PNG (Lanczos)
  gizmo-content-70-637@2x.webp  — 2× WebP quality 98
  gizmo-content-70-637@1x.webp  — 1× WebP quality 98

Run from repo root: python3 scripts/export-detail-gizmo.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "assets" / "detail"
SRC = DIR / "gizmo-content-70-637.png"
WEBP_Q = 98
WEBP_METHOD = 6


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"Missing source image: {SRC}")
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    w2, h2 = w * 2, h * 2
    two = im.resize((w2, h2), Image.Resampling.LANCZOS)

    DIR.mkdir(parents=True, exist_ok=True)

    out_png = DIR / "gizmo-content-70-637@2x.png"
    two.save(out_png, format="PNG", compress_level=9, optimize=True)

    out_2w = DIR / "gizmo-content-70-637@2x.webp"
    two.save(
        out_2w,
        format="WEBP",
        quality=WEBP_Q,
        method=WEBP_METHOD,
        lossless=False,
    )

    out_1w = DIR / "gizmo-content-70-637@1x.webp"
    im.save(
        out_1w,
        format="WEBP",
        quality=WEBP_Q,
        method=WEBP_METHOD,
        lossless=False,
    )

    for p in (out_png, out_2w, out_1w):
        print("Wrote", p.name, p.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
