#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
python -m pytest tests/python -q
if [[ -f docs/assets/js/simulations.js ]]; then
  node --check docs/assets/js/simulations.js
fi
mkdocs build --strict
echo "validate: ok"
