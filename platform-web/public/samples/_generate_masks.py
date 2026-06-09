"""
Generate one segmentation-style composite mask per demo image.

Each object is painted with a flat vivid color + uniform alpha, drawn from
polygon/ellipse primitives — like a Mask R-CNN overlay. A tiny gaussian
blur softens the binary edge so it doesn't look pixelated.

manifest.json:
{
  "<img_id>": {
    "image":  "samples/<img_id>.png",
    "mask":   "samples/masks/<img_id>.png",
    "width":  W, "height": H,
    "focus":  0..1,
    "objects": ["airplane", ...]
  }
}
"""

import json
import os
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = r"C:/Users/wysq/Desktop/unicapeval/unicapeval-platform-web/public/samples"
SOURCES = {
    "flight": r"C:/Users/wysq/Desktop/unicapeval/flight.png",
    "women": r"C:/Users/wysq/Desktop/unicapeval/women.png",
}

# Per-image objects. Each object is a list of "shape primitives":
#   ('ellipse', cx, cy, rx, ry, angle_deg)
#   ('polygon', [(x, y), ...])  -- coords in fractions of (W, H)
SCENES = {
    "flight": {
        # Passenger jet, body roughly horizontal, slight nose-up.
        # Coordinates eyeballed from the source image (541x495).
        "objects": [
            {
                "name": "airplane",
                "color": (233, 30, 99),   # magenta
                "shapes": [
                    # fuselage (long thin ellipse, slight tilt)
                    ("polygon", [
                        (0.18, 0.50), (0.30, 0.47),
                        (0.55, 0.45), (0.78, 0.46),
                        (0.86, 0.50),
                        (0.78, 0.55), (0.55, 0.55),
                        (0.30, 0.55), (0.18, 0.53),
                    ]),
                    # left wing (down-left)
                    ("polygon", [
                        (0.42, 0.51), (0.55, 0.50),
                        (0.45, 0.74), (0.30, 0.78),
                    ]),
                    # right wing (down-right, smaller / further)
                    ("polygon", [
                        (0.55, 0.50), (0.66, 0.51),
                        (0.74, 0.66), (0.62, 0.66),
                    ]),
                    # tail fin (upper-back)
                    ("polygon", [
                        (0.78, 0.46), (0.84, 0.34),
                        (0.88, 0.36), (0.84, 0.47),
                    ]),
                    # horizontal stabilizer (small back-fin)
                    ("polygon", [
                        (0.83, 0.48), (0.91, 0.46),
                        (0.92, 0.51), (0.85, 0.52),
                    ]),
                ],
            },
        ],
        "focus": 0.86,
    },
    "women": {
        # Mona Lisa: head/hair, face, torso, hands.
        # Multiple labels so the overlay shows multi-object segmentation.
        "objects": [
            {
                "name": "hair",
                "color": (101, 67, 33),   # dark brown
                "shapes": [
                    ("ellipse", 0.50, 0.18, 0.20, 0.13, 0),
                    # side strands flowing down
                    ("polygon", [
                        (0.30, 0.20), (0.36, 0.18),
                        (0.34, 0.55), (0.26, 0.55),
                    ]),
                    ("polygon", [
                        (0.64, 0.18), (0.70, 0.20),
                        (0.74, 0.55), (0.66, 0.55),
                    ]),
                ],
            },
            {
                "name": "face",
                "color": (255, 193, 156),  # warm skin tone
                "shapes": [
                    ("ellipse", 0.50, 0.32, 0.13, 0.13, 0),
                    # neck
                    ("polygon", [
                        (0.43, 0.43), (0.57, 0.43),
                        (0.59, 0.55), (0.41, 0.55),
                    ]),
                ],
            },
            {
                "name": "body",
                "color": (38, 166, 154),   # teal
                "shapes": [
                    ("polygon", [
                        (0.20, 0.55), (0.36, 0.50),
                        (0.50, 0.49), (0.66, 0.50),
                        (0.82, 0.55),
                        (0.92, 1.00), (0.08, 1.00),
                    ]),
                ],
            },
            {
                "name": "hand",
                "color": (255, 152, 75),   # warm orange (distinct from face)
                "shapes": [
                    ("ellipse", 0.50, 0.92, 0.13, 0.06, 0),
                ],
            },
        ],
        "focus": 0.91,
    },
}

ALPHA_PEAK = 175           # 0..255 — overlay opacity
EDGE_BLUR_RADIUS = 1.5     # tiny softening so edges don't look jagged


def _draw_object_alpha(W, H, shapes):
    """Paint all shape primitives of one object onto a single L-mode image."""
    a = Image.new("L", (W, H), 0)
    drw = ImageDraw.Draw(a)
    for s in shapes:
        kind = s[0]
        if kind == "ellipse":
            _, cx, cy, rx, ry, _angle = s
            x0, y0 = (cx - rx) * W, (cy - ry) * H
            x1, y1 = (cx + rx) * W, (cy + ry) * H
            drw.ellipse([x0, y0, x1, y1], fill=255)
        elif kind == "polygon":
            _, pts = s
            poly = [(x * W, y * H) for (x, y) in pts]
            drw.polygon(poly, fill=255)
    if EDGE_BLUR_RADIUS > 0:
        a = a.filter(ImageFilter.GaussianBlur(EDGE_BLUR_RADIUS))
    return np.asarray(a, dtype=np.float32) / 255.0  # (H, W) in [0, 1]


def render_mask(W, H, objects):
    """Composite all objects' flat-color overlays into one RGBA mask."""
    rgba = np.zeros((H, W, 4), dtype=np.float32)
    peak = ALPHA_PEAK / 255.0
    for obj in objects:
        a = _draw_object_alpha(W, H, obj["shapes"]) * peak  # (H, W)
        r, g, b = obj["color"]
        src_a = a[..., None]
        src_rgb = np.stack([
            np.full_like(a, r / 255.0),
            np.full_like(a, g / 255.0),
            np.full_like(a, b / 255.0),
        ], axis=-1)
        dst_rgb = rgba[..., :3]
        dst_a = rgba[..., 3:4]
        out_a = src_a + dst_a * (1 - src_a)
        safe_out_a = np.where(out_a > 0, out_a, 1.0)
        out_rgb = (src_rgb * src_a + dst_rgb * dst_a * (1 - src_a)) / safe_out_a
        rgba[..., :3] = out_rgb
        rgba[..., 3:4] = out_a
    rgba = np.clip(rgba * 255, 0, 255).astype(np.uint8)
    return Image.fromarray(rgba, mode="RGBA")


def main():
    out_dir = os.path.join(ROOT, "masks")
    os.makedirs(out_dir, exist_ok=True)
    manifest = {}
    for img_id, src in SOURCES.items():
        im = Image.open(src).convert("RGBA")
        W, H = im.size
        scene = SCENES[img_id]
        mask = render_mask(W, H, scene["objects"])
        mask.save(os.path.join(out_dir, f"{img_id}.png"))
        manifest[img_id] = {
            "image": f"samples/{img_id}.png",
            "mask": f"samples/masks/{img_id}.png",
            "width": W, "height": H,
            "focus": scene["focus"],
            "objects": [o["name"] for o in scene["objects"]],
        }
    with open(os.path.join(ROOT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print("Wrote manifest")
    for img_id, m in manifest.items():
        print(f"  {img_id}: {m['width']}x{m['height']} focus={m['focus']} "
              f"objects={m['objects']}")


if __name__ == "__main__":
    main()
