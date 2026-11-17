# Kameleon Prompter — banc d'essai

Base de connaissance JSON + petit testeur en JavaScript.

## Lancer (Termux)

    python -m http.server 8000

Puis ouvre http://localhost:8000 dans Chrome.

## Fichiers

- `store.js` : projets sauvegardés (créer, lister, supprimer, export/import), logique pure testée
- `boot.js` : thème Clair/Sombre/Auto (rouge adaptatif) + migration des clés `morfy:` vers `kameleon:`
- `index.html`, `style.css`, `app.js` : l'interface (méthodes pas à pas, fiches techniques + testeur)
- `motion.css` : les animations, intégrées dans l'appli (le Labo a été supprimé)
- `images.json` : URLs des images d'exemple (7 emplacements ; si une URL ne charge pas, un fond avec la lettre s'affiche)
- `ux.js` : règles d'interface pures (phase d'édition, seuil du glisser-confirmer)/labo.html
- `modal.js` : la fenêtre de confirmation Oui / Non (remplace alert)
- `engine.js` : la logique (assemblage du prompt, validation, recommandation) — sans écran
- `test-engine.js` : `node test-engine.js` vérifie les 6 méthodes
- `lib/knowledge/library.json` : 38 prompts prêts à l'emploi (Canton de Berne, Adobe, guide)
- `lib/knowledge/coaching.json` : modèles Berne/Adobe, checklist, bonnes pratiques, erreurs, éthique, glossaire
- `lib/knowledge/guide.json` : le questionnaire de départ (3 questions -> méthode recommandée)
- `lib/knowledge/` : les 35 JSON (point d'entrée : `index.json`)

Note : `methods/reverse.json` utilise `steps` à la place de `blocks`.
