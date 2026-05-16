#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# METAFORGE — Backup Script
# Backs up project to Google Drive + prunes old copies.
# Usage: metaforge-backup
# ─────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_DIR="$HOME/Desktop/my-website"
GD_DIR="$HOME/Library/CloudStorage/GoogleDrive-chazzgoldart@gmail.com/My Drive/METAFORGE-backups"
KEEP=5
TS=$(date +"%Y-%m-%d_%H-%M")

mkdir -p "$GD_DIR"

echo "🛠  METAFORGE backup — $TS"
echo "→ destination: $GD_DIR"
echo ""

# 1) Folder copy
echo "→ Copying project folder…"
cp -R "$PROJECT_DIR" "$GD_DIR/my-website_$TS"

# 2) Zip snapshot
echo "→ Creating zip snapshot…"
( cd "$(dirname "$PROJECT_DIR")" && zip -rq "$GD_DIR/my-website_$TS.zip" "$(basename "$PROJECT_DIR")" -x "*.DS_Store" "*/node_modules/*" "*/.git/*" )

# 3) Prune — keep only the newest $KEEP folder backups
echo "→ Pruning old folder backups (keeping newest $KEEP)…"
ls -1dt "$GD_DIR"/my-website_*/ 2>/dev/null | tail -n +$((KEEP+1)) | while read -r old; do
  echo "  ✂  removing $(basename "$old")"
  rm -rf "$old"
done

# 4) Prune — keep only the newest $KEEP zip backups
echo "→ Pruning old zip backups (keeping newest $KEEP)…"
ls -1t "$GD_DIR"/my-website_*.zip 2>/dev/null | tail -n +$((KEEP+1)) | while read -r old; do
  echo "  ✂  removing $(basename "$old")"
  rm -f "$old"
done

echo ""
echo "✅ Backup complete."
echo "📦 Current backups:"
ls -1t "$GD_DIR" | head -20
