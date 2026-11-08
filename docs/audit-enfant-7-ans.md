# Audit « enfant de 7 ans » : comprendre ce qu'on demande, les réponses, « À quoi ça sert ? »

Date : 8 novembre 2026 · version auditée : 2.9.1 · aucune correction appliquée à ce stade

## Méthode

1. **Parcours joué dans l'application** par un enfant de 7 ans en CE1, en novembre, sur un téléphone :
   - création du profil, Galaxie, planète Maths ;
   - histoire d'ouverture, carte des talents (12 questions), parcours ;
   - première leçon écran par écran, puis le défi de cette leçon avec des erreurs volontaires.
2. **Mesure de tout ce que l'enfant lit ou entend dans les 88 leçons de son niveau** (CP à mi-CE1, toutes planètes, hors « astuces ») : textes du cours, scènes, « À quoi ça sert ? », astuces et indices, « Je retiens », « Explique à Zéro », choix de QCM, corrections, types d'exercices.
   - Script `scripts/audit-7ans.ts`, à lancer avec `npm run audit:7ans` (ou `npm run audit:7ans -- --exemples` pour voir les cas).
   - L'audit « 8 ans » ne mesurait que les consignes ; celui-ci mesure le reste.
3. **Simulations** :
   - 400 tests de positionnement à 7 ans (`npm run audit:consignes -- 7`) ;
   - 2 640 défis des leçons de son niveau ;
   - passage des textes dans la conversion pour la voix (`src/lib/speech.ts`).

Repère d'âge : en novembre, un enfant de CE1 lit environ 30 à 50 mots par minute. Il connaît les nombres jusqu'à 100 et l'addition, et découvre la soustraction. La multiplication, les fractions, les millimètres et les centilitres viennent plus tard.

## Ce que vit l'enfant, écran par écran

| Moment | Ce qu'il voit ou entend | Ce qui coince |
|---|---|---|
| Création du profil | « Comment t'appelles-tu ? (Un prénom ou un surnom suffit.) » ; âge 7 et CE1 déjà choisis | « surnom suffit » : deux mots qu'il ne lit pas encore. Le reste va bien. |
| Galaxie | « chaque planète est une matière… ta progression est gardée partout » ; cartes de planètes avec phrase d'accroche | Beaucoup de texte et des mots d'adulte (« matière », « progression », « fondamentaux »). L'enfant choisit au dessin, ce qui suffit. |
| Carte de la planète | « 🎨 Couleurs rendues : 0 % » | Le pourcentage ne veut rien dire à 7 ans. |
| Histoire | Courte, racontée, avec un choix « Oui ! Défi accepté ! » | Rien : c'est très bien adapté. |
| Carte des talents | 6 îles : « Fractions et proportions », « Problèmes et logique », « La géométrie », « Les mesures »… | Des noms d'îles qu'il ne comprend pas, et surtout des questions qu'il n'a pas apprises (voir constat 1). |
| Parcours | Étapes marquées « 🧱 pour consolider », « 🛠️ à renforcer », « 🌟 nouveau » ; « La symétrie axiale », « Les contenances (litres) » | Mots abstraits. Le chemin et le gros bouton « Prochaine étape » restent clairs. |
| Première leçon | Scène, puis une question « Construis le nombre 69 » **avant** l'écran qui montre ce qu'est une barre de dix | Il doit répondre avant qu'on lui ait expliqué. |
| « Explique à Zéro » | Trois phrases de 16 mots en moyenne à comparer ; l'une affiche « <** veut dire… », une autre « Devant le nᵉ, il y a n − 1 éléments » | Lecture trop lourde, un bug d'affichage, de l'algèbre. |
| Erreur dans le défi | « Une erreur, c'est ton cerveau qui grandit ! », puis l'indice « …compter 4 paquets et 3 restants (43)… » alors que la question demande 94 | L'indice ne parle pas de sa question. |
| Deuxième erreur | « La bonne réponse était : 94 » puis « 94 = 9 × 10 + 4 » | Le signe × n'est pas encore appris ; on ne lui dit pas ce qui clochait dans sa construction. |

## Constats, du plus grave au moins grave

### 1. La carte des talents interroge sur ce qui n'est pas encore appris (bloquant)

Sur les 12 questions jouées, au moins 7 portaient sur des notions hors CE1 en novembre :
- « Écris en lettres : 100 » ;
- « Quelle multiplication est égale à 5 + 5 + 5 ? » ;
- « Colorie la moitié de la pizza » et « Quel est le quart de 16 ? » ;
- « Quelle est la couleur du 15ᵉ rond ? » (rang et motif qui se répète) ;
- « Le panneau STOP a 8 côtés. C'est un… pentagone / octogone / hexagone / décagone » ;
- « Combien de millimètres dans 8 cm ? » et « 3 bouteilles de 50 cL ».

