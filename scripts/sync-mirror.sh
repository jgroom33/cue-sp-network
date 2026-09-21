#!/usr/bin/env bash
#
# Sync the public mirror (jgroom33/cue-sp-network) with upstream main.
# Uses your own git credentials; nothing is stored in GitHub. Run after
# each merge on ciena-corp/cue-sp-network:
#
#   scripts/sync-mirror.sh          # main + tags
#   scripts/sync-mirror.sh --dry-run
#
# Remotes (override with UPSTREAM_REMOTE / MIRROR_REMOTE):
#   origin  ciena-corp/cue-sp-network   (source of truth)
#   github  jgroom33/cue-sp-network     (mirror; main is force-pushed)
#
set -euo pipefail

UPSTREAM_REMOTE=${UPSTREAM_REMOTE:-origin}
MIRROR_REMOTE=${MIRROR_REMOTE:-github}
BRANCH=${BRANCH:-main}
dry=""
[ "${1:-}" = "--dry-run" ] && dry="--dry-run"

cd "$(git rev-parse --show-toplevel)"
git fetch -q "$UPSTREAM_REMOTE" "$BRANCH" --tags
git fetch -q "$MIRROR_REMOTE" "$BRANCH" 2>/dev/null || true

src="refs/remotes/$UPSTREAM_REMOTE/$BRANCH"
before=$(git rev-parse --short "refs/remotes/$MIRROR_REMOTE/$BRANCH" 2>/dev/null || echo "none")
after=$(git rev-parse --short "$src")

if [ "$before" = "$after" ]; then
  echo "mirror already at $after"
else
  echo "mirror $BRANCH: $before -> $after"
fi
git push $dry --force "$MIRROR_REMOTE" "$src:refs/heads/$BRANCH"
git push $dry --force "$MIRROR_REMOTE" --tags
[ -n "$dry" ] && echo "(dry run, nothing pushed)" || echo "done"
