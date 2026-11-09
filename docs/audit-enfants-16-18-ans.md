# Audit « 16, 17 et 18 ans » : comprendre ce qu'on demande, les réponses, « À quoi ça sert ? »

Date : 9 novembre 2026 · version auditée : 2.14.0 · corrections livrées : 2.15.0 (même jour, voir en fin de document)

Même méthode que les audits précédents, pour un élève de 1ʳᵉ (16 ans), de Terminale (17 ans) et un jeune de 18 ans (souvent encore en Terminale, ou dans le supérieur), en novembre.

## Méthode

1. **Parcours joué dans l'application** avec un profil de 18 ans en Terminale : création du profil, Galaxie, une leçon de philosophie.
2. **Ce que l'élève lit ou entend dans les leçons de son année** : `npm run audit:7ans -- --age 17 --annee --exemples --tout`, avec 520 à 740 défis simulés par âge.
3. **Test de niveau simulé** 400 fois par âge (`npm run audit:consignes -- 17`).
4. **Voix** (`npm run audit:voix -- 17`), **variété** (`npm run audit:domines -- 17`), **rédaction libre** (`npm run audit:libre -- 17`).
5. **Couverture** : leçons par classe (2nde, 1ʳᵉ, Terminale, supérieur) et par matière, et place de chaque notion du lycée dans l'échelle des niveaux.

## Constats (version 2.14.0)

### 1. Le lycée est rangé un an trop tard (bloquant)

Seules les leçons jusqu'à la 2nde avaient une classe explicite. Au-delà, le niveau se déduisait de la place dans le monde, avec des erreurs systématiques :

- **suites, dérivées, exponentielle, probabilités conditionnelles, variables aléatoires** (programme de 1ʳᵉ) étaient classées **Terminale** ;
- **intégrales, équations différentielles, loi binomiale, nombres complexes, matrices** (Terminale, dont maths expertes) étaient classés **« supérieur »** ;
- même chose en sciences : transcription, traduction, enzymes, titrage, chimie organique (1ʳᵉ) étaient classés en Terminale.

Résultat : 10 leçons de maths en 1ʳᵉ contre 25 en Terminale, et le parcours d'un élève de 1ʳᵉ manquait l'essentiel de son programme.

### 2. Rien pour les épreuves du bac hors maths et sciences (bloquant)

- **Bac de français (1ʳᵉ)** : 3 leçons seulement. Il n'y avait rien sur l'explication linéaire, la question de grammaire de l'oral, la dissertation sur œuvre ou l'entretien.
- **Philosophie (Terminale)** : aucune planète.
- **Anglais** : aucune leçon après la 2nde (le niveau B2 visé en Terminale n'était pas couvert).
- **Histoire-géographie** : aucune leçon au lycée.

### 3. À 18 ans, la classe n'était pas demandée (important)

À la création du profil, la question « Tu es dans quelle classe ? » disparaissait dès 18 ans. Or beaucoup d'élèves ont 18 ans en Terminale : ils étaient traités comme des étudiants du supérieur (test et parcours décalés d'un an).

### 4. Des défis faits presque que de calculs (à améliorer)

19 % des défis à 16 ans, 24 % à 17 ans et 8 % à 18 ans étaient faits à plus de moitié d'un seul type de question. Les leçons concernées : suites, intégrales, probabilités, arithmétique, logarithme, dérivées.

### 5. Voix (à améliorer)

Dans une formule, « si $a<0$ » était lu « a<0 » : les signes < et > à l'intérieur des formules n'étaient pas traduits.

### 6. Détails