La simulation sur 400 tests le confirme : **CP 23 %, CE1 57 %, CE2 20 %** des questions. Pour un enfant qui commence son CE1, c'est trop haut. Deux causes dans le code :

- **Le test visite des îles à peine commencées.** Fractions, problèmes, géométrie et mesures ont leurs premières leçons au niveau CE1 ; à 7 ans en novembre, seules les îles « nombres » et « calcul » sont vraiment entamées. Le filtre `domainesATester` compare au niveau de la classe entière, pas au moment de l'année.
- **Le test prend n'importe quel exercice d'une leçon**, y compris ses plus difficiles. Le champ `niveau` (1 à 3) des exercices n'est pas utilisé. Exemple : la leçon « Mesurer des longueurs » est classée CE1, mais l'exercice tiré parle de millimètres.

Le test reste bienveillant (« Celle-là, on l'apprendra ensemble », « Je ne sais pas encore », pause entre les îles). Mais les résultats sont faussés : l'enfant a été classé « pile à ton niveau » en mesures et en géométrie après une seule bonne réponse, et son parcours propose déjà les contenances et la symétrie.

### 2. On lui demande trop souvent d'écrire (bloquant)

- **28 % des exercices de son niveau** demandent d'écrire des lettres (mot, dictée, rappel libre).
- **68 % des défis contiennent un « rappel libre »** : écrire une ou deux phrases sur la leçon, sans la regarder. Cet exercice est généré automatiquement pour 60 des 88 leçons. Il est conçu pour les plus grands : à 7 ans, écrire deux phrases prend plusieurs minutes et l'orthographe bloque, même si elle n'est pas notée. Le micro aide, mais il n'existe pas sur tous les appareils.
- Le défi garantit « au moins un exercice de production » : pour un enfant de 7 ans, c'est presque toujours ce rappel libre ou un mot à écrire.

### 3. Ce qu'il entend ne correspond pas toujours à ce qui est écrit (bloquant pour les non-lecteurs)

À 7 ans, l'application lit tout à voix haute (mode « lit avec un peu d'aide »). La conversion du texte pour la voix fait perdre le sens dans quatre cas :

| Écrit | Entendu |
|---|---|
| « Le motif « 🔴🔵🟢 » se répète. » | « Le motif se répète. » (les émojis disparaissent) |
| « Y a-t-il plus de 🍓 ou de 🍌 ? » | « Y a-t-il plus de ou de ? » |
| « 2 syllabes → lapin » (corrections, listes) | « 2 syllabes, puis lapin » |
| « 4 × ? = 12 » | « 4 fois égale 12 » (le point d'interrogation est muet) |
| « Il est 1ᵉʳ, elle est 2ᵉ. » | non converti : selon l'appareil, « 1 e r » |

6 consignes de son niveau dépendent d'émojis, surtout dans le Nid des Nombres, où les enfants ne lisent pas encore.

### 4. Les écrans de cours sont longs et parfois dans le désordre (important)

- **47 mots par écran de cours en moyenne, jusqu'à 100.** 82 % des écrans ont au moins une phrase de plus de 12 mots. Tout est lu à voix haute, mais 100 mots, c'est près d'une minute d'écoute sans rien faire.
  - Les plus longs : « Les formes de la Lune » (100 mots), « Lumière et ombres » (93), « Les nombres ordinaux » (76), « Les saisons » (74).
  - Les tableaux sont lus ligne à ligne et sonnent mal (« Sens, Organe, Il me permet de… »).
- **Questions avant l'explication.** Les questions « À toi de jouer » sont insérées automatiquement toutes les deux étapes. Dans « Compter vite en faisant des paquets de 10 », la première arrive avant l'écran qui montre une barre de dix.
- **Une colonne « centaines »** est affichée dans les blocs, alors que les centaines viennent plus tard.

### 5. « Explique à Zéro » est trop lourd à lire, avec un bug (important)

- L'enfant doit choisir entre trois phrases de **16 mots en moyenne** (jusqu'à 34) : c'est l'écran le plus lourd à lire.
- Les mauvaises réponses sont les « Je retiens » d'autres leçons, souvent d'un autre niveau :
  - « Devant le nᵉ, il y a n − 1 éléments » ;
  - 19 % de ces phrases contiennent un mot difficile.
- **Bug d'affichage** : le « Je retiens » de la leçon « Comparer et ranger » contient `**<**`, qui s'affiche « <** veut dire « est plus petit que », **> veut dire… ».

### 6. Les corrections donnent la réponse plus qu'elles n'expliquent (important)

