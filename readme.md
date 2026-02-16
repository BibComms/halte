# Halte bien-être

Site web statique pour diffuser des contenus de bien-être (vidéos, balados, méditations, etc.) dans un format kiosque simple.

Le site affiche :

- Une page d’accueil avec des carrousels par catégories
- Une page “expérience” qui lit un contenu multimédia
- Un modal “À propos” avec un lien de suggestion
- Un mécanisme de rétroaction “Oui / Non” envoyé vers n8n

## Stack technique

- HTML/CSS/JavaScript vanilla (pas de framework, pas de build)
- Données en JSON local: `assets/data/experiences.json`
- Carrousel: Embla via CDN
- Lecteurs externes: YouTube (`youtube-nocookie.com`) et Spotify Iframe API
- Intégration n8n: webhook de rétroaction + formulaire de suggestion

## Démarrage local

Important: le projet utilise `fetch()` pour charger des fichiers locaux (JSON/partials).  
Il faut servir le site via un serveur HTTP local (pas `file://`).

## Fonctionnement global

### 1) Accueil (`index.html` + `assets/js/app.js`)

- Charge `assets/data/experiences.json`
- Regroupe les expériences selon `CATEGORY_DEFS` dans `assets/js/app.js`
- Affiche chaque catégorie dans un carrousel Embla
- Le bouton `Démarrer` envoie vers `experience.html?id=<id>`

### 2) Page expérience (`experience.html` + `assets/js/experience.js`)

- Lit le paramètre `id` dans l’URL
- Charge l’expérience correspondante depuis `experiences.json`
- Monte le lecteur selon `player.kind`:
- `youtube_embed`
- `spotify_embed`
- `audio`
- `podcasters_embed`
- Affiche les chips de catégorie et le texte descriptif
- Envoie la rétroaction “Oui/Non” à n8n

### 3) Modal À propos (`assets/partials/hint.html` + `assets/js/hint.js`)

- Chargé dynamiquement depuis `#hintMount`
- S’ouvre automatiquement au premier chargement (localStorage)
- Contient un lien “Soumettre une proposition” vers un formulaire n8n

### 4) Footer (`assets/partials/footer.html` + `assets/js/footer.js`)

- Chargé dynamiquement depuis `#footerMount`
- Affiche le lien bibliothèques UdeM + année courante

## Ajouter une expérience

Toute l’édition de contenu passe par `assets/data/experiences.json`

### Règles de base

- `id` doit être unique (slug conseillé: minuscules + tirets)
- `title`, `cover`, `description`, `player.kind` sont essentiels
- `category` doit être un tableau de tags
- L’ordre dans le JSON influence l’ordre d’affichage dans les carrousels

### Modèle minimal recommandé

```json
{
  "id": "respiration-5-min",
  "title": "Respiration 5 minutes",
  "type": "video",
  "duration_min": 5,
  "category": ["Respiration"],
  "cover": "assets/img/covers/respiration-5-min.jpg",
  "description": "Exercice guidé pour ralentir le rythme.",
  "player": {
    "kind": "youtube_embed",
    "youtube_id": "ABCDEFGHIJK",
    "start": 0
  }
}
```

### Types de player supportés

### `youtube_embed`

Champs utiles:

- `youtube_id` (obligatoire au niveau racine du player)
- `start` (optionnel, secondes)
- `episodes` (optionnel)

Exemple:

```json
{
  "kind": "youtube_embed",
  "youtube_id": "h27KOtqRWeQ",
  "start": 0,
  "episodes": [
    { "label": "Partie 1", "url": "https://youtu.be/h27KOtqRWeQ" },
    { "label": "Partie 2", "youtube_id": "FZZPXR_5s_c", "start": 10 }
  ]
}
```

### `spotify_embed`

Champs utiles:

- `src` ou `embed_url` ou `uri`
- `episodes` (optionnel, recommandé en `spotify:episode:...`)

Exemple:

```json
{
  "kind": "spotify_embed",
  "src": "https://open.spotify.com/episode/5h5ErilT3OgfjWjsSqU16L",
  "episodes": [
    { "label": "Épisode 1", "uri": "spotify:episode:5h5ErilT3OgfjWjsSqU16L" },
    { "label": "Épisode 2", "uri": "spotify:episode:7gVK3v98nGJBvsqL6lW8iA" }
  ]
}
```

### `audio`

Exemple:

```json
{
  "kind": "audio",
  "src": "https://example.com/audio.mp3"
}
```

### Tags de catégories

Les panneaux de l’accueil sont définis dans `assets/js/app.js` (`CATEGORY_DEFS`).  
Une expérience apparaît dans un panneau si au moins un tag `category` matche les mots-clés.

Mots-clés déjà pris en charge:

- Balados: `balado`
- Exercices de respiration: `respiration`
- CEPSUM - PAUSE ACTIVE: `cepsum - pause active`
- Méditations: `meditation`
- Musique: `musique`
- Concentration: `focus`, `concentration`
- Ambiances sonores: `ambiance`, `relaxation`
- Santé mentale: `sante mentale`, `infos utiles`
- Coup de coeur des bibliothèques UdeM: `coup de coeur`
- Motivation & études: `motivation`, `vie etudiante`

Notes:

- La comparaison ignore les accents
- Une expérience peut apparaître dans plusieurs catégories
- Si vous ajoutez une nouvelle famille de contenus, ajoutez une entrée dans `CATEGORY_DEFS`

## Rétroactions gérées par n8n

La rétroaction est envoyée depuis `assets/js/experience.js`.

Configuration actuelle:

- Constante: `N8N_WEBHOOK_URL`
- Valeur actuelle: `https://ordo.bib.umontreal.ca/webhook/halte-retroaction`

Quand l’usager clique :

- `Oui` envoie `feedback: "up"`
- `Non` envoie `feedback: "down"`

Payload JSON envoyé:

```json
{
  "experience": "Titre de l'expérience",
  "feedback": "up",
  "sent_at": "2026-02-16T20:00:00.000Z"
}
```

## Formulaire de suggestion géré par n8n

Le lien du formulaire est dans `assets/partials/hint.html`, section :

- “Une expérience à proposer? Soumettre une proposition”

URL actuelle :

- `https://ordo.bib.umontreal.ca/form/f2242ad0-8eac-4fd3-8d8e-085f326c0357`

---

