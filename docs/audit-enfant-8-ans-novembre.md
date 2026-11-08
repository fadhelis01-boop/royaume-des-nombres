# Audit « enfant de 8 ans », deuxième passage : comprendre ce qu'on demande, les réponses, « À quoi ça sert ? »

Date : 9 novembre 2026 · version auditée : 2.10.0 (après les corrections de l'audit « 7 ans ») · aucune correction de cet audit appliquée à ce stade

Le premier audit « 8 ans » (octobre, `audit-enfant-8-ans.md`) portait sur les consignes et le premier test. Celui-ci reprend la méthode complète de l'audit « 7 ans » : tout ce qu'un enfant de 8 ans lit ou entend, les réponses, les corrections, « À quoi ça sert ? », la voix, la fatigue.

## Méthode

1. **Parcours joué dans l'application** par une enfant de 8 ans en CE2, en novembre, sur un téléphone : création du profil (8 ans, CE2), carte des talents en maths jusqu'au bout, parcours proposé, leçons et corrections.
2. **Mesure de tout ce que l'enfant lit ou entend dans les 143 leçons de son niveau** (CP à mi-CE2, toutes planètes, hors « astuces ») : `npm run audit:7ans -- --age 8 --exemples --tout`. Le script simule aussi 2 860 défis tels qu'ils sont tirés aujourd'hui.
3. **Simulation du test** : 400 passages (`npm run audit:consignes -- 8`).
4. **Ce que dit la voix** : chaque texte des 143 leçons passé dans la synthèse vocale (`npm run audit:voix -- 8`, nouveau script), et longueur des leçons.

## Ce que vit l'enfant, écran par écran

| Écran | Ce qu'elle voit ou entend | Ce qu'elle comprend |
|---|---|---|
| Création du profil | Âge, puis classe (CE2 présélectionné). Mode « lit avec un peu d'aide » par défaut. | Clair. |
| Accueil du test | « On va visiter 6 îles. Sur chaque île, 2 petites questions. » Îles : Les nombres, Calculer, Partager en parts, Réfléchir et chercher, Les formes, Mesurer. « Tu m'entends ? » une seule fois. | Clair. Les noms d'îles se comprennent. |
| Questions du test | « Quel nombre est juste après 155 ? », « Combien en reste-t-il ? », « Le gâteau est coupé en 10 parts égales. Chaque part, c'est… », « Quel élément vient ensuite ? », « Combien de millimètres dans 6 cm ? » | « élément » arrête la lecture. Les millimètres ne sont pas encore vus en novembre de CE2. |
| Fin du test (tout en « Je ne sais pas encore ») | Carte : « Les nombres niveau GS », les autres îles « on commence · à découvrir 🌱 ». | Le message est doux. |
| Parcours | 1ʳᵉ étape « 🐣 Compter un par un, en touchant », puis 13 étapes marquées « 🔁 à revoir ». | À 8 ans, une leçon de grande section avec un poussin vexe. « À revoir » pour des leçons jamais faites intrigue. |
| Leçon et défi | Scène, « À quoi ça sert ? », cours, schéma, questions, défi sans rédaction. | Plus fluide qu'en octobre. |

## Constats, du plus grave au moins grave

### 1. Un test « bâclé » fait redescendre l'enfant en grande section (important)

Une enfant de 8 ans qui touche « Je ne sais pas encore » partout, par fatigue ou par jeu, reçoit un parcours qui commence au niveau GS (« Compter un par un, en touchant ») et 14 étapes de CP. Rien ne distingue « ne sait pas » de « n'a pas voulu ». À 8 ans, cette situation n'est pas rare, et un parcours trop facile décourage autant qu'un parcours trop dur.

### 2. Certaines îles n'ont pas de « bas » adapté (important)

L'île « Mesurer » n'a qu'un monde, qui va du CE1 au CE2. Même en descendant après une erreur, la question suivante reste de CE2 (« Combien de millimètres dans 6 cm ? »). Sur 400 tests simulés : CE1 63 %, CE2 30 %, CP 7 % des questions. Pour un test passé en novembre, la part de CE2 reste élevée.

### 3. « À quoi ça sert ? » des leçons de CE2 : encore abstrait (important)

Les leçons du CP et du CE1 ont été réécrites. Celles du CE2 ne l'ont pas été :

- 2 manquants : `fr-vallee-des-verbes/present-premier-groupe`, `ph-sentier-des-mesures/mesurer-longueurs-temps` ;
- 3 qui citent des métiers d'adultes (symétrie : « les architectes » ; Fibonacci ; logique : « les médecins, les programmeurs ») ;
- 33 qui ne parlent pas du monde de l'enfant, par exemple « Le budget d'une sortie… », « Comparer la taille de deux appartements (en m²) », « Les marais salants de Guérande… », « une faute que les correcteurs repèrent immédiatement » ;
- 73 % contiennent une phrase de plus de 12 mots.

### 4. Les astuces et corrections du CE2 utilisent des mots qu'on n'explique pas (à améliorer)

48 astuces ou corrections contiennent un mot difficile : opération, quadrilatère, sommets, verticalement, identique, méthode, unité. Une partie est le vocabulaire de la leçon (normal), une autre non (« méthode », « identique », « verticalement »). 32 astuces dépassent 25 mots, alors qu'elles servent aussi d'indice après une erreur.

### 5. Les corrections donnent encore la réponse sans le pourquoi (à améliorer)

24 % des 731 corrections ne disent que la réponse. Une bonne part vient des exercices générés (« Le mot qui manquait : … », listes « question → réponse ») ; avant 9 ans, les premiers ne sont plus tirés. Restent les corrections de maths du CE2 sans étape intermédiaire.

### 6. Défis : moins d'écriture, mais parfois un seul type de question (à améliorer)

Sur 2 860 défis simulés : aucune rédaction ni « mot qui manque » (0 %, contre 68 % avant la 2.10), 25 % avec au moins une écriture (mot, dictée), 36 % de questions à choix. En revanche, 29 % des défis sont faits à plus de moitié d'un seul type, surtout des leçons de maths où tout se répond par un nombre.

### 7. Ce que dit la voix (corrigé pendant l'audit)

Avant correction, 131 textes contenaient des mots en MAJUSCULES d'insistance (« CETTE leçon », « COMPRENDRE, CHERCHER, CALCULER, VÉRIFIER ») que certaines voix épellent, et une formule était lue « array l arrow numérateur ». Corrigé dans la 2.10.0 : les mots d'insistance sont lus normalement, les tableaux de formules ne gardent que les mots. Il ne reste que des sigles volontaires (BD, GN).

### 8. Détails relevés en passant

- « Quel élément vient ensuite ? » (île « Réfléchir et chercher ») : tirée dans presque un test sur deux, avec le mot « élément ».
- Parcours : les leçons d'un domaine « à découvrir » sont marquées « 🔁 à revoir » au lieu de « 🌟 nouveau ».
- Leçons : médiane de 9 écrans, maximum 13 ; 5 leçons dépassent 12 écrans. Le plafond de 3 questions pendant la leçon ne s'applique qu'aux mondes « Graines ».
- Texte de lecture le plus long : la fable « Le Corbeau et le Renard » (140 mots sur un écran). C'est le texte étudié, il est lu à voix haute en mode « avec un peu d'aide » ; le couper en deux strophes aiderait quand même.

## Ce qui marche bien

- Le test tient en 12 questions, avec des pauses, des noms d'îles compréhensibles et la vérification du son.
- Aucun défi ne demande plus de rédiger de mémoire.
- « À quoi ça sert ? » arrive avant le cours, juste après la scène.
- Les corrections des blocs expliquent l'erreur ; la bonne réponse n'est affichée qu'une fois.
- Le bouton 🎤 « Dis-le » permet de répondre aux questions de nombres sans taper.
- La barre du haut s'explique quand on touche ⭐ ou 📅.

## Angles morts de la demande, comblés dans cet audit

1. **La différence entre 7 et 8 ans.** À 8 ans, beaucoup d'enfants lisent seuls. Aujourd'hui, toute enfant de 8 ans est traitée comme une lectrice débutante (pas de « mot qui manque » dans les défis), même si le parent a choisi « lit tout seul ». Le programme de CE2 attend pourtant de courtes réponses écrites.
2. **La motivation à l'envers.** À 8 ans, un exercice « de bébé » vexe autant qu'un exercice trop dur décourage (constat 1). Le poussin 🐣 de la première étape accentue l'effet.
3. **Le test bâclé.** Rien ne repère un test fait en appuyant toujours sur le même bouton (constat 1).
4. **Les îles sans marche basse.** Le test descend, mais pas sous le début d'une île (constat 2).
5. **La voix, texte par texte.** Mesurée pour la première fois sur toutes les leçons du niveau (constat 7), ce qui a révélé les majuscules et les formules.
6. **La fatigue.** Mesurée en nombre d'écrans (constat 8).
7. **Les vrais enfants.** Toujours la seule validation qui compte : protocole `docs/protocole-test-enfants.html`.

## Corrections proposées

| Priorité | Correction | Effort |
|---|---|---|
| 1 | **Test bâclé** : si plus des deux tiers des réponses sont « Je ne sais pas encore », proposer « On refait la carte avec un adulte ? » et, en attendant, ne pas descendre le parcours sous la classe précédente (niveau du moment − 1,5). | Faible |
| 2 | **Îles sans marche basse** : à 8 ans en début d'année, ne pas tester une île qui commence au niveau du moment (ou lui poser une seule question), comme pour les 7 ans. | Faible |
| 3 | **Lectrices à l'aise** : à 8 ans avec « lit tout seul », autoriser un « mot qui manque » par défi (jamais la rédaction libre). | Faible |
| 4 | **« À quoi ça sert ? » du CE2** : écrire les 2 manquants, réécrire les 3 « métiers d'adultes » et les 33 abstraits ; étendre le contrôle du build aux mondes du CE2 (45 mots par écran, 40 pour les autres textes). | Moyen (rédaction) |
| 5 | **Mots** : « Qu'est-ce qui vient ensuite ? » ; remplacer « méthode », « identique », « verticalement » dans les astuces et corrections, ou les déclarer dans `mots:` ; raccourcir les 32 astuces de plus de 25 mots. | Moyen |
| 6 | **Parcours** : « 🌟 nouveau » pour les leçons d'un domaine jamais commencé ; pas de poussin 🐣 après 7 ans. | Faible |
| 7 | **Variété des défis de maths** : une manipulation (ligne des nombres, blocs) dans les leçons qui n'ont que des réponses en nombre. | Moyen |
| 8 | **Corrections de maths du CE2** : ajouter une étape intermédiaire aux corrections qui ne donnent que le résultat. | Moyen |

Mesures de référence (`npm run audit:7ans -- --age 8`, `npm run audit:consignes -- 8`, `npm run audit:voix -- 8`) :

- **Test** : CP 7 %, CE1 63 %, CE2 30 % des questions ; 8,6 mots par consigne ; 24 % avec du vocabulaire scolaire.
- **Défis** : 0 % de rédaction, 25 % avec une écriture, 29 % dominés par un seul type.
- **Textes** : 28 mots par écran de cours ; astuces de 22 mots en moyenne, 32 au-delà de 25.
- **Explications** : 24 % de corrections sans pourquoi ; « À quoi ça sert ? » : 2 manquants, 3 adultes, 33 hors du monde de l'enfant.
- **Voix** : plus aucun mot d'insistance en majuscules ni balise de formule lue.