- **26 % des corrections** donnent seulement la réponse, sans le pourquoi (« Le mot qui manquait : … », « 💡 À retenir : Poils, plumes, 6 pattes, nageoires. »).
- **Notation pas encore apprise** : « 94 = 9 × 10 + 4 » ; 5 % des corrections utilisent des symboles (×, fractions).
- **Fautes de gabarit** : « 1 barres de dix et 9 petits cubes ».
- **La bonne réponse apparaît deux fois** : dans le message de Lya et dans l'encadré « La bonne réponse ».
- **Aucun retour ciblé dans les manipulations** : avec les blocs, il ne sait pas ce qui ne va pas (« tu as mis 1 cube ; il faut 9 barres et 4 cubes »).
- **Corrections des vrai/faux à ranger** : jusqu'à 62 mots, en liste.

### 7. Les indices sont généraux et longs (important)

- L'indice montré après la première erreur est l'astuce de la leçon : **22 mots en moyenne**, 66 % avec une phrase de plus de 12 mots.
- Il est le même pour toutes les questions de la leçon, et peut citer d'autres nombres que ceux de la question (« 43 » pour une question sur 94).
- Exemples trop longs pour un indice : « Une graine a besoin d'eau, d'air et de chaleur pour germer, mais pas forcément de lumière… » ; « Des repères dans ta main : 1 mm, l'épaisseur d'une carte bancaire ; 1 cm… ».

### 8. « À quoi ça sert ? » : souvent juste, rarement dans son monde à lui (à améliorer)

- **Absent dans 7 leçons sur 88** :
  - Les sons complexes ;
  - Le pluriel avec s ;
  - Chercher dans le dictionnaire ;
  - Silence et son ;
  - Pousser et tirer ;
  - La météo ;
  - Le contour d'un objet.
- **32 sur 81 ne parlent pas du monde d'un enfant de 7 ans** (école, maison, jeux, goûter, copains). Ils citent des adultes ou des situations lointaines :
  - « Les maçons vérifient que les murs sont bien droits… » ;
  - « C'est grâce à cela que les bateaux flottent, même en acier » ;
  - « …une bonbonne fermée pour le gaz » ;
  - « Les caissiers, les comptables et même les ordinateurs additionnent… ».
- **23 mots en moyenne, et 98 % ont une phrase de plus de 12 mots.** C'est le texte le plus dense de la leçon pour sa taille.
- **Placement** : la charte le prévoit juste après la scène d'ouverture (la motivation d'abord). Dans plusieurs leçons, il arrive après « Je retiens », presque à la fin.

### 9. Les mots de l'interface et des consignes générées (à améliorer)

- **Consignes générées automatiquement** :
  - « 🔗 Relie chaque **élément** à sa réponse » ;
  - « ⚖️ Range chaque **affirmation** : est-elle vraie ou fausse ? ».
  - « élément » est le mot difficile le plus fréquent de son niveau (30 fois), « affirmation » vient ensuite (9 fois).
- **Noms des îles** : « Fractions et proportions », « Problèmes et logique », « La géométrie ».
- **Étiquettes du parcours** : « pour consolider », « à renforcer ».
- **Jauge** : « Couleurs rendues : 0 % » (pourcentage).
- **Titres de leçon** :
  - « Passer la dizaine en sautant sur la droite » a gardé « la droite », alors que la leçon parle de « ligne des nombres » depuis la 2.8 ;
  - « La symétrie axiale », « Les contenances (litres) », « Peser des masses » ;
  - « Les 4 étapes du détective » (le titre ne dit pas de quoi parle la leçon).
- **Barre du haut** : « 🔥 ×8 » (combo), 💎, ⭐, 📅 sans légende. Un enfant de 7 ans ne sait pas ce que comptent ces chiffres.

### 10. Défauts relevés en passant

- **Défi monotone** : 4 questions sur 5 du même type (« Construis le nombre… ») dans « Compter vite en faisant des paquets de 10 ». C'est le cas d'environ 13 % des défis de son niveau.
- **Message de Zéro hors de propos** : « Mais ce n'était pas zéro non plus ! » s'affiche après une construction de blocs ratée, où personne n'a répondu zéro.

## Ce qui marche bien

