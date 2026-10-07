# Ajouter ou modifier un domaine — sans programmer

Chaque **monde** (domaine des mathématiques) est un simple fichier texte au format **YAML** dans `content-src/`.
On peut :

- **l'importer directement dans l'application** : Espace parents 🔒 → 📦 Contenus → « Importer un fichier » (le monde est vérifié puis ajouté sur cet appareil) ;
- ou **le publier pour tous** : déposer le fichier dans `content-src/`, puis `npm run deploy` (les appareils reçoivent la mise à jour automatiquement).

Un modèle complet et commenté est fourni : [`public/modele-monde.yaml`](../public/modele-monde.yaml) (téléchargeable aussi depuis l'Espace parents).

---

## 1. L'en-tête du monde

```yaml
id: monde-des-exemples          # identifiant unique (minuscules, tirets)
titre: Le Monde des Exemples
sous_titre: Une phrase qui résume
emoji: 🪐
couleur: "#3f9b4f"              # couleur du monde
decor: img/decors/mon-image.webp # facultatif : image de bannière
cycle: graines                  # graines | explorateurs | maitres | astuces
age: 8-10 ans
niveau: CE2 – CM1
ordre: 30                       # position sur la carte
prerequis: [foret-des-nombres]  # mondes à faire (à moitié) avant
version: 1.0.0
intro:                          # dialogue d'accueil
  - mia: "Bonjour !"
  - neo: "Défi accepté !"
  - zero: "…C'est évident."
lecons:
  - …
```

## 2. Une leçon

```yaml
  - id: ma-lecon
    titre: Le titre de la leçon
    objectif: Je sais… (une phrase « je sais »)
    mots: [mot-clé, autre mot]    # pour la recherche
    nb_defi: 6                    # nombre de questions du défi (facultatif)
    etapes:                       # le cours, étape par étape
      - dialogue: [ { mia: "…" }, { neo: "…" }, { zero-surprise: "…" } ]
      - texte: |
          Du **Markdown** et des formules : $\frac{3}{4}$, $x^2$.
      - visuel: { type: droite, min: 0, max: 10, pas: 1 }
        legende: "Une légende"
      - a_quoi_ca_sert: "Dans la vraie vie…"
      - astuce: "…"            # ou { texte: "…", qui: neo }
      - attention: "…"         # un piège classique
      - retiens: "…"           # l'essentiel à mémoriser
      - histoire: { titre: "Un peu d'histoire", texte: "…" }
      - exemple:
          titre: …
          enonce: …
          etapes: ["étape 1", "étape 2"]
          reponse: …
      - question: { …un exercice… }   # « À toi de jouer » au milieu du cours
    exercices:                    # tirés au sort pour le défi et les révisions
      - …
```

Personnages des dialogues : `mia`, `neo`, `zero`, `narrateur` ; humeur facultative : `mia-reflexion`, `zero-surprise`, `neo-joie`.

## 3. Les exercices (générés à l'infini)

Chaque exercice peut contenir des **variables tirées au sort** et des **gabarits** `{{ … }}` calculés.

```yaml
- type: nombre
  vars: { a: "2..9", b: "2..9" }     # entiers au hasard entre 2 et 9
  si: "a != b"                        # contrainte (on retire au sort sinon)
  enonce: "Combien font ${{a}} \\times {{b}}$ ?"
  reponse: "a*b"
  unite: cm                           # facultatif
  indice: "Pense à la table de {{a}}."
  correction: "{{a}} × {{b}} = {{a*b}}."
```

**Variables** : `"2..9"` (intervalle), `"a+1..20"`, `[2, 5, 10]` (au choix), `[[un, 1], [deux, 2]]` (couples → `v_0`, `v_1`), `"alea(1,9)*10"`, `"choix('Léa','Tom')"`.

**Types d'exercices**

| type | champs requis | ce que fait l'enfant |
|---|---|---|
| `nombre` | `reponse` (expression) ; `forme: fraction` / `irreductible` ; `tolerance` | tape un nombre (12 ; 2,5 ; 3/4) |
| `qcm` | `choix` (le 1ᵉʳ est le bon, ils sont mélangés ; `ordre_fixe: true` sinon) | choisit |
| `vf` | `reponse` (true/false ou condition) | Vrai / Faux |
| `comparer` | `gauche`, `droite` (+ `gauche_affiche`, `droite_affiche`) | <, =, > |
| `liste` | `reponse: [x1, x2]` | plusieurs nombres séparés par « ; » |
| `expression` | `reponse: "3x+2"`, `variables: [x]`, `forme: developpee / factorisee / reduite`, `calcul: true` | écrit une expression (vérifiée par équivalence) |
| `ordre` | `items` (dans le bon ordre) | range les étiquettes |
| `droite` | `min`, `max`, `pas`, `cible` (+ `cible_affiche`, `tolerance`) | touche la droite graduée |
| `texte` | `reponse: [mots acceptés]` | tape un mot |
| `champs` | `champs: [{avant, reponse, apres}]` | remplit plusieurs cases |

**Fonctions disponibles** dans les expressions : `abs sqrt round(x,n) ent floor ceil min max pgcd ppcm fact comb mod sin cos tan sind cosd tand asind acosd atand ln log exp si(cond,a,b) choix(…) alea(a,b) estpremier chiffre(n,rang) sommechiffres fib kieme(k,…) diviseurs lettres binaire romain heure(h,m) duree(min) tri(…) frac(n,d) fracb(n,d) nb(x) dec(x,n) texte majuscule pluriel`. Constantes : `pi`, `e`.

## 4. Les visuels (dessinés automatiquement)

`objets` (groupes d'émojis, `barres` pour barrer) · `blocs` (base 10) · `abaque` (tableau de numération) · `droite` (graduée, `sauts`, `marques`, `point`, `fractions`) · `barres` (méthode de Singapour : `lignes`, `total`, `ecart`) · `fraction` (`disque`, `barre`, `rectangle`) · `grille` · `figure` (`forme: rectangle | carre | triangle-rectangle | cercle` ou `points`, `segments`, `polygones`, `angles_droits`) · `horloge` · `monnaie` · `graphe` (`fonctions`, `points`, `segments`, `aire`) · `diagramme` · `tableau` · `motif` · `balance` · `arbre` · `solide` · `image`.

Dans un visuel, une valeur `"=expression"` est calculée (`nombre: "=a*10+b"`), une valeur texte peut contenir des `{{ … }}`.

## 5. Contrôle qualité automatique

`npm run build` (et l'import dans l'application) **tire chaque exercice des dizaines ou centaines de fois** et vérifie que :
la bonne réponse est acceptée, aucun calcul ne donne NaN/undefined, toutes les formules LaTeX se compilent, les visuels sont connus.
Un exercice défectueux est refusé avec un message précis.

## 6. Les autres fichiers

- `_glossaire.yaml` : le Grand Livre (`mot`, `def`, `exemple`, `source`, `monde`).
- `_enigmes.yaml` : les énigmes (`niveau` 1 à 3, `reponse`, `indice`, `solution`).
- `_jeux.yaml` : les familles du Calcul éclair (exercices de type `nombre`).
- `_diagnostic.yaml` : le test de positionnement (2 questions par monde).
- `_changelog.yaml` : le journal des nouveautés (la 1ʳᵉ entrée donne le numéro de version).
