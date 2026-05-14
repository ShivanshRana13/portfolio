#!/usr/bin/env python3
"""Regenerate detail-page gizmo raster assets from the 1× PNG (Figma export).

Requires: pip install --user Pillow

Outputs:
  assets/detail/gizmo-content-70-637@4x.webp — 4× (3356×3296), WebP q=92 for laptop / HiDPI.

Run from repo root: python3 scripts/export-detail-gizmo.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "detail" / "gizmo-content-70-637.png"
OUT_WEBP = ROOT / "assets" / "detail" / "gizmo-content-70-637@4x.webp"


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"Missing source image: {SRC}")
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    w4, h4 = w * 4, h * 4
    up = im.resize((w4, h4), Image.Resampling.LANCZOS)
    OUT_WEBP.parent.mkdir(parents=True, exist_ok=True)
    up.save(
        OUT_WEBP,
        format="WEBP",
        quality=92,
        method=6,
        lossless=False,
    )
    print("Wrote", OUT_WEBP, f"({OUT_WEBP.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
