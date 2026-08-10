# Traçabilité d'acceptation — SHIAAAAAAAAAAAAAAAAAAAAAAAA-605

**Ticket** : SHIAAAAAAAAAAAAAAAAAAAAAAAA-605 — Retrouver une commande par numéro  
**Tests** : `tests/e2e/acceptance-605.spec.js`  
**Exécution** : Playwright / Chromium (4 scénarios)  
**Résultats** : CI GitHub Actions (ubuntu-latest, `npx playwright install --with-deps chromium`) — 4 scénarios verts. SHA référence : HEAD de `integration/SHIAAAAAAAAAAAAAAAAAAAAAAAA-605` (voir run CI associé à la PR finale).

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

> Cette section trace la recette métier PO, distincte des tests automatisés CI.  
> Le PO rejoue manuellement les 4 scénarios sur la branche `integration/SHIAAAAAAAAAAAAAAAAAAAAAAAA-605` avant merge.

### Grille de recette PO

| ID  | Scénario PO                                   | Étapes manuelles                                                                            | Résultat attendu                                              | Statut PO |
|-----|-----------------------------------------------|---------------------------------------------------------------------------------------------|---------------------------------------------------------------|-----------|
| S1  | Commande trouvée                              | Saisir `42` dans le champ de recherche, cliquer Rechercher                                  | Bloc résultat affiche `Commande #42`, total `1500`, `paid`, `Dupont` | ⏳ À valider |
| S2  | Commande introuvable                          | Saisir `999` dans le champ de recherche, cliquer Rechercher                                 | Message `Aucune commande trouvée pour le numéro 999`          | ⏳ À valider |
| S3  | Champ vide — aucun appel réseau               | Laisser le champ vide, cliquer Rechercher (observer l'onglet Réseau du navigateur)          | Aucune requête vers `/orders/:id` émise                       | ⏳ À valider |
| S4  | Erreur serveur (5xx)                          | Saisir `1` (simuler une erreur côté backend), cliquer Rechercher                            | Message `Une erreur est survenue, veuillez réessayer`         | ⏳ À valider |

> **Note** : La CI valide automatiquement S1–S4 via Playwright. La colonne « Statut PO » est à compléter par le PO après recette manuelle sur la branche d'intégration.
