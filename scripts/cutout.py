# Détourage des mascottes (fond transparent) + versions web compressées.
# Lancer avec l'environnement rembg de la machine :
#   C:\IA\tools\rembg_env\Scripts\python.exe scripts\cutout.py
import os
from rembg import remove, new_session
from PIL import Image

SRC = "assets-src"
OUT_M = "public/img/mascottes"
OUT_D = "public/img/decors"
os.makedirs(OUT_M, exist_ok=True)
os.makedirs(OUT_D, exist_ok=True)

session = new_session("isnet-anime")
mascots = {
    "Mia.jpg": "mia",
    "Mia en réflexion.jpg": "mia-reflexion",
    "Fibo.jpg": "neo",
    "Zéro.jpg": "zero",
}
for src, name in mascots.items():
    im = Image.open(os.path.join(SRC, src)).convert("RGB")
    cut = remove(im, session=session, post_process_mask=True)
    bbox = cut.getbbox()
    if bbox:
        cut = cut.crop(bbox)
    cut.thumbnail((640, 640), Image.LANCZOS)
    cut.save(os.path.join(OUT_M, name + ".webp"), "WEBP", quality=88, method=6)
    cut.save(os.path.join(OUT_M, name + ".png"), optimize=True)
    # Portrait rond (repli pour les petits formats) : carré centré sur le haut
    w, h = cut.size
    print(name, cut.size)

decors = {"La forêt des nombres.jpg": "foret-des-nombres", "LA PRAIRIE DES ADDITIONS.jpg": "prairie-des-additions"}
for src, name in decors.items():
    im = Image.open(os.path.join(SRC, src)).convert("RGB")
    im.thumbnail((1400, 1400), Image.LANCZOS)
    im.save(os.path.join(OUT_D, name + ".webp"), "WEBP", quality=82, method=6)
    im.save(os.path.join(OUT_D, name + ".jpg"), "JPEG", quality=82, optimize=True, progressive=True)
    print(name, im.size)