- 2 « À quoi ça sert ? » manquaient dans les leçons du supérieur (storyboard, droits d'auteur en musique).
- Le texte « Demande à un adulte si tu ne sais pas » restait affiché aux lycéens.
- Écran de cours le plus long : 116 mots, mais c'est un tableau (exempté volontairement).

## Ce qui marchait déjà bien

- La rédaction libre est bien corrigée : 100 % des bonnes réponses avec fautes acceptées à 16-18 ans.
- Le test se concentre sur les îles utiles (15 questions) et ne repose jamais la même question.
- Le ton adolescent (dès 13 ans), le décor épuré et l'étape « Maîtres » sont en place.
- Les leçons de maths de lycée existent en nombre : il fallait surtout les ranger.

## Angles morts de la demande, comblés dans cet audit

1. **Le bac, épreuve par épreuve** : français (écrit et oral), philosophie, langues, histoire-géographie, et pas seulement les maths.
2. **L'âge ne dit pas la classe, surtout à 18 ans** : redoublement, naissance en fin d'année, année de césure.
3. **La place des maths expertes** (complexes, arithmétique, matrices) : c'est une option de Terminale, pas du supérieur.
4. **Les élèves de 18 ans qui ont quitté le lycée** : l'application n'a que peu de contenus du supérieur ; c'est un choix assumé (application scolaire), signalé ci-dessous.

## Corrections livrées (2.15.0)

| Mesure | Avant (2.14.0) | Après (2.15.0) |
|---|---|---|
| Leçons avec une classe explicite | 168 | 283 |
| Maths : 1ʳᵉ / Terminale / supérieur | 10 / 25 / 13 | 22 / 27 / 0 |
| Bac de français (1ʳᵉ) | 3 leçons | 9 leçons |
| Philosophie (Terminale) | aucune planète | 1 planète, 6 leçons |
| Anglais de 1ʳᵉ-Terminale | 0 | 6 leçons (B2) |
| Histoire-géographie au lycée | 0 | 6 leçons |
| Défis dominés par un seul type, 16 / 17 / 18 ans | 19 % / 24 % / 8 % | 0 % / 0 % / 0 % |
| Classe demandée à 18 ans | non | oui (1ʳᵉ, Terminale, supérieur) |

1. **Classes du lycée** : 115 leçons de maths, sciences et français rangées d'après les programmes de 1ʳᵉ et de Terminale. Les maths expertes (complexes, arithmétique, matrices) sont rangées en Terminale. Relativité, quantique, génomique et thermodynamique chimique restent dans le supérieur.
2. **Bac de français** : nouveau monde **La Tribune du Bac** (explication linéaire, question de grammaire, commentaire, dissertation, objets d'étude, entretien de l'oral).
3. **Philosophie** : nouvelle planète **L'Agora des Idées** (dissertation, explication de texte, conscience et inconscient, liberté, vérité, justice et État), avec son histoire, son Gardien et son image, produite avec le pipeline ComfyUI du projet (`C:\IA\workflows\rdn\planete_philosophie.py`).
4. **Anglais** : monde **Le Port du Large** (temps du récit, modaux au passé, troisième conditionnel et « wish », essay, synthèse de documents, oral).
5. **Histoire-géographie** : monde **La Galerie des Siècles** (Révolution et Empire, industrialisation, IIIe République, guerre froide, décolonisation, mondialisation).
6. **Classe à 18 ans** : demandée et enregistrée (1ʳᵉ, Terminale, supérieur) ; la phrase « Demande à un adulte » disparaît dès 13 ans.
7. **Variété** : 34 exercices ajoutés dans 17 leçons de maths du lycée.
8. **Voix** : les signes < et > dans une formule sont lus (« a inférieur à 0 »).
9. **Textes** : les 2 « À quoi ça sert ? » manquants sont écrits.

Restent ouverts :
- **le supérieur** : peu de contenus (14 leçons de niveau post-bac, toutes matières) ;
- **les autres disciplines et parcours du bac** : spécialités HGGSP, SES, NSI, et le bac technologique (contraction de texte et essai) ne sont pas couverts ;
- **le Grand oral** : pas encore de leçon dédiée ;
- **le test avec de vrais élèves**.
