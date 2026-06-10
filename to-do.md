#Skill
# Process — Créer un site « scroll-driven video »

Ce document décrit, étape par étape, **comment fabriquer une nouvelle maquette** une fois
que la (ou les) vidéo(s) sont prêtes. Le principe : la position du scroll pilote la vidéo
image par image (technique « façon Apple »), avec un design system Apple-compliant et
une UI 100% Apple, puis des sections éditoriales prolongent l'expérience.

> TL;DR : on découpe la vidéo en images → on les pose dans `assets/frames/<univers>/`
> → on duplique une page HTML → on cale les textes sur les bons moments → on habille
> avec un design system Apple-compliant → on teste dans le navigateur.

---

## 1. Vue d'ensemble du projet

```
Site web maquette/
├── index.html                ← galerie : une carte par maquette
├── <univers>.html            ← une page par site (immobilier, cosmetique, rooftop…)
├── videos/                    ← vidéos sources (.mp4)
├── assets/
│   ├── frames/<univers>/      ← images extraites (001.jpg, 002.jpg, …)
│   ├── css/
│   │   ├── base.css           ← socle commun : nav, scène, canvas, panneaux, loader
│   │   ├── sections.css       ← bibliothèque de sections éditoriales + thèmes
│   │   └── <univers>.css      ← design system Apple propre au site (tokens, couleurs, radius, motion)
│   └── js/
│       └── scroll-video.js    ← moteur unique (préchargement + scrub + reveals)
└── PROCESS.md                 ← ce document
```

**Trois briques réutilisables, jamais à réécrire :**

- `assets/js/scroll-video.js` — le moteur. Un seul appel `initScrollVideo({…})` par page.
- `assets/css/base.css` — la scène vidéo, la nav, les panneaux de texte, le loader.
- `assets/css/sections.css` — les composants éditoriaux (manifeste, stats, split, cartes,
  étapes, marquee, showcase, footer…) thématisables via des variables CSS Apple-compliant.

Pour un nouveau site, on ne touche normalement **qu'à 3 choses** : les frames, le HTML de
la page, et un petit fichier `<univers>.css` pour la déclinaison Apple du design system.

---

## 2. Pré-requis (une seule fois)

- **ffmpeg / ffprobe** installés (extraction et analyse des vidéos).
- Un **serveur local** pour servir les pages (le préchargement des frames ne marche pas en
  `file://`) :

```bash
cd "Site web maquette"
python3 -m http.server 8000
# puis ouvrir http://localhost:8000/<univers>.html
```

---

## 3. Le process, étape par étape

### Étape 0 — Recevoir la/les vidéo(s)
Déposer le(s) fichier(s) dans `videos/`. Une scène peut être faite **d'une seule vidéo**
ou de **plusieurs vidéos mises bout à bout** (ex. le rooftop = `rooftop1.mp4` +
`rooftop2.mp4`).

### Étape 1 — Analyser la vidéo
On regarde la résolution, le frame rate, la durée et le nombre d'images :

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames,duration \
  -of default=noprint_wrappers=1 videos/<fichier>.mp4
```

À retenir : le **nombre total de frames** (= `frameCount`) et la **résolution**.

### Étape 2 — Extraire les images
On découpe la vidéo en une séquence d'images numérotées, dans un dossier dédié :

```bash
mkdir -p assets/frames/<univers>
ffmpeg -hide_banner -loglevel error -i videos/<fichier>.mp4 \
  -q:v 4 -start_number 1 "assets/frames/<univers>/%03d.jpg"
```

**Plusieurs vidéos à enchaîner ?** On continue la numérotation avec `-start_number` :

```bash
# vidéo 1 → 001..145
ffmpeg … -i videos/rooftop1.mp4 -q:v 4 -start_number 1   "assets/frames/rooftop/%03d.jpg"
# vidéo 2 → 146..410 (repart juste après la dernière frame de la 1)
ffmpeg … -i videos/rooftop2.mp4 -q:v 4 -start_number 146 "assets/frames/rooftop/%03d.jpg"
```

> `%03d` = numéro sur 3 chiffres (`001.jpg`). Si une séquence dépasse 999 frames,
> passer à `%04d` et mettre `pad: 4` dans la config (voir étape 6).

### Étape 3 — Repérer les moments clés
C'est **l'étape la plus importante** visuellement. On génère des planches-contact pour
voir toute la vidéo d'un coup d'œil :

```bash
# une mosaïque 5x4, une image toutes les 16 frames
ffmpeg -hide_banner -loglevel error -i videos/<fichier>.mp4 \
  -vf "select='not(mod(n\,16))',scale=240:-1,tile=5x4" -frames:v 1 -y /tmp/sheet.png
