#!/usr/bin/env python3
"""生成扩展图标：知乎蓝圆角方形底 + 白色粗体「AI」。

用法：python3 scripts/gen-icons.py
输出：icons/icon16.png、icons/icon48.png、icons/icon128.png
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SIZES = (16, 48, 128)
BG_COLOR = (0, 132, 255, 255)  # 知乎蓝 #0084FF
FG_COLOR = (255, 255, 255, 255)
TEXT = "AI"
SUPERSAMPLE = 8  # 先放大绘制再缩小，获得抗锯齿边缘
CORNER_RATIO = 0.22  # 圆角半径 / 边长
FONT_RATIO = 0.56  # 字号 / 边长
FONT_CANDIDATES = (
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
)

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "icons"


def load_font(px: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, px)
    return ImageFont.load_default(px)


def render(size: int) -> Image.Image:
    big = size * SUPERSAMPLE
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((0, 0, big - 1, big - 1), radius=int(big * CORNER_RATIO), fill=BG_COLOR)

    font = load_font(int(big * FONT_RATIO))
    # 用实际字形包围盒居中；描边加粗模拟粗体
    stroke = max(1, big // 40)
    left, top, right, bottom = draw.textbbox((0, 0), TEXT, font=font, stroke_width=stroke)
    x = (big - (right - left)) / 2 - left
    y = (big - (bottom - top)) / 2 - top
    draw.text((x, y), TEXT, font=font, fill=FG_COLOR, stroke_width=stroke, stroke_fill=FG_COLOR)

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    for size in SIZES:
        out = OUT_DIR / f"icon{size}.png"
        render(size).save(out)
        print(f"wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
