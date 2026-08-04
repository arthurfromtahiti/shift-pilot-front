# Tests — Audit

> Confiance : high

## Compréhension globale

Le dépôt dispose d'un fichier de tests d'acceptation (`js/app.test.js`, 60 lignes) et d'un outillage Jest configuré (`package.json`). Quatre tests couvrent les comportements clés de `loadActiveOrders` : état vide, liste non vide, consommation de `order.totalXpf`, et cible de l'appel réseau. Pas de CI déclarée, pas de lint.

## Résumé exécutif

La couverture de tests est **partielle mais ciblée** — quatre tests d'acceptation (Jest + jsdom) vérifient les chemins principaux de `loadActiveOrders` (`js/app.test.js`). Les cas couverts : liste vide → `<li>Aucune commande</li>`, liste non vide → une ligne par commande, consommation directe de `order.totalXpf`, cible de l'appel réseau. Les cas non couverts : erreur réseau, réponse non-JSON, champs manquants sur `order`. Pas de CI — les tests sont exécutables manuellement via `npm test`, mais aucun check automatique ne bloque une régression au push.

## Constats détaillés

**VÉRIFIÉ_CODE — `js/app.test.js` : quatre tests d'acceptation.** Le fichier (`js/app.test.js`, 60 lignes) importe `loadActiveOrders` depuis `js/app.js` via CommonJS et exécute les tests dans un environnement jsdom. Les quatre tests couvrent :
1. Liste vide (`[]`) → `<li>Aucune commande</li>` inséré dans `#orders-list` (`js/app.test.js:18-27`)
2. Liste non vide → une `<li>` par commande, formatée `Commande #id — totalXpf XPF (status)`, absence du message vide (`js/app.test.js:29-45`)
3. Consommation directe de `order.totalXpf` sans division — régression guard CLA-126 (`js/app.test.js:47-57`)
4. Appel réseau cible `/orders?active=true` (`js/app.test.js:59-67`)

**VÉRIFIÉ_CODE — `package.json` : Jest configuré avec jsdom.** Le fichier `package.json` déclare `jest` et `jest-environment-jsdom` en `devDependencies`, configure `testEnvironment: "jsdom"` et `roots: ["<rootDir>/js/"]`. La commande `npm test` est disponible.

**VÉRIFIÉ_CODE — Pas de CI déclarée.** Aucun fichier `.github/workflows/`, `.gitlab-ci.yml`, `.circleci/config.yml` ou équivalent n'est présent dans le dépôt. Les commits peuvent être poussés sans exécution automatique des tests.

**VÉRIFIÉ_CODE — Pas de lint.** Ni ESLint, ni Prettier, ni aucun outil de vérification statique n'est configuré.

**VÉRIFIÉ_CODE — Cas limites non couverts.** Les scénarios suivants ne sont pas testés : erreur réseau ou réponse non-JSON (exception non capturée dans `loadActiveOrders`), champs manquants sur `order` (`id`, `totalXpf`, `status` non définis → `undefined` silencieux dans le DOM).

## Forces

- **Tests d'acceptation couvrant les comportements visibles** : les quatre tests valident ce que voit l'utilisateur (liste vide, liste non vide, formatage) et servent de filet de régression pour les deux PRs déjà mergés (CLA-121, CLA-126).
- **Guard de régression explicite pour `totalXpf`** : le test `"affiche order.totalXpf directement sans diviser par 100"` (`js/app.test.js:47`) documente et protège le contrat de champ courant.
- **Environnement jsdom** : permet de tester la manipulation DOM sans navigateur réel.

## Dettes techniques

- **Chemins d'erreur non couverts** : erreur réseau silencieuse, réponse non-JSON — `js/app.js:7-8`.
- **Pas de CI** : les tests ne sont exécutés qu'à la main ; une régression peut être mergée sans détection automatique.
- **Pas de lint** : qualité syntaxique repose sur la revue humaine.

## Zones critiques

- **`js/app.js` lignes 7-8`** : les chemins d'erreur réseau et de réponse non-JSON ne sont pas couverts.
- **`js/app.test.js`** : seul filet de régression automatisé — à maintenir à jour à chaque évolution du contrat de rendu.

## Risques

- **Régression non bloquée au push** : sans CI, un commit cassant les tests peut être mergé — `js/app.test.js` n'est exécuté que si `npm test` est lancé manuellement.
- **Cas limites silencieux** : un champ `totalXpf` manquant ou renommé côté back s'afficherait `undefined XPF` dans l'UI sans qu'aucun test ne l'intercepte — `js/app.js:20`.

## Recommandations priorisées

1. **Ajouter un test de cas d'erreur réseau** (mock `fetch` qui rejette) pour couvrir le chemin actuellement silencieux — `js/app.js:7`.
2. **Mettre en place une CI minimale** (GitHub Actions `npm test`) pour que les tests bloquent automatiquement une régression au push — `package.json`.

## Questions ouvertes

- Une CI est-elle prévue, ou l'absence de vérification automatique est-elle délibérée pour ce pilote ?