```

On note les **frames qui correspondent à un moment fort** (un reveal, une plongée, le
produit qui se pose, un gros plan…). Exemple rooftop :

| Frame (sur 410) | Moment                       | Où poser le texte |
| --------------- | ---------------------------- | ----------------- |
| 1–40            | Survol de Paris              | hero, bas-gauche  |
| ~130            | Arrivée terrasse / T. Eiffel | bas-centre        |
| ~300            | Cocktail (verre à gauche)    | **à droite**      |
| ~360            | Planche (au centre-bas)      | **haut-droite**   |
| ~410            | Carafe/verres (à gauche)     | **à droite**      |

> Règle d'or : on pose le texte **du côté vide de l'image**, là où le sujet ne se trouve
> pas, pour ne pas gâcher le visuel.

On convertit ces numéros de frame en **progression 0 → 1** : `progress = frame / frameCount`.
Ex. frame 300 sur 410 → `0.73`.

### Étape 4 — Dupliquer une page existante
Le plus simple : copier une page proche (`glow.html` ou `rooftop.html`) et la renommer
`<univers>.html`. La structure est toujours la même :

1. `<head>` : stack typographique système Apple + `base.css` + `sections.css` + `<univers>.css`
2. Loader
3. Nav (statique)
4. `.scroll-track > .scene` : le canvas + les **panneaux de texte**
5. `<main class="content theme-<univers>">` : les **sections éditoriales**
6. Les scripts + l'appel `initScrollVideo({…})`

> Règle d'interface obligatoire : chaque page doit ressembler à une interface Apple native
> transposée au web : typographie SF/system, grande respiration, hiérarchie claire,
> matériaux translucides, radius généreux, micro-interactions douces, contraste accessible,
> composants sobres et aucun élément visuel non Apple-like.

### Étape 5 — Caler les panneaux de texte sur la vidéo
Chaque panneau est un bloc HTML piloté par des **attributs `data-`** (le moteur s'occupe
du reste : fade + translation à l'entrée et à la sortie).

```html
<div class="panel panel--center panel--right"
     data-reveal-start="0.62" data-reveal-end="0.79" data-reveal-from="right">
  <div class="panel__inner">
    <span class="eyebrow">La carte</span>
    <h2 class="title">Cocktails <em>d'auteur</em></h2>
    <p class="lede">Signés par nos barmen, du crépuscule à la nuit.</p>
  </div>
</div>
```

**Attributs disponibles :**

| Attribut             | Rôle                                                    |
|----------------------|---------------------------------------------------------|
| `data-reveal-start`  | progression (0→1) où le texte **apparaît**              |
| `data-reveal-end`    | progression où il **disparaît** (`1` = reste jusqu'au bout) |
| `data-reveal-from`   | direction d'entrée : `up` · `down` · `left` · `right`   |

**Positionnement (classes CSS) :**

- Vertical : `panel--top` · `panel--center` · `panel--bottom`
- Horizontal : `panel--left` · `panel--mid` · `panel--right`
- Lisibilité : ajouter `panel--glass` pour un fond flouté translucide façon matériau Apple
  (`backdrop-filter`, saturation légère, contour subtil, radius 20–28px) derrière le texte.

> Le premier panneau (`data-reveal-start="0"`) est visible dès le haut de page : on n'anime
> que sa sortie.

### Étape 6 — Lancer le moteur
En bas de page, un seul appel configure tout :

```html
<script src="…/gsap.min.js"></script>
<script src="…/ScrollTrigger.min.js"></script>
<script src="…/lenis.min.js"></script>
<script src="assets/js/scroll-video.js"></script>
<script>
  initScrollVideo({
    framesPath: "assets/frames/rooftop/",
    frameCount: 410,   // = nb d'images extraites
    pad: 3,            // 3 chiffres (001.jpg)
    ext: "jpg",
    scrollVh: 1100,    // longueur de scrubbing (voir ci-dessous)
  });
