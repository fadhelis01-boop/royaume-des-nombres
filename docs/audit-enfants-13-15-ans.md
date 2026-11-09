# Audit « 13, 14 et 15 ans » : comprendre ce qu'on demande, les réponses, « À quoi ça sert ? »

Date : 9 novembre 2026 · version auditée : 2.13.0 · aucune correction de cet audit appliquée à ce stade

Même méthode que les audits précédents (7, 8, puis 9 à 12 ans), pour un élève de 4ᵉ (13 ans), de 3ᵉ (14 ans, année du brevet) et de 2nde (15 ans), en novembre.

## Méthode

1. **Parcours joué dans l'application** avec un profil de 15 ans en 2nde : Galaxie, carte des talents en maths jusqu'au bout, leçon « Les fonctions affines ». Les profils de 13 et 14 ans ont été vérifiés par les mesures et le code.
2. **Tout ce que l'élève lit ou entend dans les leçons de son année** : `npm run audit:7ans -- --age 14 --annee --exemples --tout`, avec 620 à 720 défis simulés par âge.
3. **Test de niveau simulé** 400 fois par âge (`npm run audit:consignes -- 14`). Le script affiche désormais la vraie classe (6ᵉ, 4ᵉ, 2nde…) au lieu de « CM2+ ».
4. **Voix** : toutes les leçons du niveau (`npm run audit:voix -- 14`), plus 16 notations de 4ᵉ à 2nde testées une à une.
5. **Variété des défis** (`npm run audit:domines -- 14`) et **correction de la rédaction libre** (`npm run audit:libre -- 14`).
6. **Couverture** : leçons par classe et par planète, place des leçons du brevet dans l'échelle des niveaux.

## Ce que vit l'élève, par âge

| | 13 ans (4ᵉ) | 14 ans (3ᵉ) | 15 ans (2nde) |
|---|---|---|---|
| Test de niveau | 8 îles, 24 questions | 8 îles, 24 questions | 8 îles, 24 questions |
| Questions de l'année en cours ou de l'année d'avant | 42 % (5ᵉ + 4ᵉ) | 46 % (4ᵉ + 3ᵉ) | 43 % (3ᵉ + 2nde) |
| Questions de CM1-CM2 (ou avant) | 38 % | 26 % | 24 % |
| Mots par écran de cours (année) | 43 (max 73) | 46 (max 79) | 45 (max 81) |
| Défis avec rédaction ou « mot qui manque » | 50 % | 42 % | 29 % |
| Défis dominés par un seul type | 19 % | 11 % | 19 % |
| Corrections sans pourquoi | 21 % | 17 % | 15 % |
| Rédaction libre : bonne réponse avec fautes acceptée | 94 % | 100 % | 100 % |
| Leçons de maths de l'année | 13 | 10 | 15 |
| Leçons d'anglais de l'année | 0 | 0 | 0 |
| Étape affichée sur la Galaxie | Explorateurs | Explorateurs | Maîtres (anglais : « Graines ») |

## Constats, du plus grave au moins grave

### 1. Le programme du brevet est mal rangé dans les niveaux (bloquant pour la 3ᵉ)

Le niveau de chaque leçon est encore déduit de sa place dans le monde (seules 12 leçons ont une classe indiquée). Pour un élève de 3ᵉ :

- **Les fonctions linéaires** et **Les fonctions affines** (cœur du brevet) sont classées **2nde** : elles n'entrent pas dans son année.
- À l'inverse, des leçons de 4ᵉ ou de 5ᵉ sont classées 3ᵉ ou 2nde :
  - les équations, « Puissances de 10 et notation scientifique », racines carrées, règles sur les puissances, « Mettre un problème en équation » ;
  - en 4ᵉ : « Médiane et étendue », « Comparer des relatifs », « Se repérer dans le plan », alors qu'elles sont de 5ᵉ.

Le parcours d'un élève de 3ᵉ mélange donc des révisions de 4ᵉ et oublie une partie de son année.

### 2. L'anglais s'arrête en 5ᵉ (bloquant)

