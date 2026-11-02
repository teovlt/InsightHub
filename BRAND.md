# InsightHub — Brand

Référence pour tout le travail produit, design et contenu à venir (landing page, page Statistiques, i18n, README…).
Décidé lors de l'atelier branding du 2 novembre 2026.

---

## 1. Positionnement

**InsightHub est le tableau de bord de ta vie perso : tu suis tes habitudes et tes activités (sport, lecture, études,
code, musique…) et tu vois — et montres — ta progression.**

- **Catégorie** : suivi d'habitudes et de vie personnelle, sur le web.
- **Différence** : la donnée arrive autant que possible toute seule, via les intégrations (GitHub aujourd'hui ; Strava,
  Spotify, Goodreads… ensuite). La saisie manuelle complète, elle n'est pas le cœur.
- **Promesse** : _montrer sa progression._ Chaque écran répond à « est-ce que j'avance ? » et rend cette progression
  facile à voir et à partager (profil ou carte de stats partageable).

### Ce qu'InsightHub n'est PAS

- **Pas un outil d'équipe** : pas de dashboards d'équipe, pas de suivi de productivité par un manager. Un compte = une personne.
- **Pas une app mobile** : web d'abord (responsive, bien sûr), pas de saisie quotidienne façon tracker sur téléphone.
- **Pas un réseau social** : on peut partager sa progression (lien, image), mais pas de feed, de likes, de followers
  ni de classements.

### Conséquences pour la roadmap

- La page **Statistiques** (graphiques, objectifs, séries / streaks) est le cœur du produit.
- Les **intégrations** sont le principal levier d'acquisition de données ; prioriser celles de la vie perso
  (Strava, Spotify, Goodreads, Duolingo…) plutôt que des outils pro.
- Un **partage de progression** (lien public en lecture seule ou image) sert la promesse, sans mécaniques sociales.
- Les **catégories par utilisateur** doivent couvrir la vie perso (Sport, Lecture, Études, Code, Musique, Sommeil…).
- Retirer tout ce qui positionne le produit « pour développeurs et freelances » (README) ou en « boilerplate » (home).

---

## 2. Audience

**Utilisateur idéal : l'étudiant / jeune actif (18–30 ans).**

- Veut se motiver et tenir ses habitudes (études, sport, lecture, side projects).
- Utilise déjà quelques apps (Strava, Spotify, GitHub, Duolingo…) et aimerait tout voir au même endroit.
- Budget nul ou très faible : le produit doit être gratuit pour l'essentiel.
- Sensible au design et au « fun » : une interface terne ou trop corporate le fait fuir.
- Aime montrer ses progrès (story, Discord, portfolio), sans vouloir un nouveau réseau social.

---

## 3. Nom

**InsightHub** — conservé.

Le nom est générique et déjà utilisé par d'autres SaaS ; on le compense par une identité visuelle forte et un ton
chaleureux plutôt que « analytics B2B ». Pas de renommage prévu.

**Tagline (FR)** : « Tes habitudes, ta progression, au même endroit. »
**Tagline (EN)** : "Your habits, your progress, all in one place."

---

## 4. Ton de voix — « le pote motivant »

- **Tutoiement** en français, _you_ direct en anglais.
- **Phrases courtes**, verbes d'action, chiffres concrets.
- **Encourageant sans être niais** : on célèbre les progrès réels, on ne culpabilise jamais un jour manqué.
- **Emojis** : rares et utiles (🔥 pour une série, 🎯 pour un objectif atteint), jamais dans les messages d'erreur.
- **Pas de jargon** : « séries » plutôt que « streaks » en FR, « objectif » plutôt que « KPI », pas de « data-driven ».

| Situation        | ✅ Oui                                                           | ❌ Non                           |
| ---------------- | ---------------------------------------------------------------- | -------------------------------- |
| Série en cours   | « 12 jours d'affilée, continue ! 🔥 »                            | « Votre streak est de 12. »      |
| Objectif atteint | « Objectif atteint : 20 livres cette année 🎯 »                  | « KPI lecture : 100 % ✔ »        |
| Jour manqué      | « Pas grave, on reprend demain. »                                | « Vous avez cassé votre série. » |
| État vide        | « Connecte Strava ou ajoute ta première activité. »              | « Aucune donnée disponible. »    |
| Erreur           | « Impossible de synchroniser GitHub. Réessaie dans un instant. » | « Error 500: sync failed »       |

---

## 5. Direction visuelle — « Électrique »

On garde le bleu actuel pour la continuité, en le rendant plus vif et plus jeune grâce à un accent lime.

