# WORKFLOW_AFFICHAGE_COMMANDES_ACTIVES — Affichage de la liste des commandes actives

## Classification
- **Type** : `user_journey`
- **Sous-type** : lecture / rendu de liste
- **Visibilité** : `external_user`
- **Acteur principal** : Utilisateur final (ouverture de la page dans un navigateur)
- **Acteurs** : Navigateur, API `shift-pilot-back`, DOM
- **Criticité** : Basse — dépôt explicitement désigné comme « test jetable » (`README.md:3`)
- **Confiance** : medium
- **Justification** : Le dépôt entier tient en 19 lignes de code actif (3 fichiers lus intégralement). La fonction `loadActiveOrders` est le seul chemin d'exécution ; aucun branchement conditionnel, aucune abstraction. Confiance abaissée à `medium` car deux éléments du contrat de données (`order.total` en centimes, schéma de réponse API) restent des hypothèses non prouvables dans ce dépôt.

## Objectif
Présenter à l'utilisateur final la liste des commandes actives récupérées depuis l'API `shift-pilot-back`. À l'ouverture de la page, le front appelle l'API, désérialise la réponse JSON et injecte une liste d'éléments `<li>` dans le DOM. Aucune interaction utilisateur au-delà du chargement initial n'est prévue.

## Acteurs
- **Utilisateur final** : déclenche le workflow en ouvrant la page dans un navigateur.
- **API `shift-pilot-back`** : système externe, appelée par le front via `GET /orders?active=true` ; le front tente de lire `id`, `total` et `status` sur chaque élément de la réponse JSON (schéma du backend non déclaré dans ce dépôt).
- **Navigateur / DOM** : exécute le JS, héberge `<ul id="orders-list">`.

## Points d'entrée
- `index.html` — page unique servie statiquement (`index.html:1-12`)
- Événement `DOMContentLoaded` sur `document` → appel `loadActiveOrders()` (`js/app.js:19`)
- URL appelée : `GET ${API_BASE_URL}/orders?active=true` (`js/app.js:7`)

## Étapes principales
1. **Déclenchement** : à l'ouverture de la page, l'événement `DOMContentLoaded` appelle `loadActiveOrders()` (`js/app.js:19`).
2. **Résolution de l'URL de base** : `API_BASE_URL` prend la valeur de `window.API_BASE_URL` si elle est définie, sinon `"http://localhost:3000"` (`js/app.js:4`).
3. **Appel API** : `fetch(\`${API_BASE_URL}/orders?active=true\`)` — requête `GET` sans en-tête d'authentification, sans timeout (`js/app.js:7`).
4. **Désérialisation** : `response.json()` transforme le corps de la réponse en tableau JS (`js/app.js:8`). Aucune vérification du statut HTTP (`response.ok`) avant cette étape.
5. **Effacement du conteneur** : `list.innerHTML = ""` vide `<ul id="orders-list">` avant le rendu (`js/app.js:11`).
6. **Rendu de la liste** : boucle `for...of` sur le tableau ; pour chaque objet `order`, création d'un `<li>` formaté et ajouté au DOM (`js/app.js:12-16`).
7. **Formatage d'une ligne** : `item.textContent = \`Commande #${order.id} — ${order.total / 100} XPF (${order.status})\`` (`js/app.js:14`). La valeur `order.total` est divisée par 100 et affichée avec le suffixe `XPF` — l'unité de `order.total` n'est pas déclarée dans ce dépôt (voir Questions ouvertes).

## Règles métier
- **Filtre « actif » délégué au back** : le paramètre `?active=true` est envoyé dans la requête, mais — bug documenté — le filtre côté back ne fonctionne pas (`README.md:9`). Le front ne filtre pas lui-même : il affiche **tout** ce que l'API renvoie, y compris les commandes annulées (`js/app.js:12` : boucle sans condition de filtre).
- **Division par 100 et affichage XPF** : le code effectue `order.total / 100` et affiche le résultat avec le suffixe `XPF` (`js/app.js:14`). **HYPOTHÈSE** : l'interprétation de cette division comme « centimes → francs pacifiques » n'est pas prouvée dans ce dépôt — l'unité de `order.total` côté back n'y est pas déclarée.
- **URL de base configurable** : `window.API_BASE_URL` permet de surcharger l'URL sans modifier le code (`js/app.js:4`). Si absent, la valeur par défaut est `"http://localhost:3000"`.
- **Aucune gestion d'erreur** : ni `try/catch`, ni vérification `response.ok`, ni traitement d'une liste vide (`js/app.js:6-17`). Un échec réseau ou une réponse non-JSON lève une exception non capturée et silencieuse pour l'utilisateur.

## Données
- `order.id` : identifiant de commande — affiché dans le titre de chaque ligne (`js/app.js:14`)
- `order.total` : valeur numérique reçue de l'API ; l'unité n'est pas déclarée dans ce dépôt — le front divise par 100 et affiche le résultat avec le suffixe `XPF` (`js/app.js:14`)
- `order.status` : statut de commande — affiché entre parenthèses (`js/app.js:14`)
- Tableau `orders` : reçu de l'API sous forme de JSON, non défini dans ce dépôt (`js/app.js:8`)

## Intégrations
- **`shift-pilot-back`** (HTTP GET, sortant) : `GET ${API_BASE_URL}/orders?active=true` → réponse JSON parsée comme tableau ; le front tente de lire `id`, `total` et `status` sur chaque élément (`js/app.js:12-14`). URL configurable via `window.API_BASE_URL` (défaut `http://localhost:3000`, `js/app.js:4`). Aucun en-tête d'authentification côté client. Aucun retry ni timeout.

## Risques
- **Erreur réseau ou réponse non-JSON non capturée** : si l'API est indisponible ou renvoie un corps non-JSON (erreur 500 HTML, redirect), `response.json()` rejette la Promise et lève une exception non capturée ; la liste reste vide sans aucun message d'erreur visible pour l'utilisateur (`js/app.js:7-8`, absence de `try/catch`).
- **Affichage de commandes annulées dans « Commandes actives »** : le filtre `?active=true` n'est pas appliqué côté back (`README.md:9`) et le front ne filtre pas lui-même (`js/app.js:12`) → l'utilisateur voit toutes les commandes, annulées incluses. Bug documenté et identifié comme volontaire dans le README.
- **Pas de rafraîchissement** : la liste n'est chargée qu'une fois à l'ouverture ; les nouvelles commandes créées côté back n'apparaissent pas sans rechargement manuel de la page (aucun polling, WebSocket ou autre mécanisme dans `js/app.js`).
- **Absence de risque XSS** : le rendu utilise `.textContent` (`js/app.js:14`), pas `.innerHTML` → les données API ne peuvent pas injecter de HTML arbitraire.

## Questions ouvertes
- Le contrat de format `order.total` en centimes est-il confirmé côté `shift-pilot-back` ? (HYPOTHÈSE — non déclaré dans ce dépôt)
- `window.API_BASE_URL` : quel mécanisme l'injecte en production ? (non visible dans ce dépôt — potentiellement `index.html` modifié par un serveur, une variable d'environnement d'un wrapper de déploiement, ou injection manuelle)
- L'absence totale de gestion d'erreur et d'état de liste vide est-elle un choix délibéré du pilote ou une lacune à corriger ?

## Preuves
- `js/app.js` — lu intégralement (19 lignes)
- `index.html` — lu intégralement (12 lignes)
- `README.md` — lu intégralement (14 lignes)
