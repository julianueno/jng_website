#!/bin/sh
# Build web-sized copies of everything in /images.
#   images/            originals (source only — the site never loads these directly)
#   images/desktop/    WebP, max 1600px wide, quality 78
#   images/mobile/     WebP, max 800px wide,  quality 60  (+ lighter .mp4 loops)
# usage: ./make-images.sh          (only builds missing / outdated files)
#        ./make-images.sh --force  (rebuild everything)
# Keep using  img: 'images/<name>.jpg'  in data.js — app.js picks the right folder.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)/images"
FORCE="$1"
mkdir -p "$ROOT/desktop" "$ROOT/mobile"

stale() { [ "$FORCE" = "--force" ] || [ ! -f "$2" ] || [ "$1" -nt "$2" ]; }

for f in "$ROOT"/*.jpg "$ROOT"/*.jpeg "$ROOT"/*.png "$ROOT"/*.webp; do
  [ -f "$f" ] || continue
  name="$(basename "$f")"; base="${name%.*}"
  d="$ROOT/desktop/$base.webp"; m="$ROOT/mobile/$base.webp"
  if stale "$f" "$d"; then
    magick "$f" -auto-orient -strip -resize '1600x1600>' -quality 78 -define webp:method=6 "$d"
    echo "desktop  $base.webp  $(du -h "$d" | cut -f1)"
  fi
  if stale "$f" "$m"; then
    magick "$f" -auto-orient -strip -resize '800x800>' -quality 60 -define webp:method=6 "$m"
    echo "mobile   $base.webp  $(du -h "$m" | cut -f1)"
  fi
done

# lighter versions of the looping videos for phones
for f in "$ROOT"/*.mp4; do
  [ -f "$f" ] || continue
  name="$(basename "$f")"; m="$ROOT/mobile/$name"
  if stale "$f" "$m"; then
    ffmpeg -y -loglevel error -i "$f" -an -vf "scale='min(540,iw)':-2,fps=24" \
      -c:v libx264 -crf 32 -preset slow -pix_fmt yuv420p -movflags +faststart "$m"
    echo "mobile   $name  $(du -h "$m" | cut -f1)"
  fi
done
