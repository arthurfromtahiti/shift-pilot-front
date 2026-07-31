# Fonctionnel — Audit

> Confiance : high

## Compréhension globale

La fonctionnalité déclarée est l'affichage de la liste des commandes actives. Dans l'état actuel du dépôt, un bug fonctionnel prouvé existe : la liste affichée n'est pas filtrée aux seules commandes actives (documenté dans `README.md:9`). Par ailleurs, trois états UX courants sont absents du code : chargement, erreur, liste vide — leur absence constitue une dette de qualité, mais aucun document dans ce dépôt ne les spécifie formellement comme exigences. Le titre `<h1>Commandes actives</h1>` (`index.html:8`) ne correspond pas aux données réellement affichées : la boucle itère sur toutes les commandes retournées par l'API, y compris les annulées (`js/app.js:12`, `README.md:9`).

## Résumé exécutif

Le front affiche le titre `<h1>Commandes actives</h1>` (`index.html:8`) et charge une liste via `GET /orders?active=true` (`js/app.js:7`), mais le filtre `active=true` n'est pas appliqué côté back (`README.md:9`), et le front n'en applique aucun lui-même (`js/app.js:12` : boucle sans condition). Les commandes annulées apparaissent donc sous un titre qui promet uniquement les actives — bug documenté et volontaire pour ce pilote. Par ailleurs, trois états UX courants sont absents du code : aucun indicateur de chargement, aucune branche d'erreur, aucun message pour liste vide. Ces absences sont des lacunes de qualité ; elles n'ont pas été observées en runtime dans ce dépôt, mais constituent des risques plausibles pour un usage au-delà du développement local.

## Constats détaillés

**VÉRIFIÉ_CODE — Bug fonctionnel documenté : affichage des commandes annulées.** Le paramètre `?active=true` est bien envoyé dans la requête (`js/app.js:7`), mais le README indique explicitement que « le filtre back ne fonctionne pas » (`README.md:9`). La boucle de rendu (`js/app.js:12`) itère sur tout ce que l'API renvoie, sans filtre côté client. L'interface affiche donc toutes les commandes sous le titre « Commandes actives » — incohérence fonctionnelle intentionnelle dans ce prototype.

**VÉRIFIÉ_CODE — Aucun indicateur visuel de chargement dans le code.** Entre le déclenchement du `fetch` (`js/app.js:7`) et l'injection des `<li>` dans le DOM (`js/app.js:12-16`), aucun spinner ni texte transitoire n'est inséré dans le HTML. **HYPOTHÈSE — Impact utilisateur :** pendant cette fenêtre, la liste serait vraisemblablement vide et indiscernable d'une liste vide légitime ou d'une erreur silencieuse — mais ce comportement n'a pas été observé en runtime dans ce dépôt.

**VÉRIFIÉ_CODE — Aucune branche de gestion d'erreur dans le code.** En cas d'échec réseau, de timeout, ou de réponse non-JSON, la Promise est rejetée sans `catch` (`js/app.js:6-17`). **HYPOTHÈSE — Impact utilisateur :** la liste resterait vide et la page ne communiquerait rien — l'erreur serait visible uniquement dans la console, pas dans l'interface — mais ce comportement n'a pas été vérifié en runtime dans ce dépôt.

**VÉRIFIÉ_CODE — Aucun message pour état liste vide.** Si l'API renvoie un tableau vide `[]`, la boucle `for...of` n'itère pas et le `<ul id="orders-list">` reste sans `<li>` (`js/app.js:12-16`). Aucun message alternatif (ex. « Aucune commande active ») n'est inséré dans le DOM. **HYPOTHÈSE — Impact utilisateur :** dans ce cas, la page serait visuellement identique à la page en cours de chargement ou en état d'erreur silencieuse — mais cette ambiguïté n'a pas été observée en runtime dans ce dépôt.

**VÉRIFIÉ_CODE — Aucun rafraîchissement automatique.** La liste est chargée une seule fois à l'ouverture de la page (`js/app.js:19`). Aucun polling, aucun WebSocket, aucun bouton de rechargement n'est prévu. Les nouvelles commandes créées après le chargement initial ne s'affichent qu'au rechargement manuel de la page.

