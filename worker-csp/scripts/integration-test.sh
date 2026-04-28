#!/usr/bin/env bash
# Real-build integration test for worker-csp.
#
# Boots a local HTTP server against ../dist/ as the upstream "GitHub Pages"
# origin, runs `wrangler dev` with ORIGIN_HOST pointed at it, then curls
# representative URLs and asserts that:
#   - HTML responses carry a Content-Security-Policy header with a nonce
#   - <script> and <style> tags in the body are nonced with the SAME value
#   - Static assets (JS/CSS) pass through without a CSP header
#
# This is the lifted-out form of the integration test that miniflare's
# vitest-pool-workers can't run (?raw imports across package boundaries).
#
# Run from worker-csp/: ./scripts/integration-test.sh
set -euo pipefail

cd "$(dirname "$0")/.."

ORIGIN_PORT="${ORIGIN_PORT:-8765}"
WORKER_PORT="${WORKER_PORT:-8787}"
DIST_DIR="${DIST_DIR:-../dist}"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "error: $DIST_DIR not found. Run 'npm run build' from the repo root first." >&2
  exit 1
fi

if [[ ! -f "$DIST_DIR/index.html" ]]; then
  echo "error: $DIST_DIR/index.html missing — is the build complete?" >&2
  exit 1
fi

cleanup() {
  # Kill by port — survives subshell-PID indirection that lets stray
  # `python -m http.server` processes outlive ORIGIN_PID.
  for port in "$ORIGIN_PORT" "$WORKER_PORT"; do
    local pids
    pids=$(lsof -ti:"$port" 2>/dev/null || true)
    [[ -n "$pids" ]] && kill $pids 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Preflight: stale process on either port silently breaks the test (the
# readiness probe finds the wrong server). Refuse to run.
for port in "$ORIGIN_PORT" "$WORKER_PORT"; do
  if lsof -ti:"$port" >/dev/null 2>&1; then
    echo "error: port $port already in use. Free it or set ORIGIN_PORT/WORKER_PORT." >&2
    exit 1
  fi
done

echo "→ starting origin server on :$ORIGIN_PORT (serving $DIST_DIR)"
( cd "$DIST_DIR" && exec python3 -m http.server "$ORIGIN_PORT" >/tmp/csp-origin.log 2>&1 ) &
ORIGIN_PID=$!

echo "→ starting wrangler dev on :$WORKER_PORT (ORIGIN_HOST=localhost:$ORIGIN_PORT)"
ORIGIN_HOST="localhost:$ORIGIN_PORT" ORIGIN_PROTOCOL="http" \
  npx wrangler dev --port "$WORKER_PORT" --var "ORIGIN_HOST:localhost:$ORIGIN_PORT" --var "ORIGIN_PROTOCOL:http" \
  >/tmp/csp-worker.log 2>&1 &
WORKER_PID=$!

# Wait for both to be ready.
for i in {1..30}; do
  if curl -fsS "http://localhost:$ORIGIN_PORT/index.html" >/dev/null 2>&1 \
     && curl -fsS "http://localhost:$WORKER_PORT/" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "http://localhost:$WORKER_PORT/" >/dev/null 2>&1; then
  echo "error: worker did not come up. Last 30 lines of /tmp/csp-worker.log:" >&2
  tail -30 /tmp/csp-worker.log >&2
  exit 1
fi

fail=0
assert_csp() {
  local path="$1" desc="$2"
  echo "→ checking $desc ($path)"
  local headers tmp_body
  # Single GET — separate HEAD/GET each generate a fresh nonce, so the
  # header nonce wouldn't match scripts in the body. Body stays on disk
  # because shell command substitution mangles binary or large payloads.
  tmp_body=$(mktemp)
  headers=$(curl -sS -D - -o "$tmp_body" "http://localhost:$WORKER_PORT$path")

  local csp
  # Case-insensitive grep + cut: BSD awk on macOS ignores IGNORECASE, so
  # `Content-Security-Policy:` would slip past a lowercase awk pattern.
  csp=$(printf '%s' "$headers" | grep -i '^content-security-policy:' | head -1 | sed 's/^[^:]*: //')
  if [[ -z "$csp" ]]; then
    echo "  ✗ missing Content-Security-Policy header" >&2; fail=1; return
  fi

  local header_nonce
  header_nonce=$(printf '%s' "$csp" | sed -n "s/.*'nonce-\\([^']*\\)'.*/\\1/p")
  if [[ -z "$header_nonce" ]]; then
    echo "  ✗ no 'nonce-…' in CSP header" >&2; fail=1; return
  fi

  # Fixed-string match: nonces are base64 and may contain '+' / '/', which
  # are regex metacharacters under -E.
  if ! grep -qF "nonce=\"$header_nonce\"" "$tmp_body"; then
    echo "  ✗ header nonce $header_nonce not found in body" >&2
    echo "    body nonces: $(grep -oE 'nonce="[^"]+"' "$tmp_body" | sort -u | head -3 | tr '\n' ' ')" >&2
    rm -f "$tmp_body"; fail=1; return
  fi

  if grep -q '<meta http-equiv="Content-Security-Policy"' "$tmp_body"; then
    echo "  ✗ build-time meta CSP not stripped" >&2
    rm -f "$tmp_body"; fail=1; return
  fi

  rm -f "$tmp_body"
  echo "  ✓ nonce $header_nonce attached to scripts; meta CSP stripped"
}

assert_passthrough() {
  local path="$1"
  echo "→ checking static asset passes through ($path)"
  local headers
  headers=$(curl -sSI "http://localhost:$WORKER_PORT$path")
  if printf '%s' "$headers" | grep -qi '^content-security-policy:'; then
    echo "  ✗ unexpected CSP header on static asset" >&2; fail=1; return
  fi
  echo "  ✓ no CSP header (correct)"
}

assert_csp "/" "homepage"
assert_csp "/about/index.html" "about page"
assert_csp "/blog/index.html" "blog index"

# Pick a real built JS asset to verify pass-through.
asset=$(find "$DIST_DIR/_astro" -maxdepth 1 -name '*.js' -type f -print -quit 2>/dev/null || true)
if [[ -n "$asset" ]]; then
  assert_passthrough "/_astro/$(basename "$asset")"
fi

if (( fail )); then
  echo "✗ integration test failed"
  exit 1
fi
echo "✓ integration test passed"
