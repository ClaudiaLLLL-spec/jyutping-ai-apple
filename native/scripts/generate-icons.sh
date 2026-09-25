#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SVG="$ROOT/AppleApp/Resources/AppIcon.svg"
OUT="$ROOT/AppleApp/Resources/Assets.xcassets/AppIcon.appiconset"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
qlmanage -t -s 1024 -o "$TMP" "$SVG" >/dev/null 2>&1
SOURCE="$TMP/AppIcon.svg.png"
test -f "$SOURCE"
make_icon() { sips -z "$2" "$2" "$SOURCE" --out "$OUT/$1" >/dev/null; }
make_icon icon-20@2x.png 40
make_icon icon-20@3x.png 60
make_icon icon-29@2x.png 58
make_icon icon-29@3x.png 87
make_icon icon-40@2x.png 80
make_icon icon-40@3x.png 120
make_icon icon-60@2x.png 120
make_icon icon-60@3x.png 180
make_icon icon-1024.png 1024
make_icon icon-16.png 16
make_icon icon-16@2x.png 32
make_icon icon-32.png 32
make_icon icon-32@2x.png 64
make_icon icon-128.png 128
make_icon icon-128@2x.png 256
make_icon icon-256.png 256
make_icon icon-256@2x.png 512
make_icon icon-512.png 512
make_icon icon-512@2x.png 1024
echo "App icons generated in $OUT"
