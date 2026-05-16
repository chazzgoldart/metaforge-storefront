# METAFORGE — Project State & Continuation Notes

> Last updated: 2026-05-16
> Use this file to remember where you left off.

---

## 🌍 Live URLs
- **Live demo:** https://chazzgoldart.github.io/metaforge-storefront/
- **GitHub repo:** https://github.com/chazzgoldart/metaforge-storefront (public)
- **Local dev:** http://localhost:8765 (run `python3 -m http.server 8765` from project dir)

---

## ✅ Done so far
- [x] Brand identity: METAFORGE (techno-divine, premium dark)
- [x] Hero section with **floating-above.glb** 3D model + light rays/rings
- [x] One-line METAFORGE title with chrome gradient
- [x] Mask showcase section with **futuristic-mask.glb** (boosted lighting)
- [x] Dual archive portals: L1L B0TZ (bot.glb) + XNORMIES (xnormie.glb)
- [x] Filterable gallery grid with 3D-tilt cards + "Initiate Forge" buttons
- [x] Forge Queue slide-out cart (Stripe-ready payload)
- [x] Toast notifications, scroll reveal, blueprint background
- [x] Branded loading screen with real GLB download progress
- [x] GitHub repo (public) + Pages deployed
- [x] Google Drive backups (`metaforge-backup` alias)

---

## 🚧 OPEN TODOs (pick up here!)

### 1. ⚠️ Rotation issue on live site (HIGH PRIORITY)
**Problem:** 3D models face the wrong way on the live site (https://chazzgoldart.github.io/...).
**Why:** Rotation values are saved in browser `localStorage` per-domain.
Your `localhost:8765` localStorage has the correct values, but the live `chazzgoldart.github.io` domain has none, so it defaults to 0°.

**Fix (when you return):**
1. Open http://localhost:8765/
2. Open DevTools console (⌘+Option+J)
3. Find the blue "🔧 METAFORGE SAVED ROTATIONS" log
4. Copy the 4 values (mf_hero_rot, mf_mask_rot, mf_bot_rot, mf_xn_rot)
5. Tell Claude → it'll bake them as defaults in `js/hero3d.js`
6. Push → live site will have correct rotations for everyone

### 2. Portal model alignment (mid priority)
- bot.glb and xnormie.glb may need rotation alignment in the portal boxes
- They have controls enabled — use arrow keys when scrolled to that section
- Then do the same lockdown as step 1 above

### 3. Possible enhancements (nice-to-haves)
- Custom domain (e.g. metaforge.studio) — connect via GitHub Pages settings
- Analytics (Plausible / Umami)
- Mobile polish pass (loader is responsive but some sections could tighten)
- Real product images in cart drawer thumbnails (currently `◐` / `▣` icons)
- Stripe integration for actual checkout

---

## 📁 Project structure
```
my-website/
├── index.html              ← main page
├── css/styles.css          ← full theme
├── js/
│   ├── app.js              ← cart, filters, tilt, portals
│   └── hero3d.js           ← Three.js scene factory (4 scenes)
├── images/
│   ├── floating-above.glb  ← hero model (~58 MB)
│   ├── futuristic-mask.glb ← showcase mask (~60 MB)
│   ├── bot.glb             ← L1L B0TZ portal (~1 MB)
│   ├── xnormie.glb         ← XNORMIES portal (~65 MB)
│   └── h-dfMMN7WpWISP2ygdf8fw@2k.webp  ← brand mark
├── scripts/
│   └── backup.sh           ← Drive backup + auto-prune
├── NOTES.md                ← this file
└── README.md
```

---

## 🔧 Useful commands

```bash
# Start local server
cd ~/Desktop/my-website && python3 -m http.server 8765

# Backup to Google Drive (keeps last 5)
~/Desktop/my-website/scripts/backup.sh
# (after enabling the alias: just `metaforge-backup`)

# Push code changes to live
cd ~/Desktop/my-website
git add -A && git commit -m "your message" && git push
# Live site rebuilds in ~1 min

# Check Pages build status
gh api repos/chazzgoldart/metaforge-storefront/pages | grep status
```

---

## 🧠 For Claude (next session)
When the user returns, point them to this file. Key context:
- Three.js scene factory in `js/hero3d.js` is reusable: `createFloatingScene({...})`
- Each scene has `saveKey` for localStorage rotation; controls enabled per-scene
- LOADER object tracks download progress across all scenes
- localStorage rotation values must be baked into defaults to apply on the live domain
