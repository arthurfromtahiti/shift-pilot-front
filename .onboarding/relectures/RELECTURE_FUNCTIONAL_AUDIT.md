# Relecture — FUNCTIONAL_AUDIT

## Verdict global
Bon — l'audit respecte désormais la frontière entre `VÉRIFIÉ_CODE` et `HYPOTHÈSE`, source ses constats dans le dépôt, et relie les risques à des observations concrètes sans présenter comme faits des perceptions utilisateur non observées.

## Problèmes bloquants
- Aucun.

## Problèmes mineurs
- Aucun point mineur bloquant relevé sur cette version.

## Points vérifiés et corrects
- Le bug principal sur l'affichage des commandes annulées sous le titre « Commandes actives » est prouvé et correctement sourcé dans [FUNCTIONAL_AUDIT.md](.onboarding/audits/FUNCTIONAL_AUDIT.md:15), [README.md](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-front/README.md:9), [index.html](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-front/index.html:8) et [js/app.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-front/js/app.js:7).
- Les trois lacunes UX (chargement, erreur, liste vide) sont maintenant formulées en deux temps corrects: fait `VÉRIFIÉ_CODE` sur l'absence de gestion dans [js/app.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-front/js/app.js:6) puis impact `HYPOTHÈSE` dans [FUNCTIONAL_AUDIT.md](.onboarding/audits/FUNCTIONAL_AUDIT.md:17), [FUNCTIONAL_AUDIT.md](.onboarding/audits/FUNCTIONAL_AUDIT.md:19) et [FUNCTIONAL_AUDIT.md](.onboarding/audits/FUNCTIONAL_AUDIT.md:21).
- Le point sur `order.total` sépare bien le calcul observable et l'interprétation métier non prouvée dans [FUNCTIONAL_AUDIT.md](.onboarding/audits/FUNCTIONAL_AUDIT.md:25) et [FUNCTIONAL_AUDIT.md](.onboarding/audits/FUNCTIONAL_AUDIT.md:27), avec preuve de code dans [js/app.js](/paperclip/instances/default/projects/be2f6065-a710-4a1d-8bb7-531efdbc6f23/6047261f-4409-4c8e-9290-61914f24a4c7/shift-pilot-front/js/app.js:14).
- La section `Risques` conserve les projections d'usage au statut `HYPOTHÈSE`, y compris sur l'ambiguïté d'une liste vide et sur l'impact du mauvais filtrage, dans [FUNCTIONAL_AUDIT.md](.onboarding/audits/FUNCTIONAL_AUDIT.md:50), [FUNCTIONAL_AUDIT.md](.onboarding/audits/FUNCTIONAL_AUDIT.md:51) et [FUNCTIONAL_AUDIT.md](.onboarding/audits/FUNCTIONAL_AUDIT.md:52).

## Recommandations de correction
- Aucune correction requise avant validation de cet audit.
