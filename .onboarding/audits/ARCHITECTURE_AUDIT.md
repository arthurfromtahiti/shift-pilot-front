# Architecture — Audit

> Confiance : high

## Compréhension globale

`shift-pilot-front` est un front-end statique minimal intentionnellement réduit à l'essentiel : une page HTML et un fichier JavaScript de 19 lignes qui consomme l'API de `shift-pilot-back`. Il n'y a ni couche de présentation séparée, ni routeur, ni gestionnaire d'état, ni outil de build. L'architecture « est » literalement deux fichiers — aucune structure à décortiquer, et c'est assumé.

## Résumé exécutif

Le dépôt est un **prototype jetable à un seul niveau de couche** (`README.md:3` : « dépôt de test jetable »). Toute la logique applicative tient dans la fonction `loadActiveOrders()` de `js/app.js` (19 lignes), branchée sur `DOMContentLoaded` via un script injecté directement dans `index.html`. Il n'y a pas de séparation entre transport, domaine et rendu : ces trois responsabilités coexistent dans les lignes 6-17 de `js/app.js`. Il n'existe aucun pipeline de build, aucun outil de lint, aucune dépendance externe déclarée (pas de `package.json`). La configuration d'environnement repose sur une variable globale `window.API_BASE_URL` (`js/app.js:4`), défaut `http://localhost:3000`. Ce choix d'architecture est cohérent avec l'objectif déclaré (pilote de test multi-dépôts) mais rend tout ajout futur d'une feature réelle risqué sans restructuration préalable.

## Constats détaillés

**VÉRIFIÉ_CODE — Monocouch total.** La fonction `loadActiveOrders()` assure à elle seule le transport (appel `fetch`, `js/app.js:7`), la désérialisation (`.json()`, `js/app.js:8`) et le rendu DOM (création de `<li>`, `js/app.js:12-16`). Il n'y a pas de séparation formelle entre ces niveaux, même par convention de nommage. Ceci est délibéré dans un prototype de cette taille mais constituerait un risque de maintenabilité si le périmètre augmentait.

**VÉRIFIÉ_CODE — Pas de module JS.** `js/app.js` est chargé via `<script src="js/app.js">` (`index.html:10`) sans `type="module"`. La fonction `loadActiveOrders` et la constante `API_BASE_URL` sont donc dans le scope global — pas d'encapsulation possible, pas d'importation. Pour un fichier de 19 lignes, ce n'est pas un problème ; pour tout ajout futur, c'est une contrainte.

**VÉRIFIÉ_CODE — Configuration par variable globale.** L'URL de base est résolue par `window.API_BASE_URL || "http://localhost:3000"` (`js/app.js:4`). Le mécanisme qui injecterait cette variable en production est absent du dépôt (non visible dans `index.html`, aucun wrapper de déploiement) — voir Questions ouvertes.

**VÉRIFIÉ_CODE — Aucun pipeline de build.** Pas de `package.json`, pas de bundler, pas de minifier, pas de transpileur. Le déploiement est un `npx serve .` (`README.md:13`). Avantage : zéro dépendance à maintenir. Contrainte : aucun lint automatique, aucune vérification de compatibilité navigateur, pas de cache-busting.

## Forces

- **Minimalisme cohérent avec l'objectif déclaré** : le README désigne ce dépôt comme un prototype de test, et l'implémentation est à la hauteur de cette ambition, ni plus ni moins (`README.md:3`).
- **Aucune dépendance externe versionnée** : zéro surface d'attaque sur la chaîne d'approvisionnement, zéro fragilité liée à un `npm install` échoué.
- **Un seul point d'entrée, un seul chemin d'exécution** : le code est entièrement traçable sans effort (`js/app.js:6-19`).

## Dettes techniques

- **Pas de séparation des préoccupations** : `loadActiveOrders()` mêle I/O réseau, désérialisation et manipulation DOM (`js/app.js:6-17`). Ce n'est pas une dette bloquante pour 19 lignes, mais tout ajout d'une feature (état de chargement, pagination, gestion d'erreur) accentue ce couplage.
- **Variable globale non typée comme point de configuration** : `window.API_BASE_URL` (`js/app.js:4`) est écrasable par n'importe quel script tiers chargé dans la même page, sans mécanisme de validation ni de gel.
- **Absence totale d'outillage** : pas de lint, pas de format, pas de check de compatibilité navigateur — la qualité repose entièrement sur la revue humaine.

## Zones critiques

- **`js/app.js` lignes 6-17** : la totalité de la logique applicative. Un senior regarderait ici en premier parce que c'est le seul endroit où quelque chose peut casser — réseau, parsing, DOM.

## Risques

- **Fragilité sur l'extension** : HYPOTHÈSE : si ce dépôt devait évoluer au-delà d'un prototype (ajout de features réelles), la structure monocouche et l'absence d'outillage rendent chaque extension plus coûteuse et risquée que dans un projet correctement scaffoldé.
- **Mécanisme de configuration inconnu en production** : `window.API_BASE_URL` n'est injectée par aucun mécanisme observable dans ce dépôt. HYPOTHÈSE : elle est soit absente (donc `localhost:3000` en prod), soit injectée par un wrapper externe non versionné ici — dans les deux cas, la configuration de production est invisible depuis ce dépôt.

## Recommandations priorisées

1. **Documenter le mécanisme de déploiement et d'injection de `window.API_BASE_URL`** — avant tout autre effort. C'est le seul point de configuration du dépôt et son comportement en dehors du dev local est inconnu — `js/app.js:4`, `README.md`.
2. **Si le dépôt doit vivre** (au-delà du pilote) : introduire un `type="module"` et un `package.json` minimaliste avec ESLint — `index.html:10`, `js/app.js`.

## Questions ouvertes

- Quel mécanisme (nginx, wrapper de déploiement, `<meta>`, injection serveur) est censé renseigner `window.API_BASE_URL` en dehors du dev local ?
- Le dépôt est-il destiné à rester un prototype, ou à évoluer vers une vraie application front-end ? La réponse conditionne entièrement les recommandations d'outillage.
