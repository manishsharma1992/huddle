#!/usr/bin/env bash
# Browser tests for Huddle, run through the playwright-skill runner.
#   e2e/run.sh                 run every script
#   e2e/run.sh regression      run one script (file name without .js)
# Needs: the app running (TARGET_URL, default http://localhost:8090 → set to :8080 for ./run.sh),
#        Node 20+ (nvm's v22 is used) and Google Chrome (Playwright's own Chromium doesn't support macOS 12).
set -euo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH"
export PW_CHANNEL="${PW_CHANNEL:-chrome}" TARGET_URL="${TARGET_URL:-http://localhost:8090}"
export PW_ARTIFACT_DIR="${PW_ARTIFACT_DIR:-$PWD/artifacts}"
mkdir -p "$PW_ARTIFACT_DIR"
SKILL="$HOME/.claude/skills/playwright-skill"
scripts=("${@:-regression quick-taps gestures throw-then-vote reveal-latency reveal-stress}")
for s in ${scripts[@]}; do
  echo "=== $s"
  node "$SKILL/run.js" "$PWD/$s.js"
  [[ "$s" == gestures ]] && CPU_RATE=20 node "$SKILL/run.js" "$PWD/$s.js"
done
