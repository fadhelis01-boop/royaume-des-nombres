# Audit « supérieur » : un étudiant de 18 à 20 ans

Date : 10 novembre 2026 · version auditée : 2.22.0 · corrections livrées : 2.23.0 (même jour, voir en fin de document)

Même méthode que les audits précédents, pour un étudiant de première année du supérieur (licence, classe préparatoire, BUT, BTS, école), en novembre, qui choisit la classe « Supérieur » à la création du profil.

## Méthode

1. **Parcours joué dans l'application** avec un profil « 18 ans et plus, Supérieur » : création du profil, Galaxie, accueil, test de niveau, leçons.
2. **Couverture** : nombre de leçons de niveau « supérieur » (niveau 13 sur l'échelle des classes) par planète, hors spécialités facultatives.
3. **Parcours simulé** pour un étudiant qui réussit le test (niveau estimé 11,5 et 12,5) : combien d'étapes, combien de leçons nouvelles.
4. **Test de niveau simulé** 400 fois (`npm run audit:consignes -- 19`).
5. **Voix** (`audit:voix -- 19` et relecture des formules du supérieur), **variété** (`audit:domines -- 19`), **rédaction libre** (`audit:libre -- 19`).

## Constats (version 2.22.0)

### 1. Presque rien de nouveau pour un étudiant (bloquant)

Seulement **14 leçons** de niveau supérieur, et **aucune** en maths, français, langues, histoire-géographie ou philosophie (elles étaient en biologie, chimie, physique, musique et dessin).

Parcours simulé d'un bon étudiant (niveau estimé 12,5) : en maths, 8 étapes dont **0 nouvelle** ; en français, 5 dont 0 ; en anglais, en histoire et en philosophie, une seule étape, déjà vue. L'application ne lui proposait que des révisions de Terminale.

### 2. Le test de niveau s'arrêtait à la Terminale (bloquant)

Les quatre îles du test de maths plafonnaient au niveau Terminale : impossible de placer un étudiant au-delà, et 70 % des questions portaient sur le programme de Terminale.

### 3. Rien sur les méthodes du supérieur (important)

Aucune leçon sur ce qui change le plus après le bac : prendre des notes en cours magistral, organiser son travail personnel, chercher et citer ses sources (plagiat, intelligence artificielle), écrire à un enseignant, faire un exposé, lire un article scientifique.

### 4. Voix : des formules du supérieur mal lues, et des bugs qui touchaient aussi le lycée (important)

- `\lim\limits_{n \to +\infty}` était lu « limite limite its indice n tend vers… » (déjà présent dans les leçons de Terminale).
- Les quantificateurs (« pour tout », « il existe »), epsilon, la valeur absolue, le noyau, la dimension, f prime, y seconde, le petit o étaient ignorés ou mal lus.
- Un tiret entre deux mots, très fréquent dans les titres (« Narrative tenses - les temps du récit »), était lu « moins » : 160 passages concernés dans toute l'application.
- « ⇒ » n'était pas lu ; « 2! » n'était pas lu « factorielle 2 ».

### 5. Ce qui allait déjà bien

- 0 % de défis dominés par un seul type de question à 18 et 19 ans.
- Rédaction libre correctement corrigée.
- Ton direct (dès 13 ans), décor épuré, classe « Supérieur » proposée à 18 ans.

## Angles morts de la demande, comblés dans cet audit

1. **« Supérieur » recouvre des réalités très différentes** (licence, prépa, BUT, BTS, écoles) : on vise le **socle commun de première année**, pas une discipline de spécialité universitaire.
2. **Le passage du lycée au supérieur est d'abord un changement de méthodes** (autonomie, cours magistraux, sources), pas seulement de contenus.
3. **La langue de la recherche est l'anglais** : lire un résumé d'article, écrire un essai, présenter en anglais.
4. **La voix lit aussi les formules** : les notations du supérieur devaient être vérifiées une par une.

## Corrections livrées (2.23.0)

| Mesure | Avant (2.22.0) | Après (2.23.0) |
|---|---|---|
| Leçons de niveau supérieur (hors spécialités) | 14 | 33 |
| … en maths / français / anglais / philosophie | 0 / 0 / 0 / 0 | 6 / 6 / 4 / 3 |
| Parcours d'un bon étudiant, leçons nouvelles en maths | 0 | 5 |
| Test de niveau : questions de niveau supérieur | 0 % | 8 % |
| Passages avec un tiret lu « moins » à tort | 160 | 0 |

1. **Maths** : monde **L'Université des Nombres** (6 leçons, intégré au domaine « Algèbre et fonctions », donc au test et au parcours) : limite en epsilon, continuité et théorème des valeurs intermédiaires, développements limités, espaces vectoriels et théorème du rang, équations différentielles du second ordre, variables aléatoires et loi normale.
2. **Méthodes** : monde **L'Amphithéâtre des Méthodes** (planète Français, 6 leçons, domaine « Vocabulaire et écriture ») : prise de notes en cours magistral, organiser son travail et réviser (récupération active, répétition espacée), chercher et citer ses sources (plagiat, IA), écrire à un enseignant, exposé et soutenance, lire un article scientifique.
3. **Anglais** : monde **Le Campus international** (4 leçons, niveau C1) : academic essay, lire la recherche, présenter en anglais, courriels, CV et lettre.
4. **Philosophie** : monde **Le Portique des Sages** (3 leçons) : argumenter juste et repérer les sophismes, philosophie des sciences (Popper, Kuhn), éthique appliquée (utilitarisme, Kant, Aristote ; IA, bioéthique).
5. **Voix** : limites avec bornes, quantificateurs, epsilon, valeur absolue, noyau, dimension, image, prime et seconde, petit o, ℝ², factorielle, ⇒ ; tiret de titre lu comme une pause. Sept nouveaux cas de test.
6. Vérifié : 147 tests unitaires, contrôle du contenu sans erreur, 0 défi dominé à 18 et 19 ans, leçons et défis des quatre mondes ouverts dans le navigateur avec un profil « Supérieur » (16 formules affichées, aucune erreur de rendu), console sans erreur.

Restent ouverts :
- **au-delà de la première année** : deuxième et troisième année ajoutées en 2.24.0 (voir ci-dessous) ; les disciplines universitaires propres (droit, médecine, économie approfondie…) ne sont pas couvertes ;
- **l'histoire-géographie et les sciences expérimentales du supérieur** restent minces (quelques leçons en physique, chimie, biologie) ;
- **le test avec de vrais étudiants**.

## Deuxième et troisième année (2.24.0)

### Constats avant correction

- L'**échelle des niveaux s'arrêtait à « Supérieur »** (niveau 13) : la classe d'un étudiant de L2 ou L3 ne pouvait pas être indiquée, le test et le parcours plafonnaient à la première année.
- **Aucune leçon** au-delà de la première année.
- **Espace parents** : la liste des classes s'arrêtait à « Terminale » (même « Supérieur » n'y figurait pas).
- **Voix** : les sommes et intégrales avec bornes étaient lues « puissance » (« somme indice n égale 0 puissance plus l'infini »), la dérivée partielle « f sur x », et le gradient, la flèche d'affectation, η, le déterminant, la trace et « n puissance α » n'étaient pas lus.

### Corrections

| Mesure | Avant (2.23.0) | Après (2.24.0) |
|---|---|---|
| Classes proposées après la Terminale | Supérieur | Supérieur, Bac+2, Bac+3 |
| Leçons de niveau Bac+2 / Bac+3 | 0 / 0 | 11 / 7 |
| Test de niveau à 20 ans : questions Bac+2 ou Bac+3 | 0 % | 76 % |
| Parcours d'un étudiant de Bac+2 : leçons de maths nouvelles | 0 | 7 |

1. **Échelle** : « Bac+2 » (14) et « Bac+3 » (15) ajoutés ; proposés à la création du profil (à 18 ans et plus) et dans l'espace parents ; reconnus dans les niveaux des mondes et des leçons.
2. **Maths** : **La Tour de l'Analyse** (séries numériques, diagonalisation, intégrales généralisées, fonctions de plusieurs variables, descente de gradient) et **L'Observatoire des Statistiques** (lois continues, loi des grands nombres et théorème central limite, régression, intervalles de confiance, tests d'hypothèse), intégrés aux domaines du test et du parcours.
3. **Méthodes** : **Le Carrefour des Carrières** (trouver un stage ou une alternance, rapport de stage, mémoire de recherche, entretien d'embauche, préparer le master).
4. **Physique** : **Le Laboratoire des Ondes et de la Chaleur** (thermodynamique, électromagnétisme, analyse de Fourier).
5. **Voix** : sommes et intégrales avec bornes, dérivée partielle, gradient, affectation, déterminant, trace, exposants grecs et négatifs, lettres grecques manquantes (η, ν, ρ, τ, φ…). Test ajouté.
6. Vérifié : 149 tests unitaires, contrôle du contenu sans erreur, 0 défi dominé à 20 et 21 ans ; dans le navigateur, classe « Bac+3 » choisie à la création, enregistrée et visible dans l'espace parents, défis des quatre mondes ouverts, console sans erreur.

Restaient ouverts : les disciplines universitaires propres, la biologie et la chimie de Bac+2 et Bac+3 (traités en 2.25.0, ci-dessous), le master, et le test avec de vrais étudiants.

## Sciences et disciplines universitaires (2.25.0)

1. **Biologie Bac+2/Bac+3** : **Le Laboratoire du Vivant** (cinétique enzymatique et métabolisme, immunologie, génétique des populations et Hardy-Weinberg, évolution moléculaire et phylogénie), dans le parcours de la planète Biologie.
2. **Chimie Bac+2/Bac+3** : **Le Laboratoire des Réactions** (cinétique et Arrhenius, mécanismes SN1 et SN2, spectroscopies IR et RMN, électrochimie), dans le parcours de la planète Chimie.
3. **Disciplines universitaires**, marquées `specialite` (ouvertes sur la carte, hors test et parcours, comme les spécialités du lycée, puisqu'elles dépendent de l'orientation) :
   - **droit** : **La Cour du Droit** (organisation de la justice, Constitution de 1958, syllogisme et commentaire d'arrêt, responsabilité civile, droit européen) ;
   - **économie** : **La Bourse des Économistes** (élasticité-prix, coût marginal, multiplicateur keynésien, avantage comparatif, théorie des jeux) ;
   - **santé** : **L'Hôpital-École** (accès aux études de santé, physiologie cardiovasculaire, pharmacologie, tests diagnostiques) ;
   - **lettres** : **La Bibliothèque des Lettres savantes** (mouvements littéraires, narratologie, linguistique, réception et littérature comparée).
4. **Voix, bug trouvé en relisant** : une fraction dont le numérateur ou le dénominateur contenait un indice ou un exposant entre accolades (« V_max [S] / (K_m + [S]) ») était lue sans « sur ». Les règles des bornes (limites, sommes, intégrales) passent désormais avant les fractions, et les indices et exposants sont lus à l'intérieur des fractions. « E_a / RT » est lu « E a sur RT ». Test ajouté.
5. Un exercice « relier » à deux paires (minimum : trois) a été bloqué par le contrôle du contenu et complété.
6. Vérifié : 150 tests unitaires, contrôle du contenu sans erreur, 0 défi dominé à 19, 20 et 21 ans, défis des six mondes ouverts dans le navigateur avec un profil « Bac+2 », formules affichées sans erreur, console sans erreur.

Restaient ouverts : le master, les autres licences (traitées en 2.26.0, ci-dessous), et le test avec de vrais étudiants.

## Autres licences (2.26.0)

Sept licences ajoutées, en accès libre sur la carte (`specialite`, hors test et parcours) :

| Licence | Monde | Planète | Leçons |
|---|---|---|---|
| Psychologie | Le Cabinet de Psychologie | Philosophie | méthode expérimentale, psychologie cognitive et biais, développement (Piaget) et influence sociale (Asch, Milgram) |
| Sociologie et histoire | L'Atelier des Sciences sociales | Histoire-géo et SES | fondateurs (Durkheim, Weber, Bourdieu), méthodes d'enquête, métier d'historien (périodisation, critique des sources, Annales) |
| Géographie | Le Belvédère du Géographe | Histoire-géo et SES | concepts (territoire, échelle, réseau, centre-périphérie), cartographie et SIG, aménagement et risques |
| LEA | Le Comptoir des Langues appliquées | Langues | commerce international et Incoterms, traduction spécialisée et localisation, négociation interculturelle (Hall, Hofstede) |
| Informatique | La Forge informatique | Maths | complexité (notation O), programmation orientée objet, cryptographie et sécurité |
| STAPS | Le Stade des STAPS | Biologie | filières énergétiques et VO2max, principes de l'entraînement, sport, société et santé |

**Voix, corrections trouvées en relisant** : « 1 cm » était lu « 1 centimètres » (la règle du singulier ne couvrait que les mètres et kilomètres ; elle couvre maintenant aussi centimètres et millimètres, ce qui profite aussi aux leçons des plus jeunes) ; une échelle « 1/25 000 » aurait été lue comme une fraction (« un vingt-cinquième 000 ») : elle est lue « 1 sur 25 000 ». Deux tests ajoutés. Dans le contenu, « 0-2 ans » réécrit « 0 à 2 ans » et « 1/N » réécrit « 1 sur N ».

Vérifié : 152 tests unitaires, contrôle du contenu sans erreur, 0 défi dominé à 19 et 20 ans, défis des six mondes ouverts dans le navigateur avec un profil « Bac+3 », console sans erreur.

Restaient ouverts : le master (traité en 2.27.0, ci-dessous) et le test avec de vrais étudiants.

## Master (2.27.0)

### Constats avant correction

- L'échelle s'arrêtait à « Bac+3 » : un étudiant de master ne pouvait pas indiquer sa classe.
- À « 18 ans et plus », l'écran de création du profil ne proposait que les classes proches de 18 ans (de la 1ʳᵉ au Bac+3) : même avec une échelle étendue, Bac+4 et Bac+5 n'auraient pas été visibles.
- Aucun contenu de niveau master.

### Corrections

1. **Échelle** : « Bac+4 » (16) et « Bac+5 » (17), reconnus aussi sous les formes « M1 » et « M2 » dans les niveaux des leçons. À 18 ans et plus, toutes les classes de la 1ʳᵉ au Bac+5 sont proposées.
2. **Socle commun des masters** (les masters étant spécialisés, on couvre ce que tous partagent) :
   - **Le Laboratoire des Données** (planète Maths, domaine « Données et hasard », donc dans le test et le parcours) : régression multiple, apprentissage automatique et surapprentissage, évaluation d'un classifieur (précision, rappel), réseaux de neurones et limites de l'IA générative ;
   - **Le Cap du Master** (planète Français, domaine « Vocabulaire et écriture ») : mémoire et soutenance, stage de fin d'études et premier contrat, gestion de projet (Gantt, chemin critique, agile), doctorat, science ouverte et intégrité scientifique.
3. **Mesures** : à 22 ans, 81 % des questions du test portent sur Bac+4 et Bac+5 ; un étudiant de master reçoit des leçons nouvelles en maths et en français.
4. Corrigé en relisant : une valeur fausse dans un exercice (somme pondérée d'un neurone : 6 et non 5) ; des barres obliques réécrites en toutes lettres.
5. Vérifié : 153 tests unitaires, contrôle du contenu sans erreur, 0 défi dominé à 21 et 22 ans ; dans le navigateur, classes de la 1ʳᵉ au Bac+5 proposées à 18 ans et plus, « Bac+5 » choisi, défis ouverts, console sans erreur.

Reste ouvert : le test avec de vrais étudiants. Les contenus propres à chaque master (droit des affaires, biologie moléculaire avancée, finance…) restent hors du périmètre d'une application généraliste.
