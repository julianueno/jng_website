#!/bin/sh
# Turn new originals into web-sized copies. images/ is just a drop folder:
#   1. put new originals (.jpg .png .webp .mp4) straight into images/
#   2. run ./make-images.sh
#   3. it writes the copies below, then DELETES the originals (keep your own backup)
#   images/desktop/    WebP, max 2400px wide, quality 88   (+ .mp4 loops as-is)
#   images/mobile/     WebP, max 1200px wide, quality 80   (+ lighter 540px .mp4 loops)
#   (sized for retina screens: images fill the right panel and zoom slightly when animated)
# Keep using  img: 'images/<name>.jpg'  /  loop: 'images/<name>.mp4'  in data.js —
# app.js maps those to the right folder.
#   ./make-images.sh --keep   build copies but leave the originals in place
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)/images"
KEEP="$1"
mkdir -p "$ROOT/desktop" "$ROOT/mobile"

for f in "$ROOT"/*.jpg "$ROOT"/*.jpeg "$ROOT"/*.png "$ROOT"/*.webp; do
  [ -f "$f" ] || continue
  name="$(basename "$f")"; base="${name%.*}"
  d="$ROOT/desktop/$base.webp"; m="$ROOT/mobile/$base.webp"
  magick "$f" -auto-orient -strip -resize '2400x2400>' -quality 88 -define webp:method=6 "$d"
  magick "$f" -auto-orient -strip -resize '1200x1200>' -quality 80 -define webp:method=6 "$m"
  echo "$base.webp  desktop $(du -h "$d" | cut -f1)  mobile $(du -h "$m" | cut -f1)"
  [ "$KEEP" = "--keep" ] || rm "$f"
done

# looping videos: desktop keeps the file as made by make-loop.sh, phones get a lighter one
for f in "$ROOT"/*.mp4; do
  [ -f "$f" ] || continue
  name="$(basename "$f")"; m="$ROOT/mobile/$name"
  ffmpeg -y -loglevel error -i "$f" -an -vf "scale='min(540,iw)':-2,fps=24" \
    -c:v libx264 -crf 32 -preset slow -pix_fmt yuv420p -movflags +faststart "$m"
  if [ "$KEEP" = "--keep" ]; then cp "$f" "$ROOT/desktop/$name"; else mv "$f" "$ROOT/desktop/$name"; fi
  echo "$name  desktop $(du -h "$ROOT/desktop/$name" | cut -f1)  mobile $(du -h "$m" | cut -f1)"
done
