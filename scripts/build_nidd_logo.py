"""Build transparent public/logo.png from the flat navy plate source.

Removes pixels connected to the image border that match the site base color
(~#06050e), then crops to the shield. Re-run after replacing assets/logo-source.png.

Also writes public/logo-light.png: semi-transparent edge pixels are composited onto
the light theme page background (#f4f6fb) so dark halos are not visible in light UI.

Usage (from repo root):
  python scripts/build_nidd_logo.py

If assets/logo-source.png is missing but nidd-frontend/public/logo.png exists,
only logo-light.png is regenerated from that PNG.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "logo-source.png"
OUT = ROOT / "nidd-frontend" / "public" / "logo.png"
OUT_LIGHT = ROOT / "nidd-frontend" / "public" / "logo-light.png"
SITE_BG = np.array([6.0, 5.0, 14.0], dtype=np.float32)
# Must match globals.css html[data-theme="light"] --bg-base
LIGHT_UI_BG = np.array([244.0, 246.0, 251.0], dtype=np.float32)


def build_logo_light_variant(a: np.ndarray) -> np.ndarray:
    """Composite problematic edge pixels onto light UI bg; yields opaque edge colors."""
    out = np.clip(a.astype(np.float32), 0, 255)
    rgb = out[:, :, :3]
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    al = out[:, :, 3]
    t = np.clip(al / 255.0, 0.0, 1.0)
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    chroma = np.max(rgb, axis=2) - np.min(rgb, axis=2)
    comp_r = r * t + LIGHT_UI_BG[0] * (1.0 - t)
    comp_g = g * t + LIGHT_UI_BG[1] * (1.0 - t)
    comp_b = b * t + LIGHT_UI_BG[2] * (1.0 - t)
    # Semi-transparent dark / gray matte (wrong for bright backgrounds)
    fringe = (al > 14.0) & (al < 138.0) & (lum < 76.0) & (chroma < 56.0)
    out[fringe, 0] = comp_r[fringe]
    out[fringe, 1] = comp_g[fringe]
    out[fringe, 2] = comp_b[fringe]
    out[fringe, 3] = 255.0
    return out


def process_from_source() -> np.ndarray:
    a = np.array(Image.open(SRC).convert("RGBA"), dtype=np.float32)
    h, w = a.shape[:2]
    rgb = a[:, :, :3]
    dist = np.linalg.norm(rgb - SITE_BG, axis=2)
    bg = dist < 48.0
    struct = np.ones((3, 3), dtype=bool)
    lab, _n = ndimage.label(bg, structure=struct)
    border = np.zeros_like(lab, dtype=bool)
    border[0, :] = border[-1, :] = border[:, 0] = border[:, -1] = True
    touch = np.unique(lab[border & (lab > 0)])
    kill = np.isin(lab, touch)
    a[kill, 3] = 0

    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    chroma = np.max(rgb, axis=2) - np.min(rgb, axis=2)
    a[:, :, 3] = np.where((a[:, :, 3] < 110) & (lum > 210) & (chroma < 55), 0, a[:, :, 3])
    a[:, :, 3] = np.where((a[:, :, 3] < 200) & (lum > 252), 0, a[:, :, 3])

    al = a[:, :, 3] > 14
    ys, xs = np.where(al)
    if ys.size:
        y0, y1 = ys.min(), ys.max()
        x0, x1 = xs.min(), xs.max()
        pad = 2
        y0 = max(0, y0 - pad)
        x0 = max(0, x0 - pad)
        y1 = min(h - 1, y1 + pad)
        x1 = min(w - 1, x1 + pad)
        a = a[y0 : y1 + 1, x0 : x1 + 1]

    return a


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)

    if SRC.is_file():
        a = process_from_source()
        Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA").save(
            OUT, optimize=True
        )
        print(f"Wrote {OUT} size={OUT.stat().st_size} bytes shape={a.shape}")
    elif OUT.is_file():
        a = np.array(Image.open(OUT).convert("RGBA"), dtype=np.float32)
        print(f"Using existing {OUT} to build light variant only.")
    else:
        raise SystemExit(f"Need either {SRC} or {OUT}")

    a_light = build_logo_light_variant(a.copy())
    Image.fromarray(np.clip(a_light, 0, 255).astype(np.uint8), "RGBA").save(
        OUT_LIGHT, optimize=True
    )
    print(f"Wrote {OUT_LIGHT} size={OUT_LIGHT.stat().st_size} bytes shape={a_light.shape}")


if __name__ == "__main__":
    main()
