from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ICONS_DIR = ROOT / "icons"
STORE_DIR = ROOT / "store-assets"


def rounded_rect(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_extension_mark(size):
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    scale = size / 128
    card = (
        int(20 * scale),
        int(31 * scale),
        int(108 * scale),
        int(91 * scale),
    )
    rounded_rect(
        draw,
        card,
        int(18 * scale),
        fill=(24, 24, 24, 255),
        outline=(48, 48, 48, 255),
        width=max(1, int(3 * scale)),
    )

    line_height = max(1, int(5 * scale))
    draw.rounded_rectangle(
        (int(37 * scale), int(47 * scale), int(91 * scale), int(47 * scale) + line_height),
        radius=line_height,
        fill=(82, 82, 82, 255),
    )
    draw.rounded_rectangle(
        (int(37 * scale), int(74 * scale), int(74 * scale), int(74 * scale) + line_height),
        radius=line_height,
        fill=(82, 82, 82, 255),
    )

    play = [
        (int(55 * scale), int(42 * scale)),
        (int(55 * scale), int(81 * scale)),
        (int(86 * scale), int(61.5 * scale)),
    ]
    draw.polygon(play, fill=(255, 255, 255, 255))

    return image


def draw_promo():
    image = Image.new("RGB", (440, 280), (245, 245, 245))
    draw = ImageDraw.Draw(image)

    rounded_rect(draw, (54, 64, 386, 216), 28, fill=(255, 255, 255), outline=(222, 222, 222), width=2)
    rounded_rect(draw, (84, 102, 270, 136), 8, fill=(230, 230, 230))
    rounded_rect(draw, (84, 150, 330, 170), 8, fill=(238, 238, 238))
    rounded_rect(draw, (84, 180, 238, 198), 8, fill=(238, 238, 238))

    card = (295, 112, 365, 158)
    rounded_rect(draw, card, 12, fill=(25, 25, 25), outline=(47, 47, 47), width=2)
    draw.rounded_rectangle((309, 124, 351, 127), radius=2, fill=(82, 82, 82))
    draw.rounded_rectangle((309, 144, 337, 147), radius=2, fill=(82, 82, 82))
    draw.polygon([(326, 122), (326, 150), (349, 136)], fill=(255, 255, 255))

    return image


def main():
    ICONS_DIR.mkdir(exist_ok=True)
    STORE_DIR.mkdir(exist_ok=True)

    for size in (16, 32, 48, 128):
        draw_extension_mark(size).save(ICONS_DIR / f"icon{size}.png")

    draw_promo().save(STORE_DIR / "small-promo-440x280.png")


if __name__ == "__main__":
    main()
