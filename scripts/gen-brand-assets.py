#!/usr/bin/env python3
"""One-off: regenerate favicon / OG / social-share assets from the brand logo.

Run: python3 scripts/gen-brand-assets.py
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "public")
LOGO = os.path.join(PUB, "wholesalequeen-logo.png")
CREAM = (250, 246, 239, 255)  # #FAF6EF — matches existing PWA icons


def tight_logo():
    im = Image.open(LOGO).convert("RGBA")
    bbox = im.getbbox()  # trim transparent margins
    return im.crop(bbox) if bbox else im


def fit(logo, box_w, box_h):
    """Scale logo to fit within box, preserving aspect."""
    lw, lh = logo.size
    scale = min(box_w / lw, box_h / lh)
    return logo.resize((max(1, round(lw * scale)), max(1, round(lh * scale))), Image.LANCZOS)


def compose(canvas_w, canvas_h, pad_ratio, bg=CREAM):
    """Cream canvas with the logo centered, leaving pad_ratio margin."""
    logo = tight_logo()
    box_w = round(canvas_w * (1 - pad_ratio))
    box_h = round(canvas_h * (1 - pad_ratio))
    scaled = fit(logo, box_w, box_h)
    canvas = Image.new("RGBA", (canvas_w, canvas_h), bg)
    x = (canvas_w - scaled.width) // 2
    y = (canvas_h - scaled.height) // 2
    canvas.alpha_composite(scaled, (x, y))
    return canvas


def save_png(img, path, optimize=True):
    img.convert("RGBA").save(path, "PNG", optimize=optimize)
    print(f"  {os.path.relpath(path, ROOT)}  ({os.path.getsize(path)//1024} KB, {img.size[0]}x{img.size[1]})")


def save_jpeg_like_png(img, path):
    # OG/social: flatten onto cream (no alpha) and optimize hard.
    flat = Image.new("RGB", img.size, CREAM[:3])
    flat.paste(img, mask=img.split()[3])
    flat.save(path, "PNG", optimize=True)
    print(f"  {os.path.relpath(path, ROOT)}  ({os.path.getsize(path)//1024} KB, {img.size[0]}x{img.size[1]})")


print("Favicons:")
master = compose(512, 512, 0.16)
save_png(master, os.path.join(PUB, "favicon.png"))
# Multi-resolution .ico
ico_src = compose(256, 256, 0.16).convert("RGBA")
ico_src.save(
    os.path.join(PUB, "favicon.ico"),
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)
print(f"  public/favicon.ico  ({os.path.getsize(os.path.join(PUB,'favicon.ico'))//1024} KB)")

print("Apple touch icon:")
save_png(compose(180, 180, 0.14), os.path.join(PUB, "apple-touch-icon.png"))

print("OG + social share (1200x630):")
og = compose(1200, 630, 0.30)
save_jpeg_like_png(og, os.path.join(PUB, "og-image.png"))
save_jpeg_like_png(og, os.path.join(PUB, "twitter-image.png"))

print("Done.")
