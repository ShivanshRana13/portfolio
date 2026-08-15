#!/usr/bin/env python3
"""Regenerate detail-page problem-section rasters (Figma node 249:6094).

Deprecated: use scripts/export-detail-images.py for all detail rasters.

Requires native 4× Figma exports as *-src.png in assets/detail/.
Run from repo root: python3 scripts/export-detail-images.py
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    script = ROOT / "scripts" / "export-detail-images.py"
    raise SystemExit(subprocess.call([sys.executable, str(script)]))


if __name__ == "__main__":
    main()
