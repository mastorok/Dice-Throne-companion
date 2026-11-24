# Dice Throne – Compagnon

Site compagnon (fr/en) pour Dice Throne : fiches héros et boss, tournoi, feuille de combat DTA, jetons, Naraxus.
Aucune étape de build : ce sont des fichiers statiques, `index.html` s'ouvre directement dans un navigateur.

## Structure

| Chemin | Contenu |
|---|---|
| `index.html` | balisage de la page et ordre de chargement |
| `css/style.css` | tous les styles |
| `js/data.js` | héros, boss, dés, héros « à venir » (`SOON`, `DATA`) |
| `js/i18n.js` | traductions (`I18N`) |
| `js/images.js` | petites images embarquées (feuille DTA, tournoi) |
| `js/app.js` | le code de l'interface |
| `img/` | illustrations, plaques de noms, image Naraxus |
| `assets/` | musique d'ambiance Naraxus |
| `manifest.json`, `icon-*.png` | installation sur l'écran d'accueil |

## Mettre à jour

1. Modifier les fichiers (sur la branche `dev`).
2. Changer le numéro `?v=…` des fichiers `css/` et `js/` dans `index.html`, pour que les navigateurs rechargent la nouvelle version.
3. Quand la mise à jour convient, fusionner `dev` dans `main`.

## Publier avec GitHub Pages

Réglages du dépôt → **Pages** → Source : *Deploy from a branch* → branche `main`, dossier `/ (root)`.
Adresse attendue : `https://<pseudo>.github.io/dice-throne-companion/`.

Dice Throne est une marque de Roxley Games. Projet de fan, sans lien officiel.
