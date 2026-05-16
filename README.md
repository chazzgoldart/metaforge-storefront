# METAFORGE — Digital Archive

Premium dark-mode storefront for forged 3D figurines.
Built with vanilla HTML / CSS / JS + Three.js (WebGL).

## Architecture
- `index.html` — main page
- `css/styles.css` — full theme + layout
- `js/app.js` — gallery, filter, cart, toast, reveal logic
- `js/hero3d.js` — reusable Three.js scene factory (used 4× for hero, mask, and 2 portals)
- `images/` — GLB 3D models + brand assets

## Develop locally
GLB files require an HTTP server (CORS):

```bash
cd ~/Desktop/my-website
python3 -m http.server 8765
open http://localhost:8765/
```

Or use the alias:
```bash
metaforge-server
metaforge-open
```

## Backup
```bash
metaforge-backup     # → Google Drive, auto-prunes to last 5
```

## Stack
- Three.js 0.160 (GLTFLoader)
- Plain CSS — custom properties, glassmorphism, blueprint grid
- ES modules

## Status
v1.0 — forged in motion.