### Palette

| Rôle           | Hex       | Usage                                                     |
| -------------- | --------- | --------------------------------------------------------- |
| Primaire       | `#1489E0` | Boutons, liens importants, graphiques principaux, logo    |
| Primaire foncé | `#0F6FB8` | Texte/lien bleu sur fond clair (contraste 5,3:1), hover   |
| Accent lime    | `#B8F34A` | Succès, séries, objectif atteint, highlights de graphique |
| Encre          | `#0F172A` | Texte principal (clair), texte sur fond lime              |
| Neutre         | `#64748B` | Texte secondaire, axes, bordures marquées                 |
| Fond clair     | `#F3F6FB` | Fond de page en mode clair (les cartes sont blanches)     |
| Fond sombre    | `#0B1220` | Fond de page en mode sombre                               |

Règles d'accessibilité :

- Blanc sur `#1489E0` = 3,7:1 → OK pour boutons et textes ≥ 18 px / gras ; pour du petit texte blanc, utiliser `#0F6FB8`.
- Le lime ne sert **jamais** de couleur de texte sur fond clair. Sur fond lime, le texte est toujours `#0F172A`.
- En mode sombre, le lime et le bleu primaire s'utilisent tels quels sur `#0B1220`.
- Graphiques : bleu = série principale, lime = objectif / record ; les autres séries en nuances de neutre ou de bleu.

Les couleurs sont définies uniquement dans `client/src/styles/index.css` (pas de configuration en base).

### Typographie (Google Fonts)

- **Titres, chiffres clés, logo** : [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) 600 / 700.
- **Texte et UI** : [Inter](https://fonts.google.com/specimen/Inter) 400 / 500 (chiffres tabulaires `font-variant-numeric: tabular-nums` dans les tableaux et stats).
- Les gros chiffres (stats, séries) sont en Space Grotesk 700 : ce sont les héros de l'interface.

### Logo — brief

- **Symbole** : un carré aux coins arrondis bleu `#1489E0` contenant **3 barres montantes** blanches ; la troisième,
  la plus haute, est **lime** `#B8F34A` et surmontée d'un **point** : elle forme le « i » d'InsightHub
  (progression + insight).
- **Wordmark** : « **Insight**Hub » en Space Grotesk, « Insight » en 700 et « Hub » en 400, couleur encre
  (ou blanc en mode sombre).
- **Déclinaisons** : symbole seul (favicon, avatar, icône PWA), symbole + wordmark horizontal (navbar, landing),
  version monochrome.
- **Favicon** : le symbole seul en SVG, lisible à 16 px (barres épaisses, point bien séparé) ; remplace le favicon
  par défaut actuel.

### Style général

- Coins arrondis généreux (cartes 16 px, boutons 10–12 px), ombres légères, beaucoup d'espace.
- Les cartes de stats mettent le chiffre en avant, avec une mini-courbe et une pastille lime quand ça progresse.
- Illustrations : formes géométriques simples (barres, points, courbes) dans la palette, pas de stock photos.

### Système de mise en page (implémenté dans le client)

- **Conteneur** : toutes les pages utilisateur passent par `Page` / `PageHeader` / `SectionTitle`
  (`client/src/components/customs/page.tsx`) : largeur max 1152 px (`max-w-6xl`), gouttières 16 / 24 px,
  40 px entre sections.
- **En-tête de page** : sur-titre en bleu majuscule, titre Space Grotesk 30–36 px, description en gris.
- **Cartes** : fond blanc (`bg-card`), bord `border/70`, `rounded-2xl`, ombre `shadow-card` ; au survol, les cartes
  cliquables montent de 2 px avec `shadow-card-hover` (halo bleu).
- **Cartes de stats** : liseré de 4 px en haut dans la couleur de la catégorie, pastille de couleur + libellé gris,
  valeur en Space Grotesk 30 px, badge lime « Auto » pour les stats synchronisées.
- **Héros** (accueil) : dégradé `#1489E0 → #0F6FB8`, texte blanc, barres décoratives dont la dernière en lime,
  tuiles de résumé en verre (`bg-white/10`).
- **Icônes de section** : tuile 48 px `rounded-2xl` teintée à 12 % de la couleur de la catégorie.
- **Navbar** : collante, translucide (`backdrop-blur`), liens en pilules, lien actif sur fond bleu à 10 %.
- **Fond de page** : halo bleu radial très léger en haut de chaque page.
- **États vides** : bordure pointillée, icône dans une tuile bleue, une phrase + une action.
