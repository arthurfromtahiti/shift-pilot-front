# Points chauds du code — Audit

> Confiance : high

## Compréhension globale

Le dépôt compte exactement deux fichiers de code actif — `index.html` (12 lignes) et `js/app.js` (19 lignes). Il n'existe qu'un seul « point chaud » possible : la fonction `loadActiveOrders()` dans `js/app.js`, qui concentre l'intégralité de la logique applicative. Pas de fichier volumineux, pas de couplage multiple, pas de code mort observable.

## Résumé exécutif

Le seul fichier à risque est `js/app.js` — non par sa taille (19 lignes), mais parce qu'il est **l'unique point de défaillance du système** : toute la logique (configuration, appel réseau, désérialisation, manipulation DOM) y est concentrée dans une seule fonction sans filet de sécurité. Un développeur qui touche `loadActiveOrders()` modifie simultanément le transport, la sérialisation et le rendu. Sans tests, toute régression sur ce fichier est invisible jusqu'à l'exécution en navigateur. `index.html` est trivial et sans risque. `README.md` est purement documentaire.

## Constats détaillés

**VÉRIFIÉ_CODE — `loadActiveOrders()` : fonction multi-responsabilités.** Les lignes 6-17 de `js/app.js` enchaînent sans séparation : résolution de l'URL (`js/app.js:4` lue au scope du module), appel réseau `fetch` (`js/app.js:7`), désérialisation `response.json()` (`js/app.js:8`), manipulation DOM (obtention de l'élément `orders-list`, effacement, boucle d'ajout de `<li>`) (`js/app.js:10-16`). Ces responsabilités distinctes sont fondues en une seule unité — acceptable pour 19 lignes, mais indivisible sans refactoring complet si une seule d'entre elles doit évoluer.

**VÉRIFIÉ_CODE — Aucune abstraction, aucune extraction.** Il n'existe pas de fonction utilitaire, pas de constante nommée autre que `API_BASE_URL`, pas de helper de formatage séparé. Le formatage `Commande #${order.id} — ${order.total / 100} XPF (${order.status})` est directement dans la boucle (`js/app.js:14`) — invisible à un test unitaire.

**VÉRIFIÉ_CODE — `list.innerHTML = ""` : effacement destructif sans transition.** Ligne 11 de `js/app.js`, le conteneur est vidé avant reconstruction. Pour ce prototype, ce n'est pas un problème. Sur une page avec rafraîchissement ou animations, cela produirait un clignotement visible.

**VÉRIFIÉ_CODE — Point d'entrée unique, pas de branchement conditionnel.** `document.addEventListener("DOMContentLoaded", loadActiveOrders)` (`js/app.js:19`) est le seul déclencheur. Aucun branchement sur l'état de la réponse (pas de branche erreur, pas de branche liste vide). Le chemin heureux (`fetch` réussi, tableau non vide) est le seul chemin codé.

**VÉRIFIÉ_CODE — Absence totale de gestion de cas limites.** Aucune branche pour : réponse HTTP non-2xx (`response.ok` non vérifié), corps non-JSON, tableau vide retourné (`[]`), champs `order` absents ou `null`, timeout réseau. Ces cas tombent tous dans le même comportement : liste vide sans message, ou exception non capturée.

## Forces

- **Taille négligeable** : avec 19 lignes actives, tout développeur maîtrise l'ensemble du code en moins de deux minutes — aucun effet de surprise possible dans le code lui-même.
- **Pas de code mort** : chaque ligne est exécutée ou référencée au chargement de la page. Pas d'import inutilisé, pas de fonction orpheline.
- **Pas de couplage inter-fichiers** : `app.js` ne dépend d'aucune autre bibliothèque ou module du dépôt.

## Dettes techniques

- **Tout dans une seule fonction** : `loadActiveOrders()` (`js/app.js:6-17`) ne peut pas être testée unitairement dans son état actuel — réseau, DOM et logique de formatage sont indissociables.
- **Template littéral de formatage non extractible** : `js/app.js:14` intègre la règle de formatage d'une commande directement dans la boucle de rendu. Toute évolution du format (ajout d'un champ, changement de devise) implique d'éditer la même ligne que le rendu DOM.

## Zones critiques

- **`js/app.js` lignes 7-8`** : jonction `fetch` + `response.json()` sans vérification de statut ni capture. Premier endroit où un senior regarderait si l'application ne charge rien.
- **`js/app.js` ligne 14`** : le formatage de commande — les trois champs du contrat API (`id`, `total`, `status`) sont consommés ici. Toute évolution du schéma back se manifeste d'abord sur cette ligne.

## Risques

- **Régression invisible** : sans tests, toute modification de `loadActiveOrders()` ne peut être validée qu'en exécutant manuellement la page dans un navigateur avec un back fonctionnel — `js/app.js:6-17`.
- **Point de défaillance unique** : l'application entière repose sur une seule fonction asynchrone sans filet. Si elle lève une exception, l'application est muette et vide — `js/app.js:6-19`.

## Recommandations priorisées

1. **Extraire la logique de formatage** d'une commande dans une fonction dédiée (`formatOrder(order)`) — `js/app.js:14`. Étape minimale qui rendrait le formatage testable indépendamment du DOM.
2. **Séparer l'appel réseau du rendu** en deux fonctions distinctes (`fetchOrders()` et `renderOrders(orders)`) — `js/app.js:6-17`. Rendrait chaque partie individuellement testable et lisible.
3. **Ajouter a minima un `try/catch`** autour du bloc `fetch` + `response.json()` avec un message d'erreur visible — `js/app.js:7-8`.

## Questions ouvertes

- La fonction `loadActiveOrders()` est-elle destinée à être réutilisée ou étendue, ou restera-t-elle un one-shot de prototype ?
- Un mécanisme de rafraîchissement automatique (polling, WebSocket) est-il prévu ? Si oui, la structure actuelle ne le supporte pas sans refactoring.
