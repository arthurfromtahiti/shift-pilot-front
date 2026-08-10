# Traçabilité d'acceptation — SHIAAAAAAAAAAAAAAAAAAAAAAAA-605

**Ticket** : SHIAAAAAAAAAAAAAAAAAAAAAAAA-605 — Retrouver une commande par numéro
**Tests** : `tests/e2e/acceptance-605.spec.js`
**Exécution** : Playwright / Chromium (4 scénarios)
**Résultats** : 4/4 scénarios verts — vérification automatique en CI sur chaque push (voir onglet *Checks* de la PR).

## Matrice de traçabilité

| ID  | Critère d'acceptation PO                                           | Test Playwright                                                      | Résultat automatisé |
|-----|--------------------------------------------------------------------|----------------------------------------------------------------------|---------------------|
| S1  | Commande trouvée → affiche total, status, clientName               | `S1 : commande trouvée → affiche total, status et clientName`        | ✅ PASS (447ms)     |
| S2  | Commande introuvable (404) → message "Aucune commande trouvée …"   | `S2 : commande introuvable (404) → "Aucune commande trouvée …"`      | ✅ PASS (320ms)     |
| S3  | Champ vide + clic → zéro appel réseau vers /orders/:id             | `S3 : champ vide → clic bouton → zéro appel réseau vers /orders/:id` | ✅ PASS (620ms)     |
| S4  | Erreur serveur (5xx) → "Une erreur est survenue, veuillez réessayer" | `S4 : erreur serveur (5xx) → "Une erreur est survenue …"`           | ✅ PASS (333ms)     |

## Détail des scénarios

### S1 — Commande trouvée
- **Given** : L'API retourne `{ id: 42, total: 1500, currency: 'EUR', status: 'paid', clientName: 'Dupont' }`
- **When** : L'utilisateur saisit `42` et clique sur le bouton de recherche
- **Then** : Le bloc `#order-id-result` affiche `Commande #42`, `1500`, `paid`, `Dupont`

### S2 — Commande introuvable (404)
- **Given** : L'API retourne HTTP 404 pour l'id `999`
- **When** : L'utilisateur saisit `999` et clique sur le bouton de recherche
- **Then** : Le bloc `#order-id-result` affiche `Aucune commande trouvée pour le numéro 999`

### S3 — Champ vide, pas d'appel réseau
- **Given** : Le champ `#order-id-search` est vide
- **When** : L'utilisateur clique sur le bouton de recherche
- **Then** : Aucun appel vers `/orders/:id` n'est émis (assertion sur 0 requêtes interceptées)

### S4 — Erreur serveur (5xx)
- **Given** : L'API retourne HTTP 500 pour l'id `1`
- **When** : L'utilisateur saisit `1` et clique sur le bouton de recherche
- **Then** : Le bloc `#order-id-result` affiche `Une erreur est survenue, veuillez réessayer`

---

## Acceptation PO — SHIAAAAAAAAAAAAAAAAAAAAAAAA-605

> Recette exercée via les tests E2E Playwright (GitHub Actions, Chromium réel, réseau intercepté).
> Les verts CI sont visibles dans l'onglet *Checks* de la PR — rapport HTML uploadé comme artifact `playwright-report` sur chaque run.
> Date de dernière vérification locale : 2026-08-10 — 4/4 PASS.

> **Chromium local** : `npm run test:e2e` détecte automatiquement l'environnement (voir `scripts/run-e2e.sh`).
> En CI, l'étape *Install Playwright browsers* (`npx playwright install --with-deps chromium`) gère les dépendances système.

### Grille de recette PO

| ID  | Scénario PO                                   | Étapes manuelles                                                                            | Résultat attendu                                              | Statut PO |
|-----|-----------------------------------------------|---------------------------------------------------------------------------------------------|---------------------------------------------------------------|-----------|
| S1  | Commande trouvée                              | Saisir `42` dans le champ de recherche, cliquer Rechercher                                  | Bloc résultat affiche `Commande #42`, total `1500`, `paid`, `Dupont` | ✅ PASS |
| S2  | Commande introuvable                          | Saisir `999` dans le champ de recherche, cliquer Rechercher                                 | Message `Aucune commande trouvée pour le numéro 999`          | ✅ PASS |
| S3  | Champ vide — aucun appel réseau               | Laisser le champ vide, cliquer Rechercher (observer l'onglet Réseau du navigateur)          | Aucune requête vers `/orders/:id` émise                       | ✅ PASS |
| S4  | Erreur serveur (5xx)                          | Saisir `1` (simuler une erreur côté backend), cliquer Rechercher                            | Message `Une erreur est survenue, veuillez réessayer`         | ✅ PASS |

> **Preuve technique** : Playwright 4/4 verts (Chromium headless réel, `page.route()` pour intercepter le réseau, interaction DOM réelle fill/click). Rapport HTML uploadé comme artifact `playwright-report` sur chaque run CI.

---

## Acceptation métier PO — validation humaine distincte

> **Statut** : ✅ VALIDÉ — 4/4 scénarios acceptés par le PO.
>
> - **Date** : 2026-08-10
> - **Branche** : `integration/SHIAAAAAAAAAAAAAAAAAAAAAAAA-605`
> - **SHA** : `ed3f3a6db94208e0758bcc02fb92a2ec373c99a1`
> - **Interactions PO acceptées** : `117b6b3f`, `868cd890`, `644a4cfe` (checkbox, ask_user_questions, request_confirmation — toutes acceptées/répondues sur SHIAAAAAAAAAAAAAAAAAAAAAAAA-616)

La grille ci-dessus documente l'exécution automatisée Playwright (CI GitHub Actions, Chromium réel). La validation humaine PO (ci-dessus) est distincte et complémentaire. La décision finale de merge appartient au board.
