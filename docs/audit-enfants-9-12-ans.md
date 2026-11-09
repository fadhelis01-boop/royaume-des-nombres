# Audit « enfants de 9, 10, 11 et 12 ans » : comprendre ce qu'on demande, les réponses, « À quoi ça sert ? »

Date : 9 novembre 2026 · version auditée : 2.11.0 · corrections livrées : 2.12.0 et 2.13.0 (9 novembre 2026, voir en fin de document)

Même méthode que les audits « 7 ans » et « 8 ans », adaptée aux plus grands : un enfant de CM1 (9 ans), CM2 (10 ans), 6ᵉ (11 ans) et 5ᵉ (12 ans), en novembre.

## Méthode

1. **Parcours joué dans l'application** avec un profil de 12 ans en 5ᵉ (téléphone et ordinateur) : création du profil, Galaxie, carte des talents en maths, une leçon de 5ᵉ écran par écran. Les profils de 9 à 11 ans ont été vérifiés par les mesures et le code (mêmes écrans, règles d'âge différentes).
2. **Tout ce que l'enfant lit ou entend**, pour chaque âge, sur toutes les leçons de son niveau puis **sur celles de l'année en cours seulement** (nouvelle option `npm run audit:7ans -- --age 10 --annee --exemples --tout`), avec simulation des défis tirés.
3. **Test de niveau simulé** 400 fois par âge (`npm run audit:consignes -- 10`).
4. **Voix** : chaque texte passé dans la synthèse vocale (`npm run audit:voix -- 10`), plus 23 notations du collège testées une à une.
5. **Variété des défis** (`npm run audit:domines -- 10`).
6. **Nouveau : la correction automatique de la rédaction libre** (`npm run audit:libre -- 10`). Pour chaque « Sans regarder : qu'as-tu retenu ? » de l'année, on soumet la bonne réponse avec des fautes d'enfant, une simple liste de mots-clés, une phrase courte et « je sais pas ».
7. **Couverture du programme** : nombre de leçons par classe et par planète, place des leçons de collège dans l'échelle des niveaux.
8. **Affichage sur téléphone** (375 px) des leçons à formules de 6ᵉ et 5ᵉ.

## Ce que vit l'enfant, par âge

| | 9 ans (CM1) | 10 ans (CM2) | 11 ans (6ᵉ) | 12 ans (5ᵉ) |
|---|---|---|---|---|
| Test de niveau | 6 îles, 18 questions | 7 îles, 21 questions | 7 îles, 21 questions | 7 îles, 21 questions |
| Niveau des questions | CE2 55 %, CM1 16 % | CM1 54 %, CM2+ 17 % | CM2+ 63 % | CM2+ 77 % |
| Ligne « comment répondre », consignes lues | oui | non | non | non |
| « Je suis sûr / pas sûr », pourcentage en fin de défi | non | oui | oui | oui |
| Défis avec rédaction ou « mot qui manque » | 53 % | 49 % | 55 % | 54 % |
| Mots par écran de cours (année en cours) | 26 | 39 | 51 | 55 |
| Écrans de plus de 60 mots (année) | 0 | 12 | 15 | 15 |
| Défis dominés par un seul type (année) | 4 % | 5 % | 21 % | 16 % |
| Corrections sans pourquoi (année) | 21 % | 14 % | 21 % | 25 % |
| « À quoi ça sert ? » manquants (année) | 5 | 0 | 2 | 1 |
| Leçons de l'année, toutes planètes | 45 | 37 | 33 | 37 |
| Ambiance | enchantée | enchantée | enchantée | épurée |

À 12 ans, sur la Galaxie, la première ligne de chaque planète annonce « 🌱 Les Graines : 0/11 mondes ». La carte des talents parle de « petites questions ». La leçon de 5ᵉ « Les nombres négatifs » commence bien : scène du thermomètre, « À quoi ça sert ? », ligne des nombres. Les formules s'affichent correctement sur téléphone : aucun débordement mesuré.

## Constats, du plus grave au moins grave

### 1. L'anglais s'arrête au CE2 (bloquant)

La planète Anglais compte 6 leçons, toutes du CP au CE2. Il n'y a rien pour un enfant de 9 à 12 ans, alors que l'anglais est enseigné chaque semaine du CM1 à la 5ᵉ (niveau A1 à A2 visé). Un enfant de CM2 qui choisit l'anglais retombe sur « Hello ! Goodbye ! ».

### 2. La correction de la rédaction libre est trop stricte sur l'orthographe et trop facile à contourner (important)

Mesuré sur les rédactions libres de l'année (18 à 24 par âge) :

