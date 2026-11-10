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
- **au-delà de la première année** : l'échelle des niveaux s'arrête à « Supérieur » ; la deuxième et la troisième année, et les disciplines universitaires propres (droit, médecine, économie approfondie…) ne sont pas couvertes ;
- **l'histoire-géographie et les sciences expérimentales du supérieur** restent minces (quelques leçons en physique, chimie, biologie) ;
- **le test avec de vrais étudiants**.
