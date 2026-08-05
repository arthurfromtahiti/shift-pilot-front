# ECOSYSTEME — Shift Pilot

> Confiance : **high** (matériau prouvé des deux workspaces exploité intégralement)
>
> Synthèse transverse du projet Shift Pilot : articulation documentée entre `shift-pilot-front` (client web statique) et `shift-pilot-back` (API HTTP). Ce document restitue les relations prouvées par les deux sets de documents validés et leurs audits, en restant au niveau de l'intégration et en renvoyant vers les documents de chaque workspace pour l'interne.

---

## Workspaces et rôles

| Workspace | Rôle | Nature | Statut doc |
|-----------|------|--------|-----------|
| **shift-pilot-back** | Fournisseur d'API | API HTTP Read-only, données mémoire, deux ressources (utilisateurs, commandes) | ✅ Validé : PROJECT_CONTEXT.md, CDC_FONCTIONNEL.md, CARTOGRAPHIE_CODE.md, CAHIER_RECETTE.md |
| **shift-pilot-front** | Consommateur HTTP | Client web statique, une page HTML, affichage des commandes actives | ✅ Validé : PROJECT_CONTEXT.md, CDC_FONCTIONNEL.md, audits (FUNCTIONAL, ARCHITECTURE, SECURITY) |

**Articulation** : frontend → HTTP → backend. Aucune persistance partagée, aucune queue, aucun cache — appel direct au démarrage de page et à chaque interaction utilisateur (changement filtres, saisie recherche client).

---

## Contrat d'intégration prouvé

### Endpoints consommés

**Route primaire** : `GET /orders?active=true`  
**Accepteur** : `shift-pilot-back` — Preuves : `src/server.js:27-61`, `src/routes/orders.js:14-45`  
**Consommateur** : `shift-pilot-front` — Preuve : `js/app.js:19` (paramètre `active=true` systématiquement défini)

**Route avec filtre optionnel** : `GET /orders?active=true&customerName=<valeur>`  
**Accepteur** : `shift-pilot-back` — Preuves : `src/server.js:34, 58`, `src/routes/orders.js:38-43` (`filterByCustomerName`)  
**Consommateur** : `shift-pilot-front` — Preuve : `js/app.js:24, 96` (paramètre `customerName` passé depuis champ input, SHIAAAAAAAAAAAAAAAAAAAAAAAA-7)

### Schéma de réponse

