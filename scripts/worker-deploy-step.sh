#!/usr/bin/env bash
# One worker's deploy lifecycle: capture-prev → install → test → deploy →
# verify → rollback-to-explicit-version. If rollback exits non-zero (a Durable
# Object migration or a changed secret can block it), demand manual action.
set -euo pipefail

WRANGLER=(${WRANGLER_BIN:-npx wrangler})

# Capture the currently-live version BEFORE deploying, so rollback targets the
# exact known-good version rather than wrangler's default heuristic.
PREV_VERSION="$(cd "$WORKER_DIR" && node "${GITHUB_WORKSPACE}/scripts/wrangler-deployments.mjs" current-version || true)"
echo "previous version for ${WORKER_NAME}: ${PREV_VERSION:-<none>}"

cd "$WORKER_DIR"

if [ -f package.json ]; then
  npm ci
  case "$WORKER_KEY" in
    social) npm test ;;
    csp) npm test && npx tsc --noEmit ;;
    *) ;; # a future worker with a package.json but no known test command
  esac
fi

echo "::group::deploy ${WORKER_NAME}"
"${WRANGLER[@]}" deploy --message "gitsha:${GIT_SHA}"
echo "::endgroup::"

if node "${GITHUB_WORKSPACE}/scripts/verify-worker.mjs" "$WORKER_KEY"; then
  echo "verification passed for ${WORKER_NAME}"
  exit 0
fi

echo "::error::verification failed for ${WORKER_NAME} — attempting rollback"
if [ -z "$PREV_VERSION" ]; then
  echo "::error::MANUAL INTERVENTION REQUIRED for ${WORKER_NAME}: no previous version captured; cannot auto-rollback. Failed version gitsha:${GIT_SHA} is live."
  exit 1
fi

# --yes is belt-and-suspenders; in CI wrangler already auto-confirms (ci-info
# detects CI). Rolling back to an explicit version id, not the default heuristic.
if "${WRANGLER[@]}" rollback "$PREV_VERSION" --yes --message "auto-rollback ${GIT_SHA}"; then
  echo "rolled ${WORKER_NAME} back to ${PREV_VERSION}; re-verifying (probe retries internally)"
  node "${GITHUB_WORKSPACE}/scripts/verify-worker.mjs" "$WORKER_KEY" \
    || echo "::error::post-rollback verify still failing for ${WORKER_NAME}"
  exit 1
fi

echo "::error::MANUAL INTERVENTION REQUIRED for ${WORKER_NAME}: rollback to ${PREV_VERSION} failed. A Durable Object migration or a changed secret can block rollback. Failed version gitsha:${GIT_SHA} is live — roll back by hand."
exit 1
