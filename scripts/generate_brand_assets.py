"""Generates every Cornerman icon/store asset from one geometric mark.

The mark is the main screen's countdown ring, opened at 3 o'clock so it
also reads as a C. Run from the repo root:

    python scripts/generate_brand_assets.py

Requires Pillow. Change the constants below and re-run to retune.
"""

from math import cos, radians, sin
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

STROKE_RATIO = 0.16  # stroke width as a fraction of the ring's outer diameter
GAP_DEG = 32  # half-angle of the opening, measured at the stroke's centreline
GROUND = (0x12, 0x12, 0x12)  # the app's Dark theme background
INK = (0xF2, 0xF2, 0xF2)  # the app's Dark theme text colour
SUPERSAMPLE = 4

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
INTER_SEMIBOLD = ROOT / "node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf"


def draw_mark(draw: ImageDraw.ImageDraw, cx: float, cy: float, outer: float, color) -> None:
    stroke = outer * STROKE_RATIO
    half = outer / 2
    # PIL measures angles clockwise from 3 o'clock, so this arc runs
    # through the bottom, left and top, leaving the right side open.
    draw.arc((cx - half, cy - half, cx + half, cy + half), GAP_DEG, 360 - GAP_DEG, fill=color, width=round(stroke))
    centreline = half - stroke / 2
    cap = stroke / 2
    for angle in (GAP_DEG, -GAP_DEG):
        x = cx + centreline * cos(radians(angle))
        y = cy + centreline * sin(radians(angle))
        draw.ellipse((x - cap, y - cap, x + cap, y + cap), fill=color)


def render(size, background, mark_fraction, color=INK, mode="RGBA", center=None) -> Image.Image:
    w, h = size
    big = Image.new("RGBA", (w * SUPERSAMPLE, h * SUPERSAMPLE), background if background else (0, 0, 0, 0))
    cx, cy = center if center else (w / 2, h / 2)
    draw_mark(ImageDraw.Draw(big), cx * SUPERSAMPLE, cy * SUPERSAMPLE, min(w, h) * mark_fraction * SUPERSAMPLE, color)
    return big.resize((w, h), Image.LANCZOS).convert(mode)


def feature_graphic() -> Image.Image:
    w, h = 1024, 500
    big = Image.new("RGB", (w * SUPERSAMPLE, h * SUPERSAMPLE), GROUND)
    draw = ImageDraw.Draw(big)
    font = ImageFont.truetype(str(INTER_SEMIBOLD), 64 * SUPERSAMPLE)
    word = "CORNERMAN"
    tracking = 0.14 * 64 * SUPERSAMPLE
    widths = [draw.textlength(ch, font=font) for ch in word]
    text_w = sum(widths) + tracking * (len(word) - 1)
    mark_d = 200 * SUPERSAMPLE
    gap = 56 * SUPERSAMPLE
    left = (w * SUPERSAMPLE - (mark_d + gap + text_w)) / 2
    cy = h * SUPERSAMPLE / 2
    draw_mark(draw, left + mark_d / 2, cy, mark_d, INK)
    x = left + mark_d + gap
    for ch, cw in zip(word, widths):
        draw.text((x, cy), ch, font=font, fill=INK, anchor="lm")
        x += cw + tracking
    return big.resize((w, h), Image.LANCZOS)


def mark_svg(color: str) -> str:
    outer = 1000
    stroke = outer * STROKE_RATIO
    r = (outer - stroke) / 2
    c = 512
    g = radians(GAP_DEG)
    x = c + r * cos(g)
    y1, y2 = c - r * sin(g), c + r * sin(g)
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">'
        f'<path d="M {x:.2f} {y1:.2f} A {r:.2f} {r:.2f} 0 1 0 {x:.2f} {y2:.2f}" '
        f'fill="none" stroke="{color}" stroke-width="{stroke:.2f}" stroke-linecap="round"/></svg>\n'
    )


def main() -> None:
    (ASSETS / "store").mkdir(exist_ok=True)
    (ASSETS / "brand").mkdir(exist_ok=True)

    # Full-square icons (app.json "icon", later the iOS App Store icon): opaque.
    render((1024, 1024), GROUND, 0.58, mode="RGB").save(ASSETS / "icon.png")
    # Android adaptive icon. The launcher crops to the centre 72/108 of the
    # canvas and only guarantees a 66/108 circle, so the mark stays well
    # inside that (36% of the canvas = about half the visible icon).
    render((1024, 1024), None, 0.36).save(ASSETS / "android-icon-foreground.png")
    Image.new("RGB", (1024, 1024), GROUND).save(ASSETS / "android-icon-background.png")
    # Android 13+ themed icons tint this silhouette; only its alpha matters.
    render((1024, 1024), None, 0.36).save(ASSETS / "android-icon-monochrome.png")
    render((48, 48), GROUND, 0.62).save(ASSETS / "favicon.png")

    # Play Console uploads, not bundled into the app.
    render((512, 512), GROUND, 0.58).save(ASSETS / "store" / "play-icon-512.png")
    feature_graphic().save(ASSETS / "store" / "feature-graphic-1024x500.png")

    (ASSETS / "brand" / "cornerman-mark-light.svg").write_text(mark_svg("#F2F2F2"))
    (ASSETS / "brand" / "cornerman-mark-dark.svg").write_text(mark_svg("#121212"))


if __name__ == "__main__":
    main()