| | 9 ans | 10 ans | 11 ans | 12 ans |
|---|---|---|---|---|
| Bonne réponse avec des fautes d'enfant acceptée | 67 % | 78 % | 67 % | 75 % |
| Simple liste de mots-clés, sans phrase, acceptée | 100 % | 100 % | 100 % | 100 % |
| « je sais pas » accepté | 0 % | 0 % | 0 % | 0 % |

Une réponse juste, écrite avec des fautes ordinaires (« artculations », « se conractent », « yaort »), est refusée une fois sur quatre environ. À l'inverse, écrire « os articulations muscles tendons » suffit : rien ne demande une phrase. Un enfant de 10 ans comprend vite qu'il suffit de lister des mots.

### 3. La marche entre 8 et 9 ans est trop haute (important)

La veille de ses 9 ans, l'enfant n'a jamais de rédaction dans ses défis. Le lendemain, plus d'un défi sur deux en contient (53 %). Une seule date d'anniversaire fait aussi basculer d'autres règles :

- à 9 ans : 3 questions par île au lieu de 2 ;
- à 10 ans : « Je suis sûr / pas sûr », pourcentage en fin de défi, fin de la ligne « comment répondre ».

### 4. Le niveau des leçons de collège est parfois faux (important)

Le niveau de chaque leçon est déduit de sa place dans le monde (« 5ᵉ – 4ᵉ » réparti de la première à la dernière leçon). Résultat :

- « Additionner et soustraire des relatifs » (programme de 5ᵉ) est classée 4ᵉ ;
- « Les priorités opératoires » (5ᵉ) est classée 4ᵉ ;
- « Les nombres premiers » est rangée en « Maths expertes » (Terminale) alors qu'elle est vue au collège ;
- « Le hasard et les probabilités » (premières notions en 5ᵉ) est classée 4ᵉ.

Le parcours personnalisé d'un élève de 5ᵉ ne propose donc pas ces leçons de son année.

### 5. Peu de leçons pour l'année en cours au collège (important)

Maths : 20 leçons au CM1, 20 au CM2, puis 13 en 6ᵉ et 10 en 5ᵉ. La symétrie centrale (5ᵉ) n'existe pas. Sciences en 6ᵉ : physique 1 leçon, Terre et Univers 2. Un collégien finit vite « son » année et doit piocher au-dessus ou en dessous.

### 6. La voix lit mal les notations du collège (important)

| Écrit | Lu aujourd'hui | Attendu |
|---|---|---|
| CO₂, H₂O | « CO₂ », « H₂O » (souvent « co » et « o ») | « C O 2 », « H 2 O » |
| XVIIIᵉ siècle, chapitre IX | les lettres | « dix-huitième », « neuf » |
| (AB) ⊥ (CD) | symbole ignoré | « est perpendiculaire à » |
| 1 m³ | « 1 mètres au cube » | « 1 mètre cube » |
| 5 km/h | « 5 kilomètres/h » | « 5 kilomètres par heure » |
| v = d / t | « d / t » | « d divisé par t » |

Ces formes apparaissent dans les leçons de sciences et d'histoire des sciences de 10 à 12 ans (photosynthèse, respiration, Lavoisier, géométrie).

### 7. Les écrans de cours deviennent longs au collège (à améliorer)

En 6ᵉ et 5ᵉ, un écran de cours fait 51 à 55 mots en moyenne, et 15 écrans de l'année dépassent 60 mots. Exemples : « Le cœur et le sang » (119 mots sur un écran), « Gravitation et marées » (100), « Tonalités et armures » (96), « Le subjonctif » (92). Sur un téléphone, c'est un long défilement. Les mondes des grands ne sont jamais découpés automatiquement.

### 8. Des défis faits presque que de calculs en 6ᵉ et 5ᵉ (à améliorer)

21 % des défis à 11 ans et 16 % à 12 ans sont faits à plus de moitié d'un seul type de question. 11 leçons de 6ᵉ et 17 jusqu'à la 5ᵉ n'ont presque que des réponses en nombre (décimaux, proportionnalité, pourcentages, échelles, moyenne, aires, volumes, loi d'Ohm, vitesse).

### 9. L'image renvoyée à un collégien (à améliorer)

- « 🌱 Les Graines » est la première chose écrite sous chaque planète, même en 5ᵉ.
- L'ambiance « épurée » ne s'active qu'à 12 ans : en 6ᵉ, on garde le décor des petits.
- **Âge ou classe ?** La classe choisie à la création du profil n'est utilisée qu'à 8 endroits. 33 autres règles regardent l'âge, dont le pourcentage en fin de défi, « Je suis sûr », le niveau du défi du jour, des jeux et du dictionnaire, ou les temps de conjugaison de l'échauffement. Un enfant de 10 ans en 6ᵉ, ou de 11 ans en CM1, reçoit des réglages qui ne correspondent pas à sa classe.

