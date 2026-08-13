#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
python -m pytest tests/python -q
for js in docs/assets/js/simulations.js docs/assets/js/progress.js; do
  [[ -f "$js" ]] && node --check "$js"
done
python scripts/check_assets.py
mkdocs build --strict
echo "validate: ok"
