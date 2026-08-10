# Traçabilité d'acceptation — SHIAAAAAAAAAAAAAAAAAAAAAAAA-605

**Ticket** : SHIAAAAAAAAAAAAAAAAAAAAAAAA-605 — Retrouver une commande par numéro  
**Tests** : `tests/e2e/acceptance-605.spec.js`  
**Exécution** : Playwright / Chromium (4 scénarios)

## Matrice de traçabilité

| ID  | Critère d'acceptation PO                                           | Test Playwright                                                      | Résultat |
|-----|--------------------------------------------------------------------|----------------------------------------------------------------------|----------|
| S1  | Commande trouvée → affiche total, status, clientName               | `S1 : commande trouvée → affiche total, status et clientName`        | ✅ PASS  |
| S2  | Commande introuvable (404) → message "Aucune commande trouvée …"   | `S2 : commande introuvable (404) → "Aucune commande trouvée …"`      | ✅ PASS  |
| S3  | Champ vide + clic → zéro appel réseau vers /orders/:id             | `S3 : champ vide → clic bouton → zéro appel réseau vers /orders/:id` | ✅ PASS  |
| S4  | Erreur serveur (5xx) → "Une erreur est survenue, veuillez réessayer" | `S4 : erreur serveur (5xx) → "Une erreur est survenue …"`           | ✅ PASS  |

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