### 10. Le test de niveau laisse voir l'indice (à améliorer, tous âges)

Pendant la carte des talents, le bouton « 💡 Indice » est disponible. Une réponse trouvée grâce à l'indice compte comme réussie, ce qui fait monter l'estimation.

### 11. Restes de rédaction (à améliorer)

- « À quoi ça sert ? » manquants dans les leçons de l'année :
  - squelette et muscles ;
  - feuille symétrique ;
  - enrichir une phrase ;
  - gamme pentatonique ;
  - l'eau de la planète ;
  - dessin : valeurs, textures ;
  - et 1 en 5ᵉ.
- À 9 et 10 ans, 21 puis 17 « À quoi ça sert ? » restent loin de la vie de l'enfant. À 11 et 12 ans, citer des métiers motive au contraire : ce n'est plus un défaut.
- Astuces de plus de 25 mots : 15 à 9 ans, 11 à 10 ans.
- Corrections sans pourquoi : jusqu'à 25 % à 12 ans.

## Ce qui marche bien

- Test de niveau adapté à chaque âge, avec pauses entre les îles ; questions centrées sur l'année précédente et l'année en cours.
- Formules mathématiques lisibles sur téléphone, sans débordement.
- Lecture à voix haute des formules simples correcte : « x au carré plus 3x moins 4 égale 0 », « 2 tiers de 12 », « racine carrée de 16 ».
- « je sais pas » n'est jamais accepté en rédaction libre ; le « Je retiens » recopié l'est toujours.
- Plus aucun défi dominé par un seul type jusqu'au CM1.
- Tous les « À quoi ça sert ? » existent en CM2.

## Angles morts de la demande, comblés dans cet audit

1. **L'année en cours, pas tout le passé.** Les audits précédents mesuraient tout ce qui est en dessous du niveau de l'enfant. Pour les grands, ce qui compte est l'année en cours : nouvelle option `--annee`.
2. **La correction de l'écrit.** Jamais testée jusqu'ici : `npm run audit:libre`.
3. **La couverture du programme.** Un audit de clarté ne voit pas ce qui manque. Le comptage des leçons par classe montre l'anglais et le collège.
4. **Le niveau des leçons.** Une leçon mal classée n'est jamais proposée au bon enfant, même si elle est parfaite.
5. **Âge et classe.** Vérifié dans le code : 33 règles sur 41 regardent l'âge.
6. **Les notations des grands à l'oral** (chimie, chiffres romains, géométrie, unités composées).
7. **L'image de soi à 11-12 ans** : ce que montre l'écran à un collégien.
8. **Le téléphone** : formules et tableaux à 375 px.
9. **Les vrais enfants** : seule validation qui compte, protocole `docs/protocole-test-enfants.html`. Pour les 11-12 ans, l'observer seul, sans adulte à côté.

## Corrections proposées

