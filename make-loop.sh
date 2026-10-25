#!/bin/sh
# Turn any video into a short, silent, web-friendly loop for the site.
#   usage: ./make-loop.sh <input video> <entry id> [start seconds] [duration seconds]
#   e.g.   ./make-loop.sh ~/Downloads/shifa.mov medical 4 10
# Then add  loop: 'images/<entry id>-loop.mp4',  to that entry in data.js.
set -e
IN="$1"; ID="$2"; START="${3:-0}"; DUR="${4:-10}"
[ -z "$IN" ] || [ -z "$ID" ] && { echo "usage: $0 <input> <entry id> [start] [duration]"; exit 1; }
DIR="$(cd "$(dirname "$0")" && pwd)/images"
ffmpeg -y -loglevel error -ss "$START" -t "$DUR" -i "$IN" -an \
  -vf "scale=960:-2,fps=24" -c:v libx264 -crf 30 -preset slow -pix_fmt yuv420p -movflags +faststart \
  "$DIR/$ID-loop.mp4"
ffmpeg -y -loglevel error -ss "$START" -i "$IN" -frames:v 1 -vf "scale=1280:-2" -q:v 4 "$DIR/$ID-poster.jpg"
echo "wrote images/$ID-loop.mp4 ($(du -h "$DIR/$ID-loop.mp4" | cut -f1)) and images/$ID-poster.jpg"
