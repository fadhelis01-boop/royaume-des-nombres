# Zéro : hamster blanc sur couverture crème → le modèle « anime » échoue,
# on essaie les modèles généraux disponibles.
import os, sys
from rembg import remove, new_session
from PIL import Image

model = sys.argv[1] if len(sys.argv) > 1 else "u2net"
im = Image.open("assets-src/Zéro.jpg").convert("RGB")
cut = remove(im, session=new_session(model), post_process_mask=True)
bbox = cut.getbbox()
print(model, "bbox", bbox)
if bbox:
    cut = cut.crop(bbox)
cut.thumbnail((640, 640), Image.LANCZOS)
cut.save("public/img/mascottes/zero.png", optimize=True)
cut.save("public/img/mascottes/zero.webp", "WEBP", quality=88, method=6)
print(cut.size)