| Priorité | Correction | Effort |
|---|---|---|
| 1 | **Anglais du CM1 à la 5ᵉ** : un monde par année (au moins 6 leçons chacun : se présenter, la famille, l'école, les loisirs, la ville, raconter au passé), avec écoute, relier, ranger, mot à écrire. | Important (rédaction) |
| 2 | **Rédaction libre** : tolérer une lettre en trop, en moins ou échangée dans les mots de 6 lettres et plus ; exiger une vraie phrase (au moins 5 mots, dont un verbe ou « c'est ») ; une liste de mots-clés reçoit « Fais une phrase avec ces idées ». | Moyen |
| 3 | **Marche 8 → 9 ans** : à 9 ans, un seul « mot qui manque » par défi et une rédaction libre un défi sur trois ; la rédaction complète à partir de 10 ans. Toutes ces règles basées sur la classe choisie, pas l'âge. | Faible |
| 4 | **Niveau des leçons** : champ `classe:` facultatif dans une leçon, prioritaire sur le calcul par position. Le poser sur les leçons de collège mal placées (relatifs, priorités, nombres premiers, probabilités). | Faible |
| 5 | **Voix** : formules chimiques (indices), chiffres romains suivis de ᵉ ou après « chapitre », « siècle », « Louis »…, ⊥, ∥, « m³/cm³ » (« mètre cube »), « km/h », « / » entre lettres (« divisé par »). | Faible |
| 6 | **Âge → classe** : remplacer les 33 usages de l'âge par l'âge scolaire (`ageScolaire`). | Faible |
| 7 | **Indice pendant le test** : le masquer dans la carte des talents. | Faible |
| 8 | **Image du collégien** : afficher le cycle de l'enfant (pas « Les Graines ») sous chaque planète ; ambiance épurée dès la 6ᵉ. | Faible |
| 9 | **Écrans longs** : couper à 70 mots les écrans des mondes de collège ; contrôle du build correspondant. | Faible |
| 10 | **Variété en 6ᵉ et 5ᵉ** : un exercice d'un autre type dans les 17 leçons qui n'ont presque que des calculs. | Moyen |
| 11 | **Collège** : symétrie centrale ; compléter la 6ᵉ et la 5ᵉ en maths et en sciences pour arriver à environ 15 leçons par année. | Important (rédaction) |
| 12 | **Restes de rédaction** : 8 « À quoi ça sert ? » manquants, ceux de 9-10 ans loin de l'enfant, astuces de plus de 25 mots à 9-10 ans, corrections sans pourquoi. | Moyen |

Mesures de référence (`npm run audit:7ans -- --age N --annee`, `npm run audit:consignes -- N`, `npm run audit:voix -- N`, `npm run audit:domines -- N`, `npm run audit:libre -- N`) : voir les tableaux ci-dessus.

## Corrections livrées (2.12.0 et 2.13.0)

Les 12 corrections sont faites. Mesures refaites avec les mêmes scripts (année en cours).

| Mesure | Avant | Après |
|---|---|---|
| Leçons d'anglais du CM1 à la 5ᵉ | 0 | 24 (4 mondes de 6 leçons) |
| Bonne réponse avec des fautes acceptée (rédaction libre) | 67 à 78 % | 93 à 100 % |
| Liste de mots-clés acceptée | 100 % | 0 à 4 % |
| Leçons de maths de l'année, 6ᵉ / 5ᵉ | 13 / 10 | 15 / 15 |
| Leçons de sciences de l'année, 6ᵉ / 5ᵉ | 12 / 8 | 14 / 11 |
| Écran de cours le plus long, 10 à 12 ans | 104 à 119 mots | 69 à 76 mots |
| Défis dominés par un seul type, 11 / 12 ans | 21 % / 16 % | 0 % / 0 % |
| « À quoi ça sert ? » manquants (année) | 8 | 0 |
| Astuce la plus longue à 9-10 ans | 32 mots | 27 mots |

1. **Anglais** : 4 mondes (Baie des Familles en CM1, Île du Quotidien en CM2, Détroit du Présent en 6ᵉ, Côte du Passé en 5ᵉ), chacun avec écoute, relier, phrases à remettre dans l'ordre, mot à écrire ; chapitres d'histoire, Livre II et Gardien du collège (« le Brouillard des Temps »).
2. **Rédaction libre** (`gen.ts`) : une lettre oubliée, ajoutée ou échangée est tolérée dès 6 lettres (deux dès 13), avec la même première lettre ; une réponse doit être une phrase (au moins 4 mots dont 2 qui ne sont pas des mots-clés), sauf si le « Je retiens » est lui-même une liste.
3. **Marche 8 → 9 ans** : `optionsEcrit(enfant)` décide, selon la classe, de l'écriture dans les défis (CM1 : un « mot qui manque » et une rédaction un défi sur trois ; tout dès le CM2).
4. **Niveau des leçons** : champ `classe:` dans une leçon, prioritaire sur la position dans le monde (et ignoré dans la répartition des autres). Posé sur relatifs, priorités, nombres premiers, probabilités, cœur et sang, propagation du son, et les nouvelles leçons.
5. **Voix** : formules chimiques, chiffres romains, ⊥ et ∥, m² et m³ accordés, km/h, « / » entre lettres, \% ; correctif des unités devant une lettre accentuée.
6. **Âge → classe** : 33 règles passées à `ageScolaire`.
7. **Indice** masqué pendant la carte des talents.
8. **Collégiens** : la Galaxie affiche l'étape de l'enfant (plus « Les Graines » en 5ᵉ) ; ambiance épurée dès la 6ᵉ.
9. **Écrans** coupés à 70 mots du CM1 à la 3ᵉ ; le build refuse un écran de plus de 90 mots dans ces mondes.
10. **Variété** : 38 exercices ajoutés dans 19 leçons ; dans un défi, aucun type au-delà de la moitié.
11. **Collège** : 6 leçons nouvelles (symétrie axiale, fraction-quotient, symétrie centrale, chaînes d'énergie, érosion, mélanges et corps purs) et 2 leçons reclassées en 5ᵉ.
12. **Textes** : 22 « À quoi ça sert ? » écrits ou réécrits, 16 astuces raccourcies, 6 corrections de décimaux avec la méthode.

Restent ouverts :
- les « À quoi ça sert ? » de 11-12 ans signalés comme loin de l'enfant : à cet âge, citer des métiers et le monde réel est voulu ;
- 2 leçons d'accords à 9 ans où le « mot à écrire » domine (2 % des défis) ;
- le test avec de vrais enfants.
