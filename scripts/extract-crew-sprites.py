"""Extract 16x16 transparent PNG sprites from the 1248x624 character sheets.

The sheets draw each character on a 39 px grid (16x16 cells) in the left half, on black.
Each cell is sampled at its centre; near-black cells become transparent.
Usage: python3 scripts/extract-crew-sprites.py   (requires Pillow)
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src/assets/characters"
OUT = SRC / "pixel"
CELL, GRID, BLACK = 39, 16, 16

OUT.mkdir(exist_ok=True)
for sheet in sorted(SRC.glob("*.jpeg")):
    image = Image.open(sheet).convert("RGB")
    sprite = Image.new("RGBA", (GRID, GRID), (0, 0, 0, 0))
    for y in range(GRID):
        for x in range(GRID):
            r, g, b = image.getpixel((x * CELL + CELL // 2, y * CELL + CELL // 2))
            if max(r, g, b) > BLACK:
                sprite.putpixel((x, y), (r, g, b, 255))
    sprite.save(OUT / f"{sheet.stem}.png")
    print("wrote", (OUT / f"{sheet.stem}.png").relative_to(ROOT))
