# Grille de correspondance programmes officiels (Éduscol) ↔ leçons de la Galaxie des Savoirs.
# Entrées : objectifs extraits des annexes officielles (TSV), contenu compilé (public/content).
# Sortie : public/alignement-programmes.html
# usage : py scripts/alignement/alignement.py   (depuis la racine du projet)
import json, os, re, sys, html, glob

SRC = sys.argv[1] if len(sys.argv) > 1 else "scripts/alignement"
W = {}
for f in glob.glob("public/content/worlds/*.json"):
    w = json.load(open(f, encoding="utf-8"))
    W[w["id"]] = w
def titre(k):
    w, l = k.split("/")
    for x in W[w]["lecons"]:
        if x["id"] == l: return f'{W[w]["emoji"]} {x["titre"]}'
    raise SystemExit("leçon inconnue " + k)

# (motif sur l'objectif, leçons, statut) ; statut : ok | partiel (avec note)
P = "partiel"
R = [
 # ---- nombres
 (r"dénombrer des collections|construire des collections", ["nid-des-nombres/compter-un-par-un", "foret-des-nombres/compter-par-dix"], (P, "à compléter par la manipulation d'objets réels")),
 (r"relation entre unités et|relations? entre (les )?unités de numération", ["foret-des-nombres/compter-par-dix", "foret-des-nombres/centaines"], None),
 (r"somme d’un entier et d’une fraction", ["village-des-fractions/fractions-droite", "village-des-fractions/ecrire-fraction"], None),
 (r"lien avec la division par 10", ["port-des-decimaux/multiplier-decimaux", "port-des-decimaux/diviser-decimaux"], None),
 (r"1 kg est égal", ["marche-des-mesures/masses"], None),
 (r"1 L est égal", ["marche-des-mesures/contenances"], None),
 (r"distance entre deux points|distances à un point", ["cite-des-formes/cercle", "chateau-de-la-geometrie/mediatrice-bissectrice"], None),
 (r"L’utiliser pour calculer des angles", ["chateau-de-la-geometrie/angles"], None),
 (r"suite écrite et la suite orale", ["foret-des-nombres/nombres-en-lettres", "foret-des-nombres/centaines", "foret-des-nombres/grands-nombres"], None),
 (r"relations? entre (les )?unités de numération|liens entre les unités de numération", ["foret-des-nombres/compter-par-dix", "foret-des-nombres/centaines", "port-des-decimaux/dixiemes-centiemes"], None),
 (r"diverses représentations d’un nombre|différentes écritures d’un nombre décimal", ["foret-des-nombres/centaines", "port-des-decimaux/dixiemes-centiemes"], None),
 (r"valeur des chiffres", ["foret-des-nombres/centaines", "foret-des-nombres/grands-nombres"], None),
 (r"comparer, encadrer, intercaler|ordonner des nombres|«\s*égal à|expressions « égal", ["foret-des-nombres/comparer-ranger", "nid-des-nombres/plus-moins"], None),
 (r"demi-droite graduée", ["foret-des-nombres/droite-numerique", "village-des-fractions/fractions-droite", "port-des-decimaux/placer-decimaux"], None),
 (r"ordinaux|rang ou une position|rang d’un objet", ["foret-des-nombres/ordinaux"], None),
 (r"grands nombres entiers", ["foret-des-nombres/grands-nombres"], None),
 (r"parité", ["foret-des-nombres/pair-impair"], None),
 (r"multiples de 2, de 5 et de 10|multiple d’un nombre|diviseur d’un nombre", ["riviere-du-partage/multiples-diviseurs"], None),
 # ---- fractions / décimaux
 (r"fraction.*(somme d’un entier|entier et d’une fraction)|nombre mixte|encadrer une fraction", ["village-des-fractions/fractions-droite", "village-des-fractions/ecrire-fraction"], None),
 (r"interpréter, représenter, écrire et lire (les |des )?fractions|connaitre et utiliser les mots", ["village-des-fractions/parts-egales", "village-des-fractions/ecrire-fraction"], None),
 (r"égalités de fractions|établir des égalités", ["village-des-fractions/fractions-egales"], None),
 (r"comparer (des|et encadrer des) fractions|ordonner une liste de nombres écrits sous forme de fractions", ["village-des-fractions/comparer-fractions"], None),
 (r"(additionner|opérations).*fractions|multiplier une fraction", ["village-des-fractions/additionner-fractions", "village-des-fractions/multiplier-fractions"], None),
 (r"fraction d’une quantité|appliquer une fraction|fractions usuelles", ["village-des-fractions/fraction-d-une-quantite", "port-des-decimaux/dixiemes-centiemes"], None),
 (r"fraction.*demi-droite|repérer un point.*fraction|graduer un segment|longueurs non entières|partager une unité", ["village-des-fractions/fractions-droite"], None),
 (r"fraction au résultat exact de la division|quotient d’un entier|fraction a b peut", ["village-des-fractions/fractions-droite", "port-des-decimaux/diviser-decimaux"], None),
 (r"problèmes mettant en jeu des fractions|inventer des problèmes", ["village-des-fractions/fraction-d-une-quantite", "atelier-des-problemes/calcul-vers-probleme"], None),
 (r"nombre décimal|décimaux|écriture à virgule|valeur arrondie", ["port-des-decimaux/dixiemes-centiemes", "port-des-decimaux/placer-decimaux", "port-des-decimaux/comparer-decimaux", "port-des-decimaux/additionner-decimaux", "port-des-decimaux/multiplier-decimaux", "port-des-decimaux/diviser-decimaux", "port-des-decimaux/arrondir-estimer"], None),
 (r"0,1, par 0,01", ["port-des-decimaux/multiplier-decimaux"], None),
 (r"pourcentage", ["tour-des-proportions/pourcentages"], None),
 # ---- calcul
 (r"sens de l’addition|symboles « \+ »|terme», «\s*somme|«\s*terme", ["prairie-des-additions/additionner-reunir", "prairie-des-additions/soustraire"], None),
 (r"additions?( et des soustractions)? en colonnes|poser.*additions", ["prairie-des-additions/addition-posee", "prairie-des-additions/soustraction-posee", "port-des-decimaux/additionner-decimaux"], None),
 (r"sens de la multiplication|symbole « × »|commutative|«\s*facteur", ["montagne-des-multiplications/groupes-egaux", "montagne-des-multiplications/proprietes-multiplication"], None),
 (r"multiplications? (d’un|de deux)|poser et effectuer la multiplication", ["montagne-des-multiplications/multiplication-posee", "port-des-decimaux/multiplier-decimaux"], None),
 (r"sens de la division|divisions? euclidiennes?|divisions décimales|diviser un nombre décimal par un nombre entier", ["riviere-du-partage/partager", "riviere-du-partage/division-euclidienne", "riviere-du-partage/division-posee", "port-des-decimaux/diviser-decimaux"], None),
 (r"tables d’addition|compléments?|amis", ["prairie-des-additions/amis-de-10", "nid-des-nombres/decomposer-5-10"], None),
 (r"tables de multiplication|faits multiplicatifs|faits numériques", ["montagne-des-multiplications/tables-2-5-10", "montagne-des-multiplications/tables-3-4", "montagne-des-multiplications/tables-6-9"], None),
 (r"doubles et les moitiés|moitié d’un nombre|moitié des nombres impairs|double d’un nombre décimal|moitié d’un nombre décimal", ["prairie-des-additions/doubles", "foret-des-nombres/pair-impair"], None),
 (r"ajouter ou soustraire|ajouter \d|soustraire \d|ajouter un nombre|ajouter deux nombres|soustraire un nombre", ["prairie-des-additions/passer-la-dizaine", "prairie-des-additions/calcul-mental-astuces", "ecole-des-astuces/compenser"], None),
 (r"multiplier (un nombre )?(entier |décimal )?par (10|4|5|50)|multiplier par 10|diviser un nombre décimal par 10|diviser un nombre entier par 4|par un nombre entier de dizaines|de dizaines, de centaines ou de milliers", ["montagne-des-multiplications/fois-10-100", "ecole-des-astuces/multiplier-par-5-25-50", "ecole-des-astuces/decomposer-multiplier"], None),
 (r"produit d’un nombre compris entre 11|distributivité", ["montagne-des-multiplications/proprietes-multiplication", "ecole-des-astuces/decomposer-multiplier"], None),
 (r"procédures de calcul mental|connaissances en numération pour calculer", ["prairie-des-additions/calcul-mental-astuces", "ecole-des-astuces/compenser"], None),
 (r"estimer le résultat|ordres de grandeur", ["ecole-des-astuces/estimer-verifier", "port-des-decimaux/arrondir-estimer"], None),
 (r"parenthèses", ["royaume-des-relatifs/priorites", "jardin-de-fibonacci/programmes-de-calcul"], None),
 # ---- problèmes, algèbre, algorithmique
 (r"problèmes additifs", ["atelier-des-problemes/barres-parties-tout", "atelier-des-problemes/barres-comparaison", "atelier-des-problemes/problemes-etapes"], None),
 (r"problèmes multiplicatifs|comparaison multiplicative|images distribuées", ["atelier-des-problemes/barres-multiplication"], None),
 (r"problèmes mixtes", ["atelier-des-problemes/problemes-etapes", "atelier-des-problemes/probleme-vers-calcul"], None),
 (r"produits cartésiens|dénombrement|optimisation", ["atelier-des-problemes/combien-de-facons"], None),
 (r"égalité à trous|égalités à trous|nombre inconnu|problèmes algébriques|modèles pré-algébriques", ["jardin-de-fibonacci/egalites-a-trous", "atelier-des-problemes/barres-parties-tout"], None),
 (r"programme de calcul", ["jardin-de-fibonacci/programmes-de-calcul"], None),
 (r"suite de nombres|suite de motifs|motif évolutif|régularités", ["jardin-de-fibonacci/motifs", "jardin-de-fibonacci/suites-qui-grandissent", "jardin-de-fibonacci/nombres-figures"], None),
 (r"algorithmes|instruction|programmer la construction", ["jardin-de-fibonacci/instructions-repetees", "jardin-de-fibonacci/coder-reperer"], None),
 (r"problèmes mettant en jeu des (multiplications|divisions)", ["port-des-decimaux/multiplier-decimaux", "riviere-du-partage/division-euclidienne"], None),
 # ---- grandeurs et mesures
 (r"longueurs?|mètre|kilomètre|distance$|règle graduée", ["marche-des-mesures/longueurs", "marche-des-mesures/conversions"], None),
 (r"périmètre", ["cite-des-formes/perimetre", "chateau-de-la-geometrie/aires-perimetres"], None),
 (r"masses?|gramme|tonne|soupesant|plus léger", ["marche-des-mesures/masses"], None),
 (r"contenances?|litre|millilitre", ["marche-des-mesures/contenances"], None),
 (r"monnaie|euro|achats|somme d’argent|pièces", ["marche-des-mesures/monnaie"], None),
 (r"horloge|l’heure|heures du matin|moment de la journée|unités de mesure de durée", ["marche-des-mesures/lire-l-heure"], None),
 (r"durées?|horaires", ["marche-des-mesures/durees"], None),
 (r"aires?|centimètres? carrés?|mètre carré", ["cite-des-formes/aire", "chateau-de-la-geometrie/aires-perimetres"], None),
 (r"volumes?|centimètre cube", ["chateau-de-la-geometrie/volumes"], None),
 (r"angles?( |$)|lexique spécifique associé aux angles|notations des angles|angle droit mesure", ["cite-des-formes/angles-droits", "chateau-de-la-geometrie/angles"], None),
 (r"bissectrice", ["chateau-de-la-geometrie/mediatrice-bissectrice"], None),
 (r"proportionnalité|échelles", ["tour-des-proportions/situations-proportionnelles", "tour-des-proportions/quatrieme-proportionnelle", "tour-des-proportions/echelles"], None),
 # ---- espace et géométrie
 (r"patron", ["cite-des-formes/patrons"], None),
 (r"solides|cube|pavé|pyramide|prisme|«\s*face", ["cite-des-formes/solides", "cite-des-formes/patrons"], None),
 (r"assemblages de cubes|assemblages de solides", ["cite-des-formes/solides"], (P, "à compléter par des constructions avec de vrais cubes")),
 (r"perpendicularité|parallélisme", ["cite-des-formes/perpendiculaires-paralleles"], None),
 (r"médiatrice|milieu d’un segment|cercle circonscrit|médiatrices d’un triangle", ["chateau-de-la-geometrie/mediatrice-bissectrice"], None),
 (r"cercle|disque|rayon", ["cite-des-formes/cercle"], None),
 (r"symétri|axes? de symétrie", ["cite-des-formes/symetrie", "chateau-de-la-geometrie/transformations"], None),
 (r"triangles?|carré|rectangle|losange|figures? (planes|usuelles|suivantes)|formes planes|vocabulaire géométrique|codes? usuels|codage", ["cite-des-formes/reconnaitre-formes", "cite-des-formes/angles-droits", "chateau-de-la-geometrie/figures-particulieres"], None),
 (r"règle|équerre|compas|tracé|tracer|reproduire ou construire|construire une figure|programme de construction", ["cite-des-formes/reconnaitre-formes", "cite-des-formes/perpendiculaires-paralleles"], (P, "tracés aux instruments : à faire sur papier (l'appli explique et vérifie les propriétés)")),
 (r"alignements?", ["cite-des-formes/reconnaitre-formes"], (P, "à faire sur papier avec une règle")),
 (r"positions relatives|situer des personnes|déplacements?|plan de la classe|représentations (de la classe|d’un espace)|suite d’instructions qui codent", ["jardin-de-fibonacci/coder-reperer", "royaume-des-relatifs/repere"], (P, "à compléter par des déplacements réels")),
 # ---- données, hasard
 (r"tableau|diagramme|données|enquête|mesures et les consigner|filtrant", ["foret-des-nombres/tableaux-diagrammes", "observatoire-des-donnees/lire-graphiques", "observatoire-des-donnees/diagramme-circulaire"], None),
 (r"aléatoire|probab|équiprobab|issues|«\s*impossible", ["observatoire-des-donnees/hasard-probabilite", "observatoire-des-donnees/deux-epreuves"], None),
]

