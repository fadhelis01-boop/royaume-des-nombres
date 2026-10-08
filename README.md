# 🌳 Le Royaume des Nombres

Application d'apprentissage des mathématiques **de 7 ans jusqu'au niveau universitaire**, guidée par trois mascottes :
**Mia π** (la chatte qui imagine), **Néo Fibo** (le renard qui vérifie) et **Zéro** (le hamster qui fait rire).

Fonctionne sur **ordinateur, tablette et téléphone (iPhone compris)**, installable comme une application, **hors connexion**.

## Ce qu'il y a dedans

- **Une histoire à suivre** : le Grignoteur de Nombres éteint les cristaux du Royaume. Chaque monde est un chapitre (scène en bande dessinée à l'arrivée), chaque **Défi du Gardien** réussi rallume un cristal, débloque la suite et un **diplôme à imprimer**. Trois livres, de la Forêt au Temple de la Logique, à relire dans le Livre de l'aventure.
- **30 mondes, 199 leçons** : du **Nid des Nombres** (GS – CP, compter en touchant) et des nombres jusqu'à 1 000 (CE1) aux intégrales, nombres complexes, matrices et logique (supérieur), plus l'**École des Astuces** (méthode, pensée mathématique, calcul mental, réussir un contrôle).
- **Cours écrits ET audio** : chaque étape est lue par la voix de Mia, Néo, Zéro ou du narrateur ; mode « écoute continue » ; **reprise là où on s'est arrêté** ou depuis le début.
- **Exercices infinis** : 1 090 générateurs paramétrés (nombres tirés au sort), corrigés automatiquement, avec indice, correction expliquée, seconde chance et **explication ciblée des erreurs classiques**. 16 types de réponses : nombre, fraction, QCM, vrai/faux, comparer, ranger, droite graduée, expression algébrique (vérifiée par équivalence : « développée », « factorisée »…), plusieurs cases, mot, et **6 manipulations** (blocs base 10, partage, sauts de grenouille, colorier une fraction, régler une horloge, payer).
- **Cours actifs** : une question toutes les deux étapes, moments « Explique à Néo », défis dans la vraie vie. Une leçon se valide à 80 % ; les défis s'adaptent après deux erreurs.
- **Visuels dessinés** : blocs base 10, tableau de numération, droite graduée avec sauts, **modèle en barres (méthode de Singapour)**, fractions, horloge, monnaie, figures, solides, balance, arbres de probabilités, graphiques de fonctions, diagrammes.
- **Problème ↔ calcul dans les deux sens** : l'Atelier des Problèmes (méthode des barres, 4 étapes de Pólya, pièges des énoncés) et « Invente un problème ».
- **Jeux** : la Défense du Royaume (tables et additions), le Pont des Fractions, la Course de la Grenouille, le **Duel en famille** sur le même écran, l'Échauffement de 2 minutes, Calcul éclair (16 familles, avec mode zen sans chrono), Tour des Additions et Tour des Tables (suivi fait par fait), Le compte est bon (avec solveur), Vise juste (droite graduée), 30 énigmes, défi du jour.
- **Un vrai jeu** : carte du Royaume qui se reconstruit cristal après cristal, **gemmes** gagnées en apprenant et dépensées à la **boutique** (personnage, compagnons, cabane ; jamais d'argent réel ni de coffre au hasard), **combats** contre le Grignoteur avec les pouvoirs des trois mascottes, combos et effets, apparitions surprises en pleine leçon, choix dans l'histoire.
- **Récompenses** : points, niveaux et titres, étoiles, 33 badges (dont la persévérance), album d'autocollants, séries de jours, célébrations.
- **Révisions espacées** (1, 3, 7, 16, 35 jours), pratique entrelacée, « retravailler mes erreurs ».
- **Test de positionnement** adaptatif pour commencer au bon niveau.
- **Demande à Mia** : questions libres (au clavier ou au micro). Hors ligne : réponses tirées des leçons et du **Grand Livre** (95 définitions sourcées). Avec une clé d'API Claude ajoutée par un parent : réponses adaptées à l'âge, **sourcées** (recherche limitée à des sites de référence : Eduscol, Lumni, Khan Academy, Wikipédia, Bibmath…).
- **Espace parents** (code PIN) : suivi détaillé (temps, réussite, points à consolider, erreurs, **leçons quittées en cours de route, durée des séances**), mode « je ne lis pas encore », plusieurs enfants, voix des personnages, taille du texte, mode dyslexie (police OpenDyslexic), musique douce, limite de temps d'écran, déblocage, sauvegarde / transfert, guide pédagogique, **import de nouveaux domaines**.

## Illustrations

Le cahier des charges destiné au graphiste (style unifié, 34 poses de mascottes, personnages de l'histoire, 28 décors, objets, carte) est dans [`docs/cahier-des-charges-graphiste.html`](docs/cahier-des-charges-graphiste.html).

## Ajouter un domaine sans programmer

Voir [`docs/FORMAT-CONTENU.md`](docs/FORMAT-CONTENU.md) et le modèle [`public/modele-monde.yaml`](public/modele-monde.yaml).
Un monde se décrit dans un fichier YAML (leçons, dialogues, visuels, exercices à paramètres) et s'importe depuis l'Espace parents, ou se publie pour tous avec `npm run deploy`.

## Développement

```bash
npm install
npm run dev        # http://localhost:5194
npm run build      # compile le contenu, tire et corrige ~140 000 questions, vérifie les types, construit
npm run deploy     # construit puis publie sur GitHub Pages (branche gh-pages)
```

- `content-src/` : les mondes (YAML) → `scripts/build-content.mjs` → `public/content/` (JSON).
- `scripts/check-content.ts` : contrôle qualité (chaque exercice tiré des dizaines de fois, la bonne réponse doit être acceptée, LaTeX compilé).
- `src/lib/expr.ts` : moteur d'expressions mathématiques (sans `eval`) ; `src/lib/gen.ts` : générateur et correcteur d'exercices.
- `scripts/cutout.py` : détourage des mascottes (rembg) ; `scripts/make-icons.py` : icônes.

Données des enfants : stockées uniquement sur l'appareil (IndexedDB). Aucune publicité, aucun compte.
