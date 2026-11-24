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
| `js/config.js` | réglages d'hébergement (adresse de la page Versus) |
| `versus/` | page Versus (PV et jetons à 2–6 joueurs) : `index.html`, `b/` (boards), `p2p.js` (salles en ligne), `config.js`, `vendor/` (bibliothèque Trystero) |
| `manifest.json`, `icon-*.png` | installation sur l'écran d'accueil |

## Mettre à jour

1. Modifier les fichiers (sur la branche `dev`).
2. Changer le numéro `?v=…` des fichiers `css/` et `js/` dans `index.html`, pour que les navigateurs rechargent la nouvelle version.
3. Quand la mise à jour convient, fusionner `dev` dans `main`.

## Salles Versus en ligne (sans serveur)

Sur le site hébergé, la page `versus/` relie les joueurs directement entre eux (WebRTC, bibliothèque [Trystero](https://github.com/dmotz/trystero) 0.22, signalisation par des brokers MQTT publics). Un joueur crée une salle (code de 6 caractères), les autres tapent le code.

- Personne n'est hôte : tout le monde a la même copie de la partie, la salle reste ouverte tant qu'un joueur garde la page ouverte. Quand tout le monde part, la partie de la salle disparaît.
- Quiconque connaît le code peut entrer dans la salle. Les joueurs d'une salle voient mutuellement leur adresse IP (propre à WebRTC).
- Certains réseaux (4G d'opérateur, pare-feu d'entreprise) bloquent la connexion directe : il faut alors un serveur TURN. Il se règle dans `versus/config.js` (`turnConfig:[{urls:'turn:…',username:'…',credential:'…'}]`). Les brokers de signalisation se changent avec `relayUrls:['wss://…/mqtt']`.
- Dans claude.ai, la page Versus de l'artefact garde la capacité `room` ; `p2p.js` ne sert que hors claude.ai.
- La bibliothèque `versus/vendor/trystero-mqtt.min.js` est un build de `trystero@0.22.0/mqtt` (esbuild, IIFE) ; elle n'est chargée qu'à l'entrée dans une salle.

## Publier avec GitHub Pages

Réglages du dépôt → **Pages** → Source : *Deploy from a branch* → branche `main`, dossier `/ (root)`.
Adresse attendue : `https://<pseudo>.github.io/dice-throne-companion/`.

Dice Throne est une marque de Roxley Games. Projet de fan, sans lien officiel.