</script>
```

**Régler `scrollVh`** = la « longueur » de scroll consacrée à la vidéo (en `vh`).
Règle pratique : **~2,7 vh par frame**.
- 314 frames → ~850 vh
- 410 frames → ~1100 vh

Plus la valeur est haute, plus la vidéo défile lentement (plus de scroll pour la même
séquence).

### Étape 7 — Construire le « ventre » du site (sections éditoriales)
Après la vidéo, le `<main class="content theme-<univers>">` enchaîne des sections prêtes à
l'emploi (dans `sections.css`). Elles s'animent au scroll via `data-anim` :

| `data-anim`   | Effet                                             |
|---------------|---------------------------------------------------|
| `fade`        | apparition simple (opacité)                       |
| `fade-up`     | apparition + montée                               |
| `zoom`        | image qui se dézoome doucement (sur un `.split__media` / `.showcase`) |
| `stagger`     | les enfants apparaissent en cascade               |
| `data-count`  | compteur chiffré animé (ex. `data-count="120"`)   |
| `data-delay`  | retard en secondes (ex. `data-delay="0.08"`)      |

Composants disponibles : `manifesto`, `stats`, `split` (image + texte), `cards`,
`steps`, `marquee`, `showcase` (grande image parallax), `shop` (produits), `site-footer`.
On peut réutiliser des **frames de la vidéo** comme visuels (ex. la frame 130 en showcase).

Tous les composants doivent suivre une UI 100% Apple : grands titres nets, cards arrondies,
backgrounds `#f5f5f7` ou noir profond, surfaces blanches/noires très calmes, boutons en
pill, icônes type SF Symbols, animations sobres et espacements généreux.

### Étape 8 — Habiller avec le design system Apple-compliant (`<univers>.css`)
C'est ce qui rend chaque site unique **sans toucher aux autres**, mais la direction UI doit
rester 100% Apple. Dans `assets/css/<univers>.css` on redéfinit surtout les tokens Apple
(polices système, couleurs système, matériaux, radius, ombres, motion), puis dans
`sections.css` on ajoute une ligne de thème.

Objectif visuel : une page qui semble native de l'écosystème Apple, inspirée des Human
Interface Guidelines : clarté, déférence au contenu, profondeur maîtrisée, accessibilité,
cohérence typographique, gestes/mouvements doux et composants immédiatement familiers.

```css
/* dans sections.css */
.content.theme-rooftop {
  --accent:#007aff;              /* Apple system blue par défaut */
  --bg:#f5f5f7;                  /* fond Apple clair */
  --bg-soft:#ffffff;             /* surfaces principales */
  --text:#1d1d1f;                /* texte principal Apple-like */
  --muted:#6e6e73;               /* texte secondaire */
  --line:rgba(0,0,0,.12);        /* séparateurs subtils */
  --material:rgba(255,255,255,.72);
  --material-dark:rgba(29,29,31,.72);
}
```

```css
/* dans rooftop.css : design system Apple + accents propres au site */
:root {
  --font-display:-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
  --font-body:-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;

  --radius-card:28px;
  --radius-panel:24px;
  --radius-control:999px;

  --shadow-soft:0 18px 60px rgba(0,0,0,.10);
  --shadow-card:0 8px 30px rgba(0,0,0,.08);
  --blur-material:saturate(180%) blur(28px);

  --ease-apple:cubic-bezier(.2,.8,.2,1);
  --duration-fast:180ms;
  --duration-medium:420ms;
  --duration-slow:720ms;
}
```

Variables thématiques principales : `--accent` (couleur système Apple), `--bg` /
`--bg-soft` (fonds), `--text`, `--muted`, `--line` (filets), `--material`,
`--font-display`, `--font-body`, `--radius-card`, `--radius-control`, `--blur-material`,
`--ease-apple`.

Règles obligatoires pour une UI 100% Apple :

- **Typographie** : utiliser uniquement la stack système Apple (`-apple-system`,
  `BlinkMacSystemFont`, `SF Pro Display`, `SF Pro Text`, `Helvetica Neue`). Ne pas charger
  de Google Fonts, de police décorative ou de fonte qui casse l'esthétique Apple.
- **Couleurs** : partir des neutres Apple (`#f5f5f7`, `#ffffff`, `#1d1d1f`, `#6e6e73`) et
  des accents système (`#007aff`, `#34c759`, `#ff9500`, `#ff3b30`, `#5856d6`) plutôt que
  de palettes trop brandées ou saturées.
- **Layout** : beaucoup d'espace blanc, largeur max contrôlée, grilles simples, alignements
  nets, sections respirantes, hiérarchie très claire entre eyebrow, title, lede et CTA.
- **Cards & panels** : grands radius (24–32px), contours à peine visibles, ombres douces,
  surfaces calmes, pas de bordures lourdes, pas de gradients agressifs.