- **L'histoire d'ouverture** est courte, racontée et donne envie (« quelqu'un comme TOI ! »).
- **La ligne « comment répondre »** sous chaque question (« ✏️ Écris le nombre avec les touches, puis appuie sur ✔ ») est claire et lue à voix haute.
- **Lecture automatique de tout** en mode « lit avec un peu d'aide », activé par défaut à 7 ans.
- **Test bienveillant** :
  - « Je ne sais pas encore » ;
  - pause et gemmes après chaque île ;
  - aucune « mauvaise note ».
- **Ton des messages d'erreur** : « Une erreur, c'est ton cerveau qui grandit ! », « Ce n'est pas grave, on apprend en se trompant ».
- **« Je ne comprends pas : explique-moi autrement »** est proposé après chaque erreur.
- **Manipulations concrètes** (blocs, parts, grenouille) et **défis « dans la vraie vie »** avec des pâtes ou des boutons.
- **Âge et classe préremplis** à la création du profil.

## Angles morts de la demande

1. **L'oral avant l'écrit.** À 7 ans, on sait souvent répondre à voix haute bien avant de savoir l'écrire. Aucun exercice ne se répond à la voix, sauf le rappel libre via le micro, qui n'existe pas partout.
2. **Le moment de l'année compte autant que l'âge.** Le même enfant de CE1 sait très peu de choses en septembre et beaucoup en juin. Le niveau de départ du test en tient compte, mais pas le choix des îles ni la difficulté des exercices dans le parcours.
3. **Le parent qui lit à côté.** Le guide des 6-9 ans existe, mais rien dans la leçon ne signale à l'adulte ce que l'enfant ne peut pas faire seul (écrire une phrase, lire un tableau).
4. **La fatigue.** Rien ne mesure la durée d'un écran ni le nombre d'écrans d'une leçon pour un enfant de 7 ans. Une leçon comme « Compter vite en faisant des paquets de 10 » compte 13 écrans, plus un défi de 6 questions.
5. **Les sons coupés.** Tout repose sur la voix pour un enfant de 7 ans. Si le son de la tablette est coupé, rien ne le signale (limite déjà notée en 2.9).
6. **Les vrais enfants.** Ces constats viennent de mesures et d'un passage simulé. Le protocole `docs/protocole-test-enfants.html` (variante « premier quart d'heure ») reste la seule vraie validation.

## Corrections proposées

| Priorité | Correction | Effort |
|---|---|---|
| 1 | **Carte des talents** : ne visiter que les îles commencées au moment de l'année, et ne tirer que les exercices de niveau 1 et 2 des leçons pour les moins de 9 ans. À 7 ans en novembre : 2 îles, 4 à 6 questions. | Faible |
| 2 | **Écriture** : pas de rappel libre ni de « mot qui manque » dans les défis avant 9 ans ou en mode « lit avec un peu d'aide ». La « production » garantie y devient relier, ranger ou manipuler. | Faible |
| 3 | **Voix** : prononcer les émojis utiles (🔴 « rond rouge », 🍓 « fraises »…), « 1ᵉʳ », « 2ᵉ », « → » (« donne »), « ? » dans un calcul (« combien »), « < » (« vient avant ») selon le contexte. | Moyen |
| 4 | **Leçons** : jamais de question insérée avant le premier visuel ou texte qui explique ; découper les écrans de cours de plus de 40 mots pour les mondes du CP et du CE1 ; masquer la colonne « centaines » des blocs quand le nombre est inférieur à 100. | Moyen |
| 5 | **« Explique à Zéro »** : mauvaises réponses tirées de leçons du même monde et du même niveau, phrases raccourcies, bug `**<**` corrigé. | Faible |
| 6 | **Corrections et indices** : retour ciblé dans les manipulations (blocs : « il manque 9 barres et 4 cubes ») ; pas de × dans les corrections avant la multiplication ; bonne réponse affichée une seule fois ; gabarits accordés (« 1 barre ») ; indices propres à l'exercice quand l'astuce cite d'autres nombres. | Moyen |
| 7 | **« À quoi ça sert ? »** : écrire les 7 manquants ; réécrire les 32 qui ne parlent pas du monde de l'enfant, en une ou deux phrases courtes ; les remettre juste après la scène d'ouverture. Le contrôle du build pourrait vérifier la longueur et la présence. | Moyen (rédaction) |
| 8 | **Mots de l'interface** : « Relie chaque mot à sa réponse », « Range chaque phrase dans Vrai ou Faux » ; îles « Partager en parts », « Réfléchir », « Les formes », « Mesurer » ; étiquettes « 🔁 à revoir », « 🌟 nouveau » ; jauge en étoiles ou en morceaux d'arc-en-ciel ; titres simplifiés ; légende des compteurs de la barre du haut au premier passage. | Faible |
| 9 | **Contrôle de lisibilité au build** : l'étendre aux textes du cours, astuces, corrections et « À quoi ça sert ? » des mondes CP–CE1, avec des seuils adaptés. Les nouveaux contenus resteront ainsi lisibles. | Faible |

Mesures de référence pour vérifier les corrections (`npm run audit:7ans`, `npm run audit:consignes -- 7`) :
- **Test** : CE1 57 % et CE2 20 % des questions.
- **Écriture** : rappel libre dans 68 % des défis ; 28 % d'exercices à écrire.
- **Cours** : 47 mots par écran.
- **Explications** : 26 % de corrections sans pourquoi ; 32 « À quoi ça sert ? » hors du monde de l'enfant et 7 manquants.
