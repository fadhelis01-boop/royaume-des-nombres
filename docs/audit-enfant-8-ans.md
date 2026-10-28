# Audit « enfant de 8 ans » — clarté des consignes, premiers tests, pratique

Date : 28 octobre 2026 · version auditée : 2.7.0 · corrections livrées : 2.8.0

## Méthode

1. Parcours joué dans l'application, à la place d'une enfant de 8 ans (« Inès », profil neuf, téléphone) : création du profil, choix de la planète, histoire d'ouverture, carte des talents en maths, premier défi.
2. Simulation du test de positionnement : 400 passages (script `scripts/audit-consignes.ts`, `npm run audit:consignes -- 8`). Pour chaque passage, on relève les consignes réellement tirées, leur longueur, leurs mots longs, leur vocabulaire scolaire et le niveau de classe de chaque question.
3. Lecture du code du test (`Diagnostic.tsx`, `parcours.ts`), du lecteur d'exercices (`ExercisePlayer.tsx`) et du défi (`Defi.tsx`).

Constat de départ, rapporté par le propriétaire : une enfant de 8 ans ne comprenait pas les consignes.

## Ce qui bloque une enfant de 8 ans (version 2.7.0)

### 1. Le premier test était trop dur, au mauvais moment

- Le test partait de la **classe de l'âge** : 8 ans, donc CE2. Mais en octobre, une enfant de 8 ans vient d'entrer en CE2 : elle maîtrise le CE1, pas encore le CE2. Sur 18 questions, **53 % étaient de niveau CE2 et 20 % de niveau CM1**.
- Le test monte d'un niveau à chaque réussite et descend à chaque erreur. Il est donc construit pour faire échouer environ une question sur deux. Pour un adulte, c'est normal ; pour une enfant de 8 ans, c'est neuf échecs d'affilée devant un écran.
- Les 18 questions s'enchaînaient **juste après l'histoire d'ouverture**, sans aucune pause entre les domaines (« îles »).
- Chaque erreur affichait « La bonne réponse était : … » dans un encadré de correction. L'enfant vivait le test comme une interrogation, alors que le texte d'accueil disait le contraire.
- La carte des talents plaçait le repère « ton âge » au niveau CE2. Une enfant parfaitement dans la moyenne voyait donc « ton prochain défi 💪 » partout.

### 2. Les consignes disent quoi penser, pas quoi faire

L'enfant bloque souvent sur le **geste** attendu, pas sur les maths : faut-il taper un nombre, toucher une case, colorier, ranger ?

| Consigne | Problème pour une enfant de 8 ans |
|---|---|
| « Place 9 sur la droite. » | « la droite » se comprend « à droite ». Le 9 tombe entre deux traits (graduation de 2 en 2). |
| « Décompose pour calculer : 14 + 24 » | Elle croit devoir écrire la décomposition, alors qu'on attend seulement 38. |
| « Trouve les amis de 10 : 3 + 6 + 7 = ? » | Même confusion entre méthode et réponse. |
| « Que cherche-t-on probablement ? » | Tournure abstraite, 5 mots longs. |
| « Quelle est la contenance d'une canette ? » | « contenance » est inconnu à cet âge. |
| « … un miroir posé verticalement à côté ? » | « verticalement ». |
| « Quel est le rang de jeudi ? » | « rang » est abstrait. |
| « … combien il y a de oiseaux » | Faute d'élision dans le modèle de phrase. |

Mesures sur les consignes du test (8 ans) : 8,6 mots en moyenne, 12 % dépassent 15 mots, 26 % contiennent au moins un mot de plus de 9 lettres, et 30 % emploient du vocabulaire scolaire (dénominateur, décompose, encadre, rang…).

### 3. La pratique décourage au mauvais endroit

- La fin de défi affichait « 30 % de réussite » en grand titre. Un pourcentage est abstrait à 8 ans et sonne comme une note.
- À 0 étoile : « relis la leçon tranquillement ». C'est le conseil le moins adapté à une enfant qui lit difficilement.
- Il faut 2 étoiles (environ 80 %) pour ouvrir la leçon suivante, et rien ne prévoyait d'issue : une enfant pouvait rester bloquée indéfiniment sur la même leçon. C'est la première cause de décrochage.
- Avant de valider, « 😎 Je suis sûr / 🤔 Pas sûr » ajoute à chaque question une étape et du texte, ce qui pèse à cet âge.
- Certains messages tombaient à côté : « Presque ! Regarde bien l'indice. » même quand la réponse était loin et sans indice, « relis l'énoncé », ou « Ça marche vraiment ! ».

### 4. Le premier écran disperse l'attention

Au premier passage sur la planète, on voyait à la fois :

- l'histoire ;
- le défi du jour ;
- le coffre des écrivains ;
- trois « quêtes du jour » incompréhensibles pour une débutante (« réussis une question souvenir », « explique ton raisonnement à un personnage ») ;
- trente mondes.

### Ce qui fonctionnait déjà bien

- Lecture automatique des consignes, activée par défaut.
- Histoire racontée à voix haute.
- Un essai supplémentaire avec indice dans les défis.
- Une question plus simple après deux erreurs.
- « Explique-moi autrement ».
- Aucun son de « buzzer ».
- Manipulations concrètes (blocs, parts à colorier, grenouille).

## Corrections livrées (2.8.0)

### Carte des talents