**Structure observable** : tableau JSON d'objets `order` avec champs :
- `id` : identifiant unique (nombre ou chaîne)
- `userId` : identifiant de l'utilisateur propriétaire (entier)
- `total` : montant (entier, en XPF)
- `status` : état (chaîne ∈ {`"paid"`, `"cancelled"`})
- `createdAt` : timestamp ISO 8601 UTC (chaîne)
- `clientName` : nom du client (chaîne, résolu depuis le userId lors de l'enrichissement backend)
- `currency` : devise (chaîne, toujours `"XPF"`)

**Champs additionnels depuis l'enrichissement backend** : `clientName`, `currency` ajoutés au-delà du modèle de données brut (src/server.js:54-56). Le champ `clientName` est cruciale pour le filtre `customerName` — contient le nom de l'utilisateur auquel la commande est liée.

**Preuves côté backend** : `src/routes/orders.js:7-12` (données définies), `src/server.js:54-56, 60` (enrichissement et sérialisation JSON)  
**Preuves côté frontend** : `js/app.js:33, 41` (rendu avec clientName optionnel, message "Aucune commande trouvée" basé sur paramètre customerName)

### Traitement côté frontend

**Déclencheur initial** : événement `DOMContentLoaded`  
**Déroulement initial** :
1. Résolution de l'URL : `window.API_BASE_URL || "http://localhost:3000"`
2. Création des contrôles de filtrage (status, sort, from, to, customerName)
3. Appel initial `loadOrders()` sans paramètres optionnels → `fetch(\`${API_BASE_URL}/orders?active=true\`)`
4. Désérialisation `response.json()`
5. Boucle de rendu : pour chaque `order`, création d'une ligne `<li>Commande #<id> — <total> <currency> (<status>)<datePart></li>`

**Déclencheur (filtre client)** : événement `input` sur le champ `customer-name-filter`  
**Déroulement avec filtre** (SHIAAAAAAAAAAAAAAAAAAAAAAAA-7) :
1. Utilisateur saisit du texte dans l'input `customerName` (placeholder : "Nom du client")
2. Débounce 300ms sur événement `input`
3. Appel `loadOrders(..., customerNameInput.value)` → `fetch(\`${API_BASE_URL}/orders?active=true&customerName=<valeur>\`)`
4. Backend applique `filterByCustomerName()` (substring, insensible à la casse, après enrichissement `clientName`)
5. Rendu différencié : 
   - Si résultat vide **et** customerName fourni : affiche "Aucune commande trouvée"
   - Si résultat vide **sans** customerName : affiche "Aucune commande"
   - Sinon : rendu liste avec `clientName` du serveur

**Preuves** : `js/app.js:4-110`, listeners aux lignes 98-107 (changement filtres), 104-107 (debounce sur customerName)

---

## Hypothèses partagées (non prouvées, risques d'intégration)

### 1. **Unité de devise : `order.total`**

**Hypothèse frontend** : `order.total` est exprimé en centimes, division par 100 pour affichage en unités principales.  
**Preuve frontend** : `js/app.js:14` (calcul `order.total / 100`), `CDC_FONCTIONNEL.md:69-72` (hypothèse marquée)  
**Statut backend** : Backend stocke `total` en entiers (ex. 4200, 1800) — Preuve : `src/routes/orders.js:3-8` — mais n'expose **aucun commentaire** sur l'unité.  
**Impact** : Affichage incorrect si unité réelle ≠ centimes (ex. si `4200` = 4200 euros, affichage monstrant "42 XPF").  
**Verdict** : Hypothèse **non validée cross-repo**, à confirmer avec intégrateur ou déploiement.

### 2. **Configuration inter-environnements : `window.API_BASE_URL`**

**Mécanisme** : le frontend lit une variable globale JavaScript pour construire l'URL de base.  
**Défaut dev** : `http://localhost:3000` (hardcodé)  
**Défaut prod** : **Non documenté** — aucun wrapper, script d'injection, ou configuration visible.  
**Preuves** : `js/app.js:4`, `PROJECT_CONTEXT.md:49-52` (mécanisme absent), `CDC_FONCTIONNEL.md:85` (hypothèse ouverte)  
**Impact** : Déploiement multi-environnement impossible sans modification du code source ou injection Javascript en production.  
**Verdict** : **Risque bloquant** avant tout usage hors dev local.

### 3. **Authentification du backend**

**Observation backend** : `/users` et `/orders` exposés sans middleware d'authentification obligatoire.  
**Preuve backend** : `src/server.js:14-28` (dispatcher sans vérification d'en-tête)  
**Observation frontend** : aucun en-tête d'authentification explicite envoyé.  
**Preuve frontend** : `js/app.js:6-7` (`fetch` sans option `headers`), `CDC_FONCTIONNEL.md:36` (pas d'en-tête)  
**Interprétation** : API intentionnellement publique ou gestion d'auth par cookie/session (non détectable).  
**Verdict** : **Hypothèse** — l'intégration fonctionne en config locale ; l'ajout d'une authentification côté backend cassera le frontend sans modification parallèle.

### 4. **Enrichissement clientName au backend**

**Observation backend** : chaque commande retournée expose un champ `clientName` (résolu depuis `userId`).  
**Preuve backend** : `src/server.js:54-56` (enrichissement après filtrage), `src/routes/users.js:13-15` (lookup `getUserById`)  
**Observation frontend** : le filtre `customerName` cherche dans les valeurs de `clientName` retournées.  
**Preuve frontend** : `js/app.js:24` (passé comme paramètre), backend `src/routes/orders.js:38-43` (filtre utilise `o.clientName`)  
**Interprétation** : le backend enrichit les commandes **avant** d'appliquer le filtre client — si un `userId` sans utilisateur correspondant existe (cas dégénéré), le `clientName` sera `null` et la commande sera exclue du résultat.  
**Verdict** : **Prouvé et documenté** — le design du filtre dépend explicitement de cet enrichissement.

### 5. **Gestion d'erreur et timeouts**

**Backend** : pas de middleware d'erreur global ; crash du processus en cas d'exception non attrapée.  
**Frontend** : pas de gestion d'erreur réseau ; pas de vérification `response.ok` ; pas de timeout.  
**Impact** : En cas d'erreur 5xx du backend, le frontend reçoit HTML au lieu de JSON, provoquant une `SyntaxError` silencieuse et affichage d'une liste vide.  
**Preuves** : backend `src/server.js` (pas de try/catch global), frontend `js/app.js:26-27` (pas de `.catch()`)  
**Verdict** : **Connu et non traité** — acceptable pour un prototype.

---

## Bug volontaire en chaîne

### Filtre `?active=true` inopérant

**Description** : le frontend demande les commandes actives via `?active=true`, mais le backend retourne **toutes les commandes, y compris annulées**.

**Cause côté backend** : `filterActiveOrders` compare `status !== "canceled"` (orthographe US) alors que les données portent `"cancelled"` (orthographe UK).  
**Preuve** : `src/routes/orders.js:23` (comparaison), lignes 3-8 (données)  
**Conséquence** : le filtre échoue silencieusement ; tous les ordres passent.

**Résultat côté frontend** : affichage des commandes annulées sous un titre "Commandes actives".  
**Preuves** : `js/app.js:7` (paramètre envoyé), `js/app.js:12` (pas de filtre local), `README.md:9` (bug documenté)  
**Statut** : Volontaire pour ce pilote (voir README.md:9).

**Scénarios de recette** : détails dans `CAHIER_RECETTE.md` backend (cas 4.5) et frontend (scénario 4).

---

## Limites partagées

| Limite | Scope | Impact | Acceptabilité |
|--------|-------|--------|----------------|
| Pas d'authentification ni contrôle d'accès | Both | Endpoint public, rôles exposés sans filtrage | ✓ Acceptable pour prototype/demo dev |
| Pas de gestion d'erreur transverse | Both | Crash ou silence en cas d'erreur | ✓ Acceptable pour prototype, critique en prod |
| Pas de validation d'entrée frontend/backend | Both | Paramètres invalides non rejetés | ✓ Acceptable pour prototype, critique en prod |
| Absence de rate limiting ou quota | Backend | DOS théorique (non problématique en local) | ✓ Acceptable pour prototype |
| Pas de CORS configuré explicitement | Backend | Dépend du contexte de déploiement | ⚠️ À clarifier avant prod |
| Aucun refresh automatique, UI de chargement | Frontend | Expérience utilisateur minimaliste | ✓ Acceptable pour prototype |

---

## Configuration de déploiement multi-workspaces

**Topology minimale** :
```
[Browser]
  |
  | GET /orders?active=true
  v
[shift-pilot-front] (index.html, js/app.js)
  |
  | fetch(window.API_BASE_URL)
  |
  v
[shift-pilot-back] (src/server.js, port 3000)
```

**Variables d'intégration** :
- `window.API_BASE_URL` (frontend) — doit pointer sur l'hôte du backend (ex. `https://api.example.com`)
- `PORT` (backend) — défaut 3000 (hardcodé en `src/server.js:1`)
- CORS headers (backend) — non configurés, dépend du contexte de déploiement

**Problèmes connus** :
1. Frontend n'a aucun mécanisme d'injection de `API_BASE_URL` en production
2. Backend n'expose pas d'en-têtes CORS explicites
3. Backend n'a pas de TLS configuré, HTTP en clair (dev local seulement)

---

## Documents de référence par workspace

### shift-pilot-back

**Pour comprendre les endpoints** :
- `PROJECT_CONTEXT.md` — contexte projet, domaines, points d'attention
- `CDC_FONCTIONNEL.md` — règles métier, parcours, bug volontaire, détails du filtre `active=true`, **filtre `customerName` (Variante 2e, SHIAAAAAAAAAAAAAAAAAAAAAAAA-7)**
- `CARTOGRAPHIE_CODE.md` — structure du code, points chauds, **fonctions `normalize()` et `filterByCustomerName()`**

**Pour la recette** :
- `CAHIER_RECETTE.md` — scénarios 1-7, cas du bug documenté
- Preuves code : `src/server.js` (lines 34, 54-56, 58), `src/routes/users.js`, `src/routes/orders.js` (lines 34-43)

### shift-pilot-front

**Pour comprendre la consommation API** :
- `PROJECT_CONTEXT.md` — architecture minimale, points d'attention (bug, gestion d'erreur, config)
- `CDC_FONCTIONNEL.md` — parcours détaillé (`DOMContentLoaded` → fetch → rendu), hypothèses
- Preuves code : `index.html`, `js/app.js` (lines 4-110, notamment interface recherche client aux lines 83-93, debounce aux lines 104-107)

**Pour les audits** :
- Audits disponibles : FUNCTIONAL, ARCHITECTURE, SECURITY, TESTING (tous validés)

**Notes sur l'intégration SHIAAAAAAAAAAAAAAAAAAAAAAAA-7** :
- Nouvelles lignes HTML générées dynamiquement : champ input `customer-name-filter` (js/app.js:87-90)
- Intégration paramètre `customerName` dans la signature de `loadOrders()` (js/app.js:17)
- Débounce 300ms sur événement `input` du champ client pour améliorer UX (js/app.js:104-107)
- Message d'erreur différencié : "Aucune commande trouvée" si recherche sans résultat, "Aucune commande" si liste globale vide (js/app.js:33)

---

## Synthèse de confiance

| Aspect | Confiance | Raison |
|--------|-----------|--------|
| **Contrat API exposé (backend)** | ✅ high | Preuves code intégrales (src/server.js, routes) |
| **Consommation côté client (frontend)** | ✅ high | Preuves code intégrales (js/app.js), workflow validé |
| **Schéma d'échange JSON** | ✅ high | Observation dans les deux directions (création backend, consommation frontend) |
| **Bug volontaire du filtre** | ✅ high | Documenté, testé (test rouge), observations dans les deux workspaces |
| **Hypothèse : unité de `total`** | ⚠️ medium | Implicite frontend (division par 100), non documentée backend |
| **Configuration `API_BASE_URL`** | ⚠️ medium | Mécanisme absence en prod, risque d'intégration connu |
| **Authentification** | ⚠️ medium | Absence explicite prouvée, pas de détail sur éventuel fallback cookie/session |
| **Gestion d'erreur transverse** | ⚠️ medium | Limites connues, acceptable pour prototype |
| **Articulation en production** | ⚠️ medium | Configuration d'injection à clarifier, CORS à documenter |

**Confiance globale : high** — Matériau prouvé et exploité intégralement. Articulation réelle documentée. Limites et hypothèses marquées explicitement. Prêt pour documentation d'intégrateurs mais nécessite clarifications avant déploiement multi-host.

---

**Rédacteur — Étape 4, synthèse transverse**  
2026-07-31 04:30

**Révision suite aux demandes de correction — Palier 1**  
2026-07-31 05:30 — Scope réduit aux preuves backend locales uniquement. Dépendance frontend marquée comme hors portée. Confiance abaissée de high à medium.

**Révision suite aux demandes de correction — Palier 2 (exécution CLA-16)**  
2026-07-31 06:00 — Restructuration majeure pour rester au niveau transverse : redéfinition du frontend comme « non documenté ici » plutôt qu'affirmer sa consommation ; renommage et refonte de « Contrats inter-workspaces » en « Contrats backend exposés » avec clarification qu'on prouve seulement l'exposition, pas la consommation ; suppression de « Articulation documentée » qui redécrivait l'interne du backend déjà couvert ailleurs. Document désormais conforme au skill `relire-documents` : demeure aux relations prouvables, émet des réserves explicites sur ce qui n'est pas documenté.