Il n'y a aucune leçon d'anglais pour la 4ᵉ, la 3ᵉ ni la 2nde. Pour un lycéen, la planète Anglais affiche même « 🌱 Les Graines : 0/3 mondes ».

### 3. Le test de niveau perd du temps sur l'école primaire (important)

- Les îles « Le calcul » et « Les mesures » s'arrêtent au CM2. Un élève de 4ᵉ à 2nde y répond quand même à 6 questions sur 24. Exemples : « La grande aiguille est sur le 7 », « 6 × 12 ».
- 24 questions au total, c'est long pour une mesure dont un quart est sans intérêt à cet âge.
- **Défaut :** la même question (« Négation de "il pleut ET il fait froid" ») est revenue **trois fois de suite** dans l'île « Problèmes et logique ». Le test retire la même leçon et la même variante quand il ne peut ni monter ni descendre.

### 4. La question arrive avant le cours (important)

Dans « Les fonctions affines », l'ordre est : scène, « À quoi ça sert ? », graphique, puis une question demandant le coefficient directeur à partir de f(1) = 3 et f(6) = 28. Le texte qui explique comment le calculer ne vient qu'après. La règle « pas de question avant l'explication » ne bloque la question que juste avant un schéma ou un exemple, pas avant le premier texte.

### 5. La voix lit mal les notations de 4ᵉ à 2nde (important)

| Écrit | Lu aujourd'hui | Attendu |
|---|---|---|
| Fe²⁺ | « Fe au carré ⁺ » | « Fe 2 plus » |
| OH⁻, Na⁺ | « OH⁻ », « Na⁺ » | « O H moins », « N a plus » |
| 10⁸, 10⁻³ (hors formule) | « 10⁸ » | « 10 puissance 8 » |
| f : x ↦ 2x + 3 | « f : x 2x plus 3 » | « f qui à x associe 2x plus 3 » |
| ‖u‖ | « \, vecteur u \, » | « norme du vecteur u » |
| ΔABC | « δabc » (mis en minuscules) | « le triangle A B C » |
| (< 90°) | « < » | « moins de 90 degrés » |
| f(x) | « f(x) » | « f de x » |
| Un vecteur $\overrightarrow{AB}$ | « Un vecteur vecteur AB » | « Un vecteur AB » |
| XX, XY | « XX », « XY » | « X X », « X Y » |

### 6. Sciences de 3ᵉ très minces, et rien pour certaines épreuves du brevet (important)

- Leçons de l'année en 3ᵉ :
  - biologie 1, chimie 1, Terre et Univers 1 ;
  - physique 4 ;
  - en 4ᵉ, Terre et Univers n'a qu'une leçon.
- Le brevet comporte une épreuve de sciences (deux disciplines parmi physique-chimie, SVT et technologie) : la technologie n'existe pas dans l'application.
- **Histoire-géographie et EMC** (une épreuve écrite du brevet) n'ont aucune planète.
- **Dictée** (épreuve de français du brevet) : les mondes de français qui vont jusqu'en 4ᵉ-3ᵉ ne comptent que 6 dictées, et aucune dans « L'Atelier de l'écrivain » ni « Le Port des phrases ».

### 7. Des défis faits presque que de calculs (à améliorer)

19 % des défis à 13 ans, 11 % à 14 ans et 19 % à 15 ans sont faits à plus de moitié d'un seul type. Ce sont surtout les leçons de calcul littéral, de puissances, d'équations et de chimie quantitative (7, 11 puis 17 leçons).

### 8. Le ton et l'image pour un adolescent (à améliorer)

