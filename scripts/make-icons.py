# Icônes de l'application : Zéro sur un fond dégradé violet → orange.
# C:\IA\tools\rembg_env\Scripts\python.exe scripts\make-icons.py
from PIL import Image, ImageDraw

def gradient(size):
    im = Image.new("RGBA", (size, size))
    top, bot = (124, 77, 255), (255, 138, 31)
    d = ImageDraw.Draw(im)
    for y in range(size):
        t = y / (size - 1)
        d.line([(0, y), (size, y)], fill=tuple(int(top[i] * (1 - t) + bot[i] * t) for i in range(3)) + (255,))
    return im

zero = Image.open("assets-src/cut/zero.png").convert("RGBA")

def icon(size, scale, rounded):
    bg = gradient(size)
    z = zero.copy()
    z.thumbnail((int(size * scale), int(size * scale)), Image.LANCZOS)
    bg.alpha_composite(z, ((size - z.width) // 2, (size - z.height) // 2 + int(size * 0.03)))
    if rounded:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=255)
        bg.putalpha(mask)
    return bg

icon(512, 0.8, True).save("public/icons/icon-512.png", optimize=True)
icon(192, 0.8, True).save("public/icons/icon-192.png", optimize=True)
icon(512, 0.6, False).save("public/icons/icon-maskable-512.png", optimize=True)
icon(180, 0.74, False).convert("RGB").save("public/icons/apple-touch-icon.png", optimize=True)
print("ok")