**VÉRIFIÉ_CODE — Expression de formatage du montant.** Le code calcule `order.total / 100` et affiche le résultat avec le suffixe `XPF` (`js/app.js:14`).

**HYPOTHÈSE — Unité de `order.total` : centimes de franc pacifique.** La division par 100 suggère que `order.total` est stocké en centimes, mais ce contrat n'est pas documenté dans ce dépôt. Si l'unité est différente, les montants affichés seraient systématiquement erronés sans alerte visible.

**VÉRIFIÉ_CODE — Titre de page cohérent avec la fonctionnalité déclarée.** `<title>Shift Pilot — Commandes</title>` (`index.html:5`) et `<h1>Commandes actives</h1>` (`index.html:8`) sont cohérents avec l'intention de la fonctionnalité, malgré le bug de filtrage.

## Forces

- **Fonctionnalité lisible** : l'intention (afficher des commandes) est perceptible immédiatement, sans ambiguïté, dans le code et dans l'interface.
- **Rendu sûr** : `.textContent` (`js/app.js:14`) garantit qu'aucune valeur de l'API ne peut injecter du HTML arbitraire dans la page.
- **Configuration de l'URL d'API exposée** : `window.API_BASE_URL` (`js/app.js:4`) permet d'adapter le front à différents environnements sans modifier le code.

## Dettes techniques

- **Bug fonctionnel visible** : « Commandes actives » affiche les commandes annulées — `README.md:9`, `js/app.js:12`. Documenté comme volontaire pour le pilote ; à corriger avant tout usage en production.
- **Trois états UX manquants** : chargement, erreur, liste vide — leur absence rend l'interface ambiguë dans des situations courantes (`js/app.js:6-17`).
- **Données non rafraîchies** : la liste est statique après le chargement initial — `js/app.js:19`.

## Zones critiques

- **`js/app.js` lignes 6-17`** : le seul endroit où les trois états manquants (chargement, erreur, vide) devraient être gérés.
- **`README.md` ligne 9`** : le bug documenté de filtrage — sa correction est côté back, mais la décision d'ajouter un filtre côté front appartient au périmètre de ce dépôt.

## Risques

- **HYPOTHÈSE — Expérience utilisateur dégradée** : un utilisateur qui voit une liste vide ne saurait pas distinguer un bug, une erreur réseau ou une liste réellement vide (`js/app.js:10-16`). Ce comportement n'a pas été observé en runtime dans ce dépôt.
- **VÉRIFIÉ_CODE — Données incorrectes** : les commandes annulées apparaissent sous « Commandes actives » (`README.md:9`, `js/app.js:12`). **HYPOTHÈSE** — En production, cela induirait les utilisateurs en erreur si l'intention est de n'afficher que les commandes actives.
- **HYPOTHÈSE — Montants incorrects si l'unité de `order.total` n'est pas des centimes** : l'affichage serait systématiquement erroné, sans alerte — `js/app.js:14`.

## Recommandations priorisées

1. **Corriger le bug d'affichage des commandes annulées** — soit côté back (correction du filtre), soit côté front (filtre sur `order.status` dans la boucle de rendu) — `js/app.js:12`, `README.md:9`. C'est le seul bug fonctionnel visible pour l'utilisateur final.
2. **Ajouter un état d'erreur visible** (message dans l'UI en cas d'échec réseau) — `js/app.js:7-8`. Priorité haute pour tout usage au-delà du développement local.
3. **Ajouter un message pour liste vide** (`<li>Aucune commande active.</li>` si le tableau est vide) — `js/app.js:12`. Priorité moyenne.
4. **Confirmer le contrat `order.total` en centimes** côté `shift-pilot-back` et documenter l'unité dans le README — `js/app.js:14`.

## Questions ouvertes

- La correction du filtre `?active=true` doit-elle être portée côté back, côté front (filtre sur `status`), ou les deux ?
- Un rafraîchissement automatique de la liste est-il prévu à terme ?
- L'unité de `order.total` est-elle documentée dans `shift-pilot-back` ?
