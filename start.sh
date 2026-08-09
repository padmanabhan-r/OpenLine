#!/usr/bin/env bash
#
# OpenLine — start script.
#
#   ./start.sh              start the dev server
#   ./start.sh --prod       build and serve a production bundle
#   ./start.sh --migrate    apply pending database migrations first
#   ./start.sh --test       run the full verification gate and exit
#
# The banner it prints before starting is the point: this application can place
# real phone calls that cost money and reach real people, so whether *this*
# process is able to do that should never be something you have to guess.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'
YELLOW=$'\033[33m'; CYAN=$'\033[36m'; RESET=$'\033[0m'

info()  { printf '%s\n' "${CYAN}▸${RESET} $*"; }
ok()    { printf '%s\n' "${GREEN}✓${RESET} $*"; }
warn()  { printf '%s\n' "${YELLOW}!${RESET} $*"; }
die()   { printf '%s\n' "${RED}✗${RESET} $*" >&2; exit 1; }

MODE="dev"
RUN_MIGRATIONS=false

while [ $# -gt 0 ]; do
  case "$1" in
    --prod|--production) MODE="prod" ;;
    --migrate)           RUN_MIGRATIONS=true ;;
    --test)              MODE="test" ;;
    -h|--help)
      sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) die "Unknown option: $1  (try --help)" ;;
  esac
  shift
done

# ── Prerequisites ────────────────────────────────────────────────────────────

command -v node >/dev/null 2>&1 || die "node is not installed. Node 20+ is required."
command -v pnpm >/dev/null 2>&1 || die "pnpm is not installed. Try: npm install -g pnpm"

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || die "Node 20+ is required (found $(node -v))."

# ── Environment ──────────────────────────────────────────────────────────────

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    warn "No .env found — created one from .env.example."
    warn "Add your DATABASE_URL before the app can read or write anything."
  else
    die "No .env and no .env.example to copy from."
  fi
fi

# Read values without exporting the whole file, so a stray line in .env cannot
# clobber something in the caller's shell.
env_value() {
  # shellcheck disable=SC2016
  grep -E "^${1}=" .env 2>/dev/null | tail -1 | cut -d= -f2- | sed 's/^"//; s/"$//' || true
}

DATABASE_URL_VALUE="$(env_value DATABASE_URL)"
CALLE_KEY_VALUE="$(env_value CALLE_API_KEY)"
ANTHROPIC_KEY_VALUE="$(env_value ANTHROPIC_API_KEY)"
LIVE_CALLS_VALUE="$(env_value OPENLINE_LIVE_CALLS)"
ALLOWLIST_VALUE="$(env_value OPENLINE_CALL_ALLOWLIST)"

# ── Dependencies ─────────────────────────────────────────────────────────────

if [ ! -d node_modules ]; then
  info "Installing dependencies…"
  pnpm install
elif [ pnpm-lock.yaml -nt node_modules ]; then
  info "Lockfile changed — reinstalling dependencies…"
  pnpm install
fi

# ── Test mode exits here ─────────────────────────────────────────────────────

if [ "$MODE" = "test" ]; then
  info "Running verification gate (tests, typecheck, lint)…"
  pnpm run verify
  ok "All checks passed."
  exit 0
fi

# ── Migrations ───────────────────────────────────────────────────────────────

if [ "$RUN_MIGRATIONS" = true ]; then
  [ -n "$DATABASE_URL_VALUE" ] || die "--migrate needs DATABASE_URL set in .env"
  info "Applying database migrations…"
  pnpm run db:migrate
  ok "Migrations applied."
fi

# ── Safety banner ────────────────────────────────────────────────────────────
#
# Dry run is the default, and live dialing needs BOTH an explicit flag and the
# destination number on the allowlist. Both facts are printed every time.

allowlist_count=0
if [ -n "$ALLOWLIST_VALUE" ]; then
  allowlist_count="$(printf '%s' "$ALLOWLIST_VALUE" | tr ',' '\n' | grep -c '[^[:space:]]' || true)"
fi

printf '\n%s\n' "${BOLD}OpenLine${RESET} ${DIM}— the screening call that goes both ways${RESET}"
printf '%s\n' "${DIM}────────────────────────────────────────────────────────${RESET}"

if [ "$LIVE_CALLS_VALUE" = "true" ]; then
  if [ "$allowlist_count" -eq 0 ]; then
    printf '  %s\n' "${YELLOW}LIVE CALLS ENABLED — but the allowlist is empty, so nothing can dial.${RESET}"
  else
    printf '  %s\n' "${RED}${BOLD}LIVE CALLS ENABLED${RESET} ${RED}— real phone calls will be placed.${RESET}"
    printf '  %s\n' "${RED}${allowlist_count} number(s) on the allowlist. These cost money and reach people.${RESET}"
  fi
else
  printf '  %s\n' "${GREEN}Dry run${RESET} ${DIM}— scripts are generated and previewed, nothing dials.${RESET}"
fi

printf '  %s\n' "${DIM}Database:${RESET}  $([ -n "$DATABASE_URL_VALUE" ] && echo "${GREEN}configured${RESET}" || echo "${RED}missing — set DATABASE_URL${RESET}")"
printf '  %s\n' "${DIM}CALL-E:${RESET}    $([ -n "$CALLE_KEY_VALUE" ] && echo "${GREEN}key present${RESET}" || echo "${DIM}no key (dry run only)${RESET}")"
printf '  %s\n' "${DIM}Claude:${RESET}    $([ -n "$ANTHROPIC_KEY_VALUE" ] && echo "${GREEN}key present${RESET}" || echo "${DIM}no key (question generation unavailable)${RESET}")"
printf '%s\n\n' "${DIM}────────────────────────────────────────────────────────${RESET}"

[ -n "$DATABASE_URL_VALUE" ] || warn "Without DATABASE_URL the app will start but cannot load jobs or candidates."

# ── Start ────────────────────────────────────────────────────────────────────

if [ "$MODE" = "prod" ]; then
  info "Building production bundle…"
  pnpm run build
  info "Starting production server on http://localhost:3000"
  exec pnpm run start
fi

info "Starting dev server on http://localhost:3000"
exec pnpm run dev
