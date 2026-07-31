# shift-pilot-front

Dépôt de test jetable pour le pilote SHIFT/Paperclip (Lot 0/L0-6, Porte 1, Lot 3/L3-1) — deuxième dépôt du projet pilote, pour tester l'onboarding et le développement multi-dépôts (L1-2).

## Contenu

- `index.html` / `js/app.js` — page statique minimale, sans dépendance, qui affiche les commandes actives depuis l'API de [`shift-pilot-back`](https://github.com/arthurfromtahiti/shift-pilot-back).

Symptôme visible côté front du bug volontaire de `shift-pilot-back` : la liste « Commandes actives » affiche aussi les commandes annulées, puisque le filtre back ne fonctionne pas.

## Lancer

Servir ce dossier statiquement (ex. `npx serve .`) avec `shift-pilot-back` lancé en parallèle sur `:3000`.
