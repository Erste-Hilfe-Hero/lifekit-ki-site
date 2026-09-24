#!/bin/sh
cd "$(dirname "$0")" || exit 1
command -v node >/dev/null || { echo "Node.js ab 22.16.0 fehlt."; exit 1; }
exec node tools/launch.mjs --no-build --no-browser "$@"
