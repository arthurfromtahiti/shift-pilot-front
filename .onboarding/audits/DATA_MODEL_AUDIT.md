# Modèle de données — Audit

> Confiance : medium

## Compréhension globale

`shift-pilot-front` ne définit aucun modèle de données propre. La seule entité manipulée, `order`, est reçue du backend sous forme de tableau JSON et consommée à la volée sans déclaration de schéma, sans validation ni mapping. Toute affirmation sur la structure réelle de cette entité est une hypothèse non vérifiable dans ce seul dépôt.

## Résumé exécutif

Ce dépôt est un **consommateur passif** de données : il n'a pas de base de données, pas de modèle local, pas de migration, pas de DTO, pas de type déclaré. L'entité `order` est implicitement supposée contenir `id`, `total` et `status` — ces trois champs sont lus directement dans la boucle de rendu (`js/app.js:14`) sans vérification préalable de leur présence ou de leur type. Si le back renvoie un objet dont l'un de ces champs est absent, `undefined` s'affiche silencieusement dans l'interface. La confidentialité du modèle côté back est totale depuis ce dépôt : aucun schéma, aucune documentation d'API, aucun fichier de types partagé n'y est présent.

## Constats détaillés

**VÉRIFIÉ_CODE — Schéma implicite en trois champs.** La boucle de rendu (`js/app.js:12-16`) accède à `order.id`, `order.total` et `order.status` (`js/app.js:14`). Ce sont les seuls champs dont l'existence est supposée côté front. Aucune vérification de présence (`order.id !== undefined`), de type (`typeof order.total === 'number'`) ou de valeur nulle n'est effectuée.

**VÉRIFIÉ_CODE — Pas de validation du corps de réponse.** Après `response.json()` (`js/app.js:8`), la valeur retournée est supposée être un tableau d'objets. Si l'API renvoie `null`, un objet unique non encapsulé, ou un tableau d'éléments sans les propriétés attendues, la boucle `for...of` échouera (`TypeError: null is not iterable`) ou produira un affichage dégradé (champs `undefined`), sans message d'erreur.

**HYPOTHÈSE — `order.total` en plus petite unité monétaire.** `js/app.js:14` effectue `order.total / 100` et affiche le résultat avec le suffixe `XPF`. L'interprétation de cette division comme « centimes → francs pacifiques » est plausible mais non prouvable depuis ce dépôt : la déclaration de l'unité du champ `total` appartient au modèle de `shift-pilot-back`, non consultable ici.

**VÉRIFIÉ_CODE — Aucune relation, aucune contrainte locale.** Il n'y a pas de modèle relationnel côté front, pas de clé étrangère, pas de jointure. Chaque `order` est traité de façon indépendante.

**VÉRIFIÉ_CODE — Aucune persistance locale.** Pas de `localStorage`, pas de `sessionStorage`, pas d'IndexedDB, pas de cache Service Worker. Les données affichées disparaissent à chaque rechargement de page et sont re-fetched intégralement depuis l'API.

## Forces

- **Aucune dette de migration** : sans modèle local, il n'y a aucun schéma à faire évoluer, aucun upgrade script à maintenir.
- **Stateless côté client** : le front est entièrement dirigé par les données du back — aucune désynchronisation possible entre un état local et l'API.

## Dettes techniques

- **Contrat API implicite et non déclaré** : les champs `id`, `total`, `status` sont supposés présents sur chaque `order` sans qu'aucun contrat formel (typedef TypeScript, JSON Schema, commentaire de schéma) ne l'exprime — `js/app.js:14`. Une évolution du modèle côté back (renommage, suppression, changement d'unité) ne serait détectée qu'à l'exécution.
- **Absence de validation de la réponse** : `response.json()` (`js/app.js:8`) est appelé sans vérification de `response.ok` ni validation de la structure retournée. Un changement de format API produit un rendu dégradé silencieux plutôt qu'une erreur explicite.

## Zones critiques

- **`js/app.js` ligne 14** : le seul endroit où la structure de `order` est supposée. Si le schéma API change, c'est ici que la régression se manifeste, silencieusement.

## Risques

- **Régression silencieuse sur changement de schéma** : si `shift-pilot-back` renomme `total` en `amount` ou `status` en `state`, le front affiche `undefined` pour les champs concernés, sans alerte, sans log, sans message utilisateur (`js/app.js:14`).
- **HYPOTHÈSE — Division par 100 incorrecte si l'unité change** : si `order.total` est déjà exprimé en unité entière (non en centimes), la division par 100 produirait des montants 100 fois trop petits, affichés sans signalement d'anomalie.

## Recommandations priorisées

1. **Documenter le contrat d'API** (champs attendus, types, unités) dans le README ou dans un fichier dédié — pour que la dépendance implicite à `{id, total, status}` soit explicite et connue des deux côtés — `js/app.js:14`, `README.md`.
2. **Ajouter une validation minimale de la réponse** : vérifier que le corps est bien un tableau avant la boucle, et que `order.total` est bien un nombre avant la division — `js/app.js:8-12`.

## Questions ouvertes

- Quelle est la valeur attendue de `order.status` ? Le front l'affiche telle quelle (`js/app.js:14`) — est-ce une chaîne libre, un enum (`active`, `cancelled`…) ?
- L'unité de `order.total` est-elle bien des centimes (XPF) ? Ce contrat est-il documenté côté `shift-pilot-back` ?
- Existe-t-il d'autres champs dans l'objet `order` renvoyé par le back, non utilisés par le front ?
