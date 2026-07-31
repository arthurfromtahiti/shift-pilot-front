# Tests — Audit

> Confiance : high

## Compréhension globale

Il n'existe aucun test dans ce dépôt. Pas de framework de test, pas de fichier de spec, pas de CI déclarée, pas de configuration de lint. La totalité de la vérification du comportement repose sur l'exécution manuelle dans un navigateur avec un backend fonctionnel.

## Résumé exécutif

La couverture de tests est **zéro** — ni tests unitaires, ni tests d'intégration, ni tests de bout en bout. Aucune recherche (`rg -r "test\|spec\|jest\|mocha\|vitest\|cypress\|playwright" .`) ne remonte de fichier de test dans le dépôt. Il n'y a pas de `package.json` (donc pas de script `test`), pas de dossier `__tests__` ni de fichier `*.spec.*`. Pour un prototype de test déclaré comme jetable (`README.md:3`), cette situation est assumée ; pour tout usage au-delà, elle constitue le risque le plus immédiat car toute modification de `js/app.js` ne peut être validée qu'à la main.

## Constats détaillés

**VÉRIFIÉ_CODE — Aucun fichier de test.** La recherche de patterns de test (`test`, `spec`, `jest`, `mocha`, `vitest`, `cypress`, `playwright`) dans l'ensemble du dépôt ne remonte aucun fichier pertinent. Les seuls fichiers de code sont `index.html` (12 lignes) et `js/app.js` (19 lignes).

**VÉRIFIÉ_CODE — Pas de `package.json`.** Sans `package.json`, il n'existe pas de commande `npm test`, pas de dépendance de test, pas de configuration Jest ou équivalent. Le dépôt est un front statique ouvert directement dans le navigateur.

**VÉRIFIÉ_CODE — Pas de CI déclarée.** Aucun fichier `.github/workflows/`, `.gitlab-ci.yml`, `.circleci/config.yml` ou équivalent n'est présent dans le dépôt. Les commits peuvent être poussés sans aucune vérification automatique.

**VÉRIFIÉ_CODE — Pas de lint.** Ni ESLint, ni Prettier, ni aucun autre outil de vérification statique n'est configuré. La qualité syntaxique repose entièrement sur la revue humaine.

**VÉRIFIÉ_CODE — Code non testable en l'état.** La fonction `loadActiveOrders()` (`js/app.js:6-17`) mêle appel `fetch`, désérialisation et manipulation DOM dans une seule unité. Sans extraction de ces préoccupations, elle ne peut pas être testée unitairement sans simuler simultanément le réseau (`fetch`) et le DOM (`document.getElementById`).

## Forces

- **La légèreté du code réduit le besoin de tests complexes** : le comportement entier tient en 19 lignes et un seul chemin d'exécution — un test manuel de bout en bout est rapide à réaliser.
- **Aucune logique métier complexe à tester** : pas de calcul, pas de règle de gestion, pas de branch conditionnelle (hors gestion d'erreur absente). Le seul traitement non trivial est `order.total / 100` (`js/app.js:14`).

## Dettes techniques

- **Zéro couverture** : aucun comportement n'est vérifié automatiquement — ni le chemin heureux (fetch réussi → liste rendue), ni les cas limites (erreur réseau, liste vide, champs manquants).
- **Code structurellement non testable** : la fonction principale (`js/app.js:6-17`) ne peut pas être importée et testée isolément sans refactoring préalable (séparation réseau/rendu).

## Zones critiques

- **`js/app.js` entier** : un seul fichier, zéro couverture. Toute modification est un risque non mesuré.
- **`js/app.js` ligne 14 (formatage)** : la règle `order.total / 100 XPF` n'est vérifiée que visuellement en navigateur.

## Risques

- **Régression invisible à chaque modification** : sans tests, toute évolution de `loadActiveOrders()` doit être validée manuellement. L'absence de CI garantit qu'aucun check automatique ne bloquera une régression — `js/app.js:6-17`.
- **Impossibilité de détecter une rupture de contrat API** : si `shift-pilot-back` change le schéma de réponse (renommage d'un champ, changement d'unité de `total`), aucun test ne l'intercepterait — `js/app.js:14`.

## Recommandations priorisées

1. **Si le dépôt doit évoluer** : introduire un `package.json` et un framework de test minimal (Vitest recommandé pour un front statique) avant tout ajout de fonctionnalité — `js/app.js`.
2. **Extraire la logique de formatage** (`formatOrder(order)`) pour la rendre testable isolément — `js/app.js:14`. C'est la seule logique « métier » du front et elle devrait être couverte en priorité.
3. **Ajouter un test de contrat de schéma** (validation des champs `id`, `total`, `status` sur la réponse API) — `js/app.js:8`.

## Questions ouvertes

- Existe-t-il un plan pour ajouter des tests si ce front sort du périmètre « prototype » ? Cela détermine si les recommandations ci-dessus sont pertinentes maintenant ou plus tard.
- Une CI est-elle prévue, ou l'absence de vérification automatique est-elle délibérée pour ce pilote ?