def lire(f, cycle):
    out = []
    for ligne in open(os.path.join(SRC, f), encoding="utf-8"):
        p = ligne.rstrip("\r\n").split("\t")
        niv, obj = (p[0], p[-1]) if len(p) >= 2 else (None, None)
        if not obj: continue
        obj = obj.strip()
        w = obj.split()[0]
        if not re.search(r"(er|ir|re)$", w) or obj == "Algèbre" or len(obj) < 18: continue
        niv = {"Cours préparatoire": "CP", "Cours élémentaire première année": "CE1", "Cours élémentaire deuxième année": "CE2"}.get(niv.strip(), niv.strip())
        out.append((cycle, niv, obj))
    return out

objs = lire("maths_c2_obj.tsv", "Cycle 2") + lire("maths_c3_obj.tsv", "Cycle 3")
lignes, stats = [], {"ok": 0, "partiel": 0, "non": 0}
vus = set()
for cyc, niv, obj in objs:
    if (niv, obj) in vus: continue
    vus.add((niv, obj))
    m = next((r for r in R if re.search(r[0], obj, re.I)), None)
    if not m:
        st, note, ls = "non", "non couvert", []
    else:
        ls = m[1]; st, note = (m[2] if m[2] else ("ok", ""))
    stats[st] += 1
    lignes.append((cyc, niv, obj, st, note, ls))

sym = {"ok": "✅", "partiel": "🟡", "non": "⬜"}
rows = "\n".join(
    f'<tr class="st-{st}"><td>{niv}</td><td>{html.escape(obj)}</td><td>{sym[st]}</td><td>{"<br>".join(html.escape(titre(k)) for k in ls)}{("<br><em>" + html.escape(note) + "</em>") if note else ""}</td></tr>'
    for cyc, niv, obj, st, note, ls in lignes)
non = [f"{n} : {o}" for c, n, o, st, _, _ in lignes if st == "non"]
print(stats, len(lignes)); print("\n".join(non))
tpl = open("scripts/alignement/modele.html", encoding="utf-8").read()
out = tpl.replace("{{ROWS}}", rows).replace("{{OK}}", str(stats["ok"])).replace("{{PARTIEL}}", str(stats["partiel"])).replace("{{NON}}", str(stats["non"])).replace("{{TOTAL}}", str(len(lignes)))
open("public/alignement-programmes.html", "w", encoding="utf-8").write(out)