- **Point de départ calé sur le moment de l'année** (`niveauDuMoment`) : on part de la classe précédente, plus la part d'année déjà écoulée. En octobre, à 8 ans, on part donc d'environ CE1. Ce même repère sert aussi pour la carte des talents et pour le classement « à renforcer » du parcours.
  - Résultat dans la simulation : CE1 56 %, CE2 27 %, CM1 10 % (contre CE2 53 %, CM1 20 % avant).
- **Mode test bienveillant** :
  - aucune correction ni encadré de « bonne réponse » ;
  - des messages neutres (« Celle-là, on l'apprendra ensemble dans ton parcours ») ;
  - un son doux à la place du son d'erreur.
- **Bouton « 🤷 Je ne sais pas encore »** : l'enfant n'est plus poussée à deviner, et la mesure est plus juste.
- **Une pause après chaque île** : écran « Île explorée ! » avec +2 💎. Les gemmes récompensent l'effort, pas la réussite. Trois choix :
  - île suivante ;
  - pause (tout est gardé, l'accueil propose « On reprend la carte des talents ? ») ;
  - dès 2 îles faites, « Voir ma carte avec les îles déjà visitées ».
- La croix ✕ devient « faire une pause » : la progression est sauvegardée, au lieu de fabriquer un parcours à partir d'un test inachevé.
- **Textes d'accueil plus courts pour les moins de 10 ans, lus à voix haute** : « 6 îles, 3 petites questions par île, pause possible ».

### Consignes

- **Ligne « comment répondre »** sous chaque question pour les moins de 10 ans, lue juste après la consigne. Exemples : « 👆 Touche la bonne réponse, puis Valider », « ✏️ Écris le nombre avec les touches, puis appuie sur ✔ ».
- « la droite » devient « la ligne des nombres » du CP au CE2, et « la droite graduée » à partir du CM1.
- Les consignes du tableau ci-dessus sont reformulées. Une astuce passe en indice quand elle était déguisée en consigne (« ajoute d'abord les dizaines… »).

### Pratique

- Fin de défi en clair : « 7 bonnes réponses sur 10 ». Le pourcentage reste affiché à partir de 10 ans.
- **Anti-blocage** : après 3 essais avec au moins une étoile, la leçon suivante s'ouvre quand même. La leçon reste non maîtrisée, donc signalée à consolider.
- « Je suis sûr / pas sûr » est réservé aux 10 ans et plus.
- Messages corrigés : « Pas encore ! Prends ton temps », « réécoute la question 🔊 ».

### Accueil et parents

- **Premiers pas** : tant que l'histoire et la carte des talents ne sont pas faites, l'accueil ne montre qu'une action (pas de défi du jour, de quêtes ni de surprise).
- **Guide « Les premières séances d'un enfant de 6 à 9 ans »** dans l'Espace parents :
  - rester à côté de l'enfant ;
  - lui demander « qu'est-ce qu'on te demande de faire ? » ;
  - lui dire que le test est fait pour être difficile ;
  - s'arrêter sur une réussite ;
  - séances de 10 à 20 minutes ;
  - que faire quand l'âge ne correspond pas à la classe.
- Le guide parent indiquait 60 % pour ouvrir la leçon suivante ; le seuil réel est de 80 %. C'est corrigé.

## Angles morts de la demande, et ce qu'il reste à faire

1. **L'âge ne dit pas la classe.** Un enfant né en décembre, ou qui a sauté ou redoublé une classe, est mal placé au départ. Le test s'ajuste en cours de route, mais demander « En quelle classe es-tu ? » à la création du profil serait plus juste. *Non fait.*
2. **Savoir lire n'est pas binaire.** Le profil connaît « lit » ou « ne lit pas encore ». À 8 ans, on est souvent lecteur débutant. La lecture automatique compense, à condition qu'elle reste activée et que le son soit allumé, ce qui n'est pas acquis à l'école ou dans les transports. *À observer.*
3. **Un test de 3 questions par domaine est bruité** : trois questions sur des notions différentes (placer un nombre, l'écrire en lettres, un rang). Le point de départ peut être faux d'un niveau. « Faire le point » (conseillé tous les 15 jours) corrige ensuite. *À surveiller avec de vrais enfants.*
4. **Le vocabulaire des leçons** (et pas seulement du test) n'a été corrigé que là où le test le rencontre. Une passe complète sur les mondes « Graines » serait utile : environ 12 % de consignes de plus de 15 mots, et des mots comme dénominateur, encadre ou décompose. Le script d'audit peut servir de base à une alerte automatique dans `npm run build`. *Non fait.*
5. **La précision au doigt** : sur téléphone, les traits de la ligne des nombres sont espacés d'environ 25 pixels, et viser entre deux traits est difficile à 8 ans. Agrandir la zone de toucher ou aimanter au trait le plus proche. *Non fait.*
6. **L'émotion n'est pas mesurée.** Rien ne repère qu'un enfant abandonne (fermeture en plein test, longues hésitations). Le compteur `abandons` existe pour les leçons ; il faudrait l'étendre au test et le montrer aux parents. *Non fait.*
7. **Tester avec des enfants.** Ce travail simule une enfant. Le protocole `docs/protocole-test-enfants.html` reste la vraie validation. Le refaire avec 3 ou 4 enfants de 7 à 9 ans, en observant surtout le premier quart d'heure.
