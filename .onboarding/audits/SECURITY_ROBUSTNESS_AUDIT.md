# Sécurité & Robustesse — Audit

> Confiance : high

## Compréhension globale

`shift-pilot-front` est un client HTTP statique sans mécanisme d'authentification ou de session visible dans ce dépôt, et sans persistance locale. La surface d'attaque est donc étroite, mais plusieurs lacunes de robustesse sont observables directement dans les 19 lignes de `js/app.js`. La bonne nouvelle : la seule zone à risque XSS est traitée correctement.

## Résumé exécutif

Le seul vrai point positif de sécurité est l'utilisation de `.textContent` pour le rendu des données API (`js/app.js:14`), qui élimine toute possibilité d'injection HTML depuis la réponse du back. En dehors de cela, la posture de robustesse est faible : aucune vérification du statut HTTP avant désérialisation, aucune gestion des exceptions réseau, URL de back en dur en `http://` (clair, non chiffré) par défaut, aucun en-tête de sécurité défini dans le HTML, et une variable de configuration globale (`window.API_BASE_URL`) exposée et modifiable par tout script tiers chargé dans la même page. Ces lacunes sont acceptables pour un prototype de test déclaré comme tel, mais constituent des risques réels pour tout usage au-delà du développement local.

## Constats détaillés

**VÉRIFIÉ_CODE — Protection XSS correcte.** Le formatage de chaque ligne utilise `item.textContent = \`Commande #${order.id} — ${order.total / 100} XPF (${order.status})\`` (`js/app.js:14`). `.textContent` échappe automatiquement toute valeur HTML injectée par la réponse API — un champ `id`, `total` ou `status` contenant `<script>...</script>` ne serait pas interprété. C'est le comportement attendu et il est correct.

**VÉRIFIÉ_CODE — Pas de vérification `response.ok`.** La séquence `fetch(...)` puis `response.json()` (`js/app.js:7-8`) n'inspecte jamais `response.status` ni `response.ok`. Si le back retourne un code HTTP 4xx ou 5xx avec un corps HTML (une page d'erreur classique), `.json()` rejettera la Promise avec une `SyntaxError` non capturée. L'utilisateur ne voit rien ; l'erreur est silencieuse.

**VÉRIFIÉ_CODE — Aucune gestion d'exception réseau.** Il n'existe ni `try/catch` autour de la fonction async ni `.catch()` sur la Promise (`js/app.js:6-17`). Un timeout réseau, une coupure, un `CORS` bloquant ou toute autre erreur réseau fait rejeter la Promise sans qu'aucun message ne soit affiché à l'utilisateur.

**VÉRIFIÉ_CODE — Fallback URL sur `http://localhost:3000` en HTTP clair.** Le code déclare `const API_BASE_URL = window.API_BASE_URL || "http://localhost:3000"` (`js/app.js:4`). Le fallback est en HTTP non chiffré. Aucune URL HTTPS de substitution n'est définie dans le code.

**HYPOTHÈSE — Échec silencieux en production si `window.API_BASE_URL` n'est pas injectée.** Si l'application est déployée sans que `window.API_BASE_URL` soit fournie par l'environnement hôte, le front tenterait d'appeler `localhost:3000` depuis le navigateur de l'utilisateur final — ce qui échouerait. Ce scénario n'est pas observable depuis ce dépôt seul : aucun mécanisme d'injection n'est visible ici, et l'environnement de déploiement réel est inconnu.

**VÉRIFIÉ_CODE — Variable de configuration exposée dans le scope global.** `window.API_BASE_URL` est lue au démarrage sans validation ni gel (`js/app.js:4`). Tout script tiers chargé dans la même page avant `app.js` pourrait écraser cette valeur et rediriger les appels API vers un endpoint malveillant. Pour un prototype sans dépendances tierces, le risque est théorique ; il deviendrait réel si des scripts externes étaient ajoutés.

**VÉRIFIÉ_CODE — Aucune balise de sécurité déclarée dans le HTML.** `index.html` n'inclut ni `<meta http-equiv="Content-Security-Policy">`, ni `X-Frame-Options` (via meta), ni `Referrer-Policy` (`index.html:1-12`). Ces protections relèvent normalement du serveur web qui sert la page — leur présence ou absence côté serveur n'est pas observable depuis ce dépôt.

**VÉRIFIÉ_CODE — Pas d'en-tête d'authentification explicite dans la requête.** Aucun en-tête `Authorization` ni token n'est passé manuellement dans l'appel `fetch` (`js/app.js:7`). **HYPOTHÈSE — Le backend serait accessible sans authentification :** l'absence d'en-tête explicite ne prouve pas que l'endpoint est public — le navigateur pourrait envoyer un cookie de session automatiquement, et le contrat du backend n'est pas visible dans ce dépôt.

## Forces

- **Protection XSS effective** : `.textContent` (`js/app.js:14`) est la bonne pratique — aucun vecteur HTML via les données API.
- **Aucune donnée sensible stockée localement** : pas de `localStorage`, pas de `sessionStorage`, pas de cookie côté front.
- **Aucune dépendance tierce** : zéro surface d'attaque sur la chaîne d'approvisionnement npm.

## Dettes techniques

- **Absence de gestion d'erreur** : l'application est muette sur toute défaillance réseau ou réponse inattendue (`js/app.js:6-17`). Pour un prototype, c'est acceptable ; pour une interface utilisateur réelle, c'est une dette bloquante.
- **VÉRIFIÉ_CODE — URL par défaut `http://localhost`** (`js/app.js:4`). **HYPOTHÈSE** — Si ce front est déployé sans injection de `window.API_BASE_URL`, le fallback serait `localhost:3000`, inaccessible depuis le navigateur d'un utilisateur final — scénario non observable depuis ce dépôt.

## Zones critiques

- **`js/app.js` lignes 7-8** : le point de jonction `fetch` + `.json()` sans vérification de statut ni capture d'exception. Si quelque chose doit casser, c'est ici.

## Risques

- **VÉRIFIÉ_CODE — Aucune gestion d'erreur** : aucun `try/catch` ni `.catch()` dans `js/app.js`. **HYPOTHÈSE** — En cas de défaillance API (réseau, timeout, CORS), la liste resterait vide sans explication — ce comportement n'a pas été observé en runtime dans ce dépôt, mais découle logiquement de l'absence de gestion d'erreur.
- **HYPOTHÈSE — `window.API_BASE_URL` écrasable par un script tiers** : si le projet évolue et intègre des scripts externes (analytics, CDN), la variable de configuration devient un point d'injection potentiel. Ce risque est aujourd'hui nul (aucune dépendance tierce), mais la conception ne l'a pas prévenu.

## Recommandations priorisées

1. **Ajouter une vérification `response.ok` + `try/catch`** — et afficher un message d'erreur visible à l'utilisateur — `js/app.js:7-8`. C'est la correction la plus impactante pour un utilisateur réel.
2. **Documenter (ou corriger) le mécanisme d'injection de `window.API_BASE_URL`** pour qu'un déploiement en dehors de `localhost` soit possible sans modification manuelle de fichiers — `js/app.js:4`, `README.md`.
3. **Si le dépôt sert des données réelles** : imposer HTTPS dans l'URL par défaut et ajouter une politique CSP minimale via le serveur web de service.

## Questions ouvertes

- Le back expose-t-il une authentification ? Si oui, le front devra gérer un token ou une session — non visible dans ce dépôt.
- Quel serveur web sert `index.html` en production, et quels en-têtes de sécurité (CORS, CSP, HSTS) ce serveur envoie-t-il ?
