#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"

cd "$repo_root"

if ! command -v ncu >/dev/null 2>&1; then
  echo "npm-check-updates is not installed"
  npm install --global npm-check-updates
else
  echo "ncu is installed"
fi

update_dependencies() {
  echo "updating dependencies in $(pwd)..."
  ncu -u -x @types/node -x @babel/preset-typescript -x typescript
}

update_dependencies

for workspace in packages/cache-worker packages/build packages/e2e; do
  (
    cd "$repo_root/$workspace"
    update_dependencies
  )
done

npm install

echo "Great Success!"
