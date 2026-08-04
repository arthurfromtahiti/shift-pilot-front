# Modèle de données — Audit

> Confiance : medium

## Compréhension globale

`shift-pilot-front` ne définit aucun modèle de données propre. La seule entité manipulée, `order`, est reçue du backend sous forme de tableau JSON et consommée à la volée sans déclaration de schéma, sans validation ni mapping. Toute affirmation sur la structure réelle de cette entité est une hypothèse non vérifiable dans ce seul dépôt.

## Résumé exécutif

Ce dépôt est un **consommateur passif** de données : il n'a pas de base de données, pas de modèle local, pas de migration, pas de DTO, pas de type déclaré. L'entité `order` est implicitement supposée contenir `id`, `totalXpf` et `status` — ces trois champs sont lus directement dans la boucle de rendu (`js/app.js:20`) sans vérification préalable de leur présence ou de leur type. Si le back renvoie un objet dont l'un de ces champs est absent, `undefined` s'affiche silencieusement dans l'interface. La confidentialité du modèle côté back est totale depuis ce dépôt : aucun schéma, aucune documentation d'API, aucun fichier de types partagé n'y est présent.

## Constats détaillés

**VÉRIFIÉ_CODE — Schéma implicite en trois champs.** La boucle de rendu (`js/app.js:18-22`) accède à `order.id`, `order.totalXpf` et `order.status` (`js/app.js:20`). Ce sont les seuls champs dont l'existence est supposée côté front. Aucune vérification de présence (`order.id !== undefined`), de type (`typeof order.totalXpf === 'number'`) ou de valeur nulle n'est effectuée.

**VÉRIFIÉ_CODE — Pas de validation du corps de réponse.** Après `response.json()` (`js/app.js:8`), la valeur retournée est supposée être un tableau d'objets. Si l'API renvoie `null`, un objet unique non encapsulé, ou un tableau d'éléments sans les propriétés attendues, la boucle `for...of` échouera (`TypeError: null is not iterable`) ou produira un affichage dégradé (champs `undefined`), sans message d'erreur.

**VÉRIFIÉ_CODE — Contrat de champ résolu : `order.totalXpf`.** Le back expose `order.totalXpf`, un entier en XPF déjà calculé (`js/app.js:20`). Le front affiche ce champ directement, sans division. Le champ `order.total` n'est plus consommé par le front — la question de son unité est caduque.

**VÉRIFIÉ_CODE — Aucune relation, aucune contrainte locale.** Il n'y a pas de modèle relationnel côté front, pas de clé étrangère, pas de jointure. Chaque `order` est traité de façon indépendante.

**VÉRIFIÉ_CODE — Aucune persistance locale.** Pas de `localStorage`, pas de `sessionStorage`, pas d'IndexedDB, pas de cache Service Worker. Les données affichées disparaissent à chaque rechargement de page et sont re-fetched intégralement depuis l'API.

## Forces

- **Aucune dette de migration** : sans modèle local, il n'y a aucun schéma à faire évoluer, aucun upgrade script à maintenir.
- **Stateless côté client** : le front est entièrement dirigé par les données du back — aucune désynchronisation possible entre un état local et l'API.

## Dettes techniques

- **Contrat API implicite et non déclaré** : les champs `id`, `totalXpf`, `status` sont supposés présents sur chaque `order` sans qu'aucun contrat formel (typedef TypeScript, JSON Schema, commentaire de schéma) ne l'exprime — `js/app.js:20`. Une évolution du modèle côté back (renommage, suppression) ne serait détectée qu'à l'exécution.
- **Absence de validation de la réponse** : `response.json()` (`js/app.js:8`) est appelé sans vérification de `response.ok` ni validation de la structure retournée. Un changement de format API produit un rendu dégradé silencieux plutôt qu'une erreur explicite.

## Zones critiques

- **`js/app.js` ligne 20** : le seul endroit où la structure de `order` est supposée. Si le schéma API change, c'est ici que la régression se manifeste, silencieusement.

## Risques

- **Régression silencieuse sur changement de schéma** : si `shift-pilot-back` renomme `totalXpf` ou `status`, le front affiche `undefined` pour les champs concernés, sans alerte, sans log, sans message utilisateur (`js/app.js:20`). Un test de guard existe pour `totalXpf` (`js/app.test.js:47`) mais pas pour `status` ni `id`.

## Recommandations priorisées

1. **Documenter le contrat d'API** (champs attendus, types, unités) dans le README ou dans un fichier dédié — pour que la dépendance implicite à `{id, totalXpf, status}` soit explicite et connue des deux côtés — `js/app.js:20`, `README.md`.
2. **Ajouter une validation minimale de la réponse** : vérifier que le corps est bien un tableau avant la boucle, et que `order.totalXpf` est bien un nombre — `js/app.js:8-12`.

## Questions ouvertes

- Quelle est la valeur attendue de `order.status` ? Le front l'affiche telle quelle (`js/app.js:20`) — est-ce une chaîne libre, un enum (`active`, `cancelled`…) ?
- Existe-t-il d'autres champs dans l'objet `order` renvoyé par le back, non utilisés par le front ?
