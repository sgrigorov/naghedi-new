#!/usr/bin/env bash
# Copy Squarespace assets from naghedi-dev into naghedi-new/src/assets,
# under folder names that don't contain the word "squarespace".
#
# Path rewriting is handled separately by scripts/rewrite-paths.mjs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/../naghedi-dev"
DEST="$ROOT/src/assets"

mkdir -p "$DEST"

# Mirror three CDN trees verbatim under non-"squarespace" folder names.
rsync -a --delete "$SRC/assets.squarespace.com/"   "$DEST/vendor-sqs/"
rsync -a --delete "$SRC/static1.squarespace.com/"  "$DEST/site-sqs/"
rsync -a --delete "$SRC/images.squarespace-cdn.com/" "$DEST/cdn-images/"

# Promote the site CSS to a stable, short path.
mkdir -p "$DEST/css"
SITE_CSS="$(find "$DEST/site-sqs/static/versioned-site-css" -name site.css | head -n1)"
STATIC_CSS="$(find "$DEST/site-sqs/static/vta" -name static.css | head -n1)"
[ -n "$SITE_CSS" ]   && cp "$SITE_CSS"   "$DEST/css/site.css"
[ -n "$STATIC_CSS" ] && cp "$STATIC_CSS" "$DEST/css/static.css"

# Drop the obvious commerce bundles (we have no cart).
find "$DEST/vendor-sqs/universal/scripts-compressed" \
  -maxdepth 1 -type f \
  \( -name 'commerce-*' -o -name 'cart-*' -o -name 'floating-cart*' \) \
  -delete || true
find "$DEST/site-sqs/static/vta" -type f -name 'floating-cart*.js' -delete || true

echo "Assets copied to $DEST"
echo "Sizes:"
du -sh "$DEST"/* 2>/dev/null | sort -h
