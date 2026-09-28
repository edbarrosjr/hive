#!/usr/bin/env bash
# Validate the three Caddy address modes without Docker, Caddy, or network access.
set -euo pipefail

root="$(cd "$(dirname "$0")" && pwd)"
compose="$root/docker-compose.hive.yml"
nginx="$root/nginx.hive.example.conf"
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }

awk '
  /^  caddy:/ { in_caddy=1 }
  in_caddy && /^    command:/ { in_command=1 }
  in_command && /^      - \|/ { in_script=1; next }
  in_script && /^    volumes:/ { exit }
  in_script { sub(/^        /, ""); print }
' "$compose" |
  awk '/echo "--- validacao ---"/ { exit } { print }' |
  sed -e 's/\$\$/\$/g' \
      -e 's|/etc/caddy/Caddyfile|"$CADDYFILE"|g' >"$scratch/generate-caddyfile.sh"

[[ -s "$scratch/generate-caddyfile.sh" ]] || fail "missing embedded Caddy generator"
bash -n "$scratch/generate-caddyfile.sh"

run_case() {
  local public_origin="$1"
  local caddy_address="$2"
  local tls="$3"
  local expected_address="$4"

  CADDYFILE="$scratch/Caddyfile" \
    HIVE_ORIGIN="$public_origin" \
    HIVE_CADDY_ADDRESS="$caddy_address" \
    HIVE_TLS="$tls" \
    bash "$scratch/generate-caddyfile.sh" >/dev/null

  [[ "$(head -n 1 "$scratch/Caddyfile")" == "$expected_address {" ]] ||
    fail "wrong site address for $expected_address"

  if [[ -n "$tls" ]]; then
    grep -F $'\ttls internal' "$scratch/Caddyfile" >/dev/null ||
      fail "missing internal TLS directive"
  elif grep -F $'\ttls ' "$scratch/Caddyfile" >/dev/null; then
    fail "unexpected TLS directive for $expected_address"
  fi
}

run_case 'https://app.example.com' '' '' 'https://app.example.com'
run_case 'https://app.example.com' 'http://:8443' '' 'http://:8443'
run_case 'https://app.example.com:8443' '' 'internal' 'https://app.example.com:8443'

grep -F 'proxy_pass http://127.0.0.1:8443;' "$nginx" >/dev/null ||
  fail "Nginx example does not target the internal Caddy port"
grep -F 'proxy_set_header Host $host;' "$nginx" >/dev/null ||
  fail "Nginx example does not preserve Host"
grep -F 'HIVE_BIND_ADDRESS:-0.0.0.0' "$compose" >/dev/null ||
  fail "Compose does not expose a configurable bind address"

echo "ok"