- **Matériaux** : pour les overlays, navs et panneaux, privilégier le verre dépoli Apple :
  `backdrop-filter: saturate(180%) blur(28px)`, transparence douce et contraste lisible.
- **Boutons** : boutons en pill, libellés courts, état primaire rempli, état secondaire
  translucide, hover/tap discret, cible tactile minimale de 44px.
- **Icônes** : style SF Symbols uniquement : traits simples, poids cohérent avec le texte,
  alignement optique, aucune icône Material, Font Awesome ou illustration décorative hors-sujet.
- **Motion** : animations fluides mais sobres, easing Apple-like, transitions courtes,
  parallaxe subtile, aucun effet tape-à-l'œil. Respecter `prefers-reduced-motion`.
- **Accessibilité** : contraste suffisant, focus visible, textes lisibles, tailles mobiles
  confortables, navigation clavier, labels ARIA si nécessaire.
- **Conformité** : ne pas utiliser le logo Apple, des assets propriétaires Apple ou une copie
  exacte d'une page apple.com. L'objectif est une UI Apple-compliant, pas une imitation de marque.

Ne pas **charger de polices Google** dans le `<head>`. Utiliser la stack système Apple dans
le CSS pour obtenir un rendu natif sur macOS/iOS et un fallback propre ailleurs.

### Étape 9 — Ajouter la carte à la galerie d'accueil
Dans `index.html`, dupliquer une carte et pointer vers la nouvelle page + une frame
représentative :

```html
<a class="card" href="rooftop.html">
  <img src="assets/frames/rooftop/130.jpg" alt="Le Relais Bellevue" />
  <div class="card__body">
    <div class="card__tag">Rooftop bar · Paris</div>
    <div class="card__title">Le Relais Bellevue</div>
    <div class="card__go">Monter sur le toit <span>→</span></div>
  </div>
</a>
```

### Étape 10 — Tester
Servir en local (`python3 -m http.server 8000`) puis vérifier :

- [ ] Le loader part une fois les frames chargées.
- [ ] La vidéo scrubbe **fluide** dans les deux sens.
- [ ] Chaque texte apparaît **au bon moment** et **du bon côté**.
- [ ] La transition vidéo → sections éditoriales est nette.
- [ ] Les animations `data-anim` se déclenchent au scroll.
- [ ] Aucune erreur dans la console.
- [ ] Rendu correct sur mobile (la nav se simplifie sous 760px).

---

## 4. Check-list express (à copier pour chaque nouveau site)

```
[ ] 0. Vidéo(s) dans videos/
[ ] 1. ffprobe → noter frameCount + résolution
[ ] 2. ffmpeg → extraire dans assets/frames/<univers>/ (start_number si plusieurs vidéos)
[ ] 3. Planches-contact → repérer les frames clés → convertir en progress (frame/frameCount)
[ ] 4. Dupliquer une page en <univers>.html
[ ] 5. Caler les panels (data-reveal-start / end / from) + positions (panel--…)
[ ] 6. initScrollVideo({ framesPath, frameCount, pad, ext, scrollVh ≈ 2,7×frames })
[ ] 7. Construire les sections éditoriales (data-anim)
[ ] 8. Design system Apple : <univers>.css (tokens Apple) + .content.theme-<univers> (couleurs système)
[ ] 9. Ajouter la carte dans index.html
[ ] 10. Tester en local + check-list visuelle
```

---

## 5. Réglages utiles & pièges

- **Frames lourdes / chargement lent** : baisser la qualité (`-q:v 6`) ou la résolution
  (`-vf scale=1280:-1`) à l'extraction. ~150–400 frames est un bon compromis.
- **> 999 frames** : numéroter en `%04d` à l'extraction **et** mettre `pad: 4` dans la config.
- **Texte illisible sur fond clair** : ajouter `panel--glass` façon matériau Apple, ou
  s'appuyer sur le voile (`.scene__veil`) déjà présent dans `base.css`.
- **La page « saute » à la jonction vidéo/sections** : vérifier que `scrollVh` est cohérent
  (ni trop court, ni trop long) et relancer le serveur après modif.
- **UI pas assez Apple** : retirer les polices exotiques, réduire les couleurs, augmenter
  l'espace blanc, arrondir les cards, simplifier les CTA, utiliser des matériaux floutés et
  revenir à la stack système Apple.
- **Toujours servir via HTTP** (pas en double-clic `file://`), sinon les frames ne se
  préchargent pas.
```