- Le test parle de « petites questions » et rassure : « Ce n'est PAS une interro ». C'est utile à 8 ans ; à 15 ans, un ton plus direct conviendrait : « 24 questions pour régler ton parcours ».
- « Explique à Zéro » (« Zéro n'a pas tout suivi… ») reste formulé pour un enfant.
- L'ambiance épurée et l'étape « Maîtres » sont bien en place.

### 9. Restes de rédaction (à améliorer)

- « À quoi ça sert ? » : 94 à 97 % contiennent une phrase de plus de 12 mots. À cet âge, ce n'est pas gênant. Les exemples du monde réel (tarifs, conversions, batterie) sont pertinents ; le filtre « monde de l'enfant » ne s'applique plus.
- Corrections sans pourquoi : 15 à 21 %, surtout des réponses chiffrées (« X cm³ », « N m² »).
- Écran de cours le plus long : 81 mots, sous la limite de 90 mots fixée pour ces mondes. Mais 35 à 46 % des écrans contiennent des symboles ou formules : la lecture à voix haute compte beaucoup (constat 5).

## Ce qui marche bien

- La rédaction libre est bien corrigée : 94 à 100 % des bonnes réponses avec fautes acceptées, les listes de mots-clés refusées (0 à 6 %).
- Les étapes « Explorateurs » et « Maîtres » et le décor épuré sont en place.
- Les leçons de 2nde en maths sont nombreuses : 15 leçons de l'année, dont vecteurs, inéquations, statistiques et logique.
- Les situations concrètes des « À quoi ça sert ? » sont bonnes (taxi, °C → °F, forfaits).
- Les formules simples sont bien lues : « x au carré plus 3x moins 4 », « 2,5 fois 10 puissance moins 3 ».

## Angles morts de la demande, comblés dans cet audit

1. **Le brevet.** La 3ᵉ n'est pas une année comme les autres. J'ai vérifié la place des notions du brevet et les épreuves qui manquent : histoire-géographie, technologie, dictée.
2. **Ce que le test sait déjà.** À 13-15 ans, il est inutile de tester ce qui s'arrête au CM2.
3. **Les répétitions dans le test** (même question trois fois).
4. **Les notations du lycée à l'oral** : ions, puissances, fonctions, vecteurs.
5. **Le ton** pour un adolescent.
6. **Le script de mesure lui-même**, qui ne savait pas nommer les classes au-delà du CM2. C'est corrigé.
7. **Les vrais élèves** : le protocole `docs/protocole-test-enfants.html` reste la seule validation. À 14-15 ans, demander aussi à l'élève s'il recommanderait l'application à un camarade.

## Corrections proposées

| Priorité | Correction | Effort |
|---|---|---|
| 1 | **Classe des leçons de collège et de 2nde** : poser `classe:` sur toutes les leçons des mondes de maths de la 5ᵉ à la 2nde (fonctions linéaires et affines en 3ᵉ, équations et puissances en 4ᵉ, médiane, relatifs et repérage en 5ᵉ…), puis en sciences et en français. | Moyen |
| 2 | **Anglais 4ᵉ, 3ᵉ, 2nde** : 3 mondes de 6 leçons (present perfect, modaux, conditionnel, voix passive, discours rapporté, compréhension de documents). | Important (rédaction) |
| 3 | **Test pour les grands** : ne pas visiter les îles qui s'arrêtent plus d'un an avant le niveau de l'élève (calcul, mesures dès la 5ᵉ) ; ne jamais reposer la même question dans une île. | Faible |
| 4 | **Pas de question avant le premier texte du cours** (tous âges). | Faible |
| 5 | **Voix** : ions et exposants hors formule, ↦, ‖ ‖, Δ, « < » entre parenthèses, f(x), « vecteur » en double, sigles de chromosomes. | Faible |
| 6 | **Brevet** : dictées dans les mondes de français de 4ᵉ-3ᵉ ; 3 à 4 leçons de sciences de 3ᵉ (SVT, chimie, Terre et Univers) ; décider s'il faut une planète Histoire-géographie et EMC. | Important |
| 7 | **Variété** : un exercice d'un autre type dans les leçons de calcul littéral, puissances, équations et chimie quantitative. | Moyen |
| 8 | **Ton adolescent** : à partir de 13 ans, textes du test plus directs, « Explique à Zéro » reformulé (« Résume la leçon en une phrase »). | Faible |
| 9 | **Corrections chiffrées** : ajouter le calcul ou la règle aux réponses seules (« X cm³ », « N m² »). | Moyen |

Mesures de référence (`npm run audit:7ans -- --age N --annee`, `npm run audit:consignes -- N`, `npm run audit:voix -- N`, `npm run audit:domines -- N`, `npm run audit:libre -- N`) : voir les tableaux ci-dessus.
