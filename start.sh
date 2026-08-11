#!/usr/bin/env bash
#
# OpenLine — start script.
#
#   ./start.sh              start the dev server
#   ./start.sh --restart    stop whatever is on the port, then start fresh
#   ./start.sh --prod       build and serve a production bundle
#   ./start.sh --migrate    apply pending database migrations first
#   ./start.sh --test       run the full verification gate and exit
#   ./start.sh --stop       stop a running dev server and exit
#   ./start.sh --clean      discard the build cache first, then start
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
RESTART=false
CLEAN=false
PORT="${PORT:-3000}"

while [ $# -gt 0 ]; do
  case "$1" in
    --prod|--production) MODE="prod" ;;
    --migrate)           RUN_MIGRATIONS=true ;;
    --test)              MODE="test" ;;
    --restart)           RESTART=true ;;
    --stop)              MODE="stop" ;;
    --clean)             CLEAN=true ;;
    --port)              shift; PORT="${1:?--port needs a number}" ;;
    -h|--help)
      sed -n '2,14p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) die "Unknown option: $1  (try --help)" ;;
  esac
  shift
done

# ── Port management ──────────────────────────────────────────────────────────
#
# Next's own message when the port is taken is confusing: it starts on 3001,
# then exits 1 complaining that another server is running. Handle it here so the
# answer is always clear.

# `lsof` exits non-zero when nothing matches, which under `set -e` would abort
# the script rather than report "port is free". Always succeed; emptiness is the
# signal.
port_pid() { lsof -ti:"$PORT" 2>/dev/null | head -1 || true; }

stop_server() {
  local pid; pid="$(port_pid)"
  if [ -z "$pid" ]; then
    info "Nothing is listening on port $PORT."
    return 0
  fi
  info "Stopping the server on port $PORT (pid $pid)…"
  kill "$pid" 2>/dev/null || true
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    [ -z "$(port_pid)" ] && break
    command sleep 0.3
  done
  if [ -n "$(port_pid)" ]; then
    warn "It did not stop gracefully — forcing."
    kill -9 "$(port_pid)" 2>/dev/null || true
    command sleep 0.5
  fi
  [ -z "$(port_pid)" ] && ok "Port $PORT is free." || die "Could not free port $PORT."
}

if [ "$MODE" = "stop" ]; then
  stop_server
  exit 0
fi

if [ "$MODE" != "test" ]; then
  EXISTING_PID="$(port_pid)"
  if [ -n "$EXISTING_PID" ]; then
    if [ "$RESTART" = true ]; then
      stop_server
    else
      printf '\n'
      warn "A server is already running on port $PORT (pid $EXISTING_PID)."
      printf '  %s\n' "${DIM}Open it:${RESET}     http://localhost:$PORT"
      printf '  %s\n' "${DIM}Restart it:${RESET}  ./start.sh --restart"
      printf '  %s\n' "${DIM}Stop it:${RESET}     ./start.sh --stop"
      printf '  %s\n\n' "${DIM}Other port:${RESET}  ./start.sh --port 3001"
      exit 0
    fi
  fi
fi

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
OPENAI_KEY_VALUE="$(env_value OPENAI_API_KEY)"

# ── Dependencies ─────────────────────────────────────────────────────────────

if [ ! -d node_modules ]; then
  info "Installing dependencies…"
  pnpm install
elif [ pnpm-lock.yaml -nt node_modules ]; then
  info "Lockfile changed — reinstalling dependencies…"
  pnpm install
fi

# ── Build cache ──────────────────────────────────────────────────────────────
#
# Editing files while the dev server runs can leave Turbopack holding a compiled
# graph that references a package you have since removed, which then fails to
# resolve on every request. Clearing .next resolves it.

if [ "$CLEAN" = true ]; then
  info "Discarding the build cache…"
  rm -rf .next
  ok "Build cache cleared."
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

# ── Banner ───────────────────────────────────────────────────────────────────
#
# This app places real phone calls. That fact is printed every time.

printf '\n%s\n' "${BOLD}OpenLine${RESET} ${DIM}— the screening call that goes both ways${RESET}"
printf '%s\n' "${DIM}────────────────────────────────────────────────────────${RESET}"

if [ -n "$CALLE_KEY_VALUE" ]; then
  printf '  %s\n' "${RED}${BOLD}CALLS ARE LIVE${RESET} ${RED}— a candidate with a number on file will really be dialed.${RESET}"
else
  printf '  %s\n' "${YELLOW}No CALLE_API_KEY — scripts can be built, but no call can be placed.${RESET}"
fi

printf '  %s\n' "${DIM}Database:${RESET}  $([ -n "$DATABASE_URL_VALUE" ] && echo "${GREEN}configured${RESET}" || echo "${RED}missing — set DATABASE_URL${RESET}")"
printf '  %s\n' "${DIM}CALL-E:${RESET}    $([ -n "$CALLE_KEY_VALUE" ] && echo "${GREEN}key present${RESET}" || echo "${DIM}no key${RESET}")"
printf '  %s\n' "${DIM}OpenAI:${RESET}    $([ -n "$OPENAI_KEY_VALUE" ] && echo "${GREEN}key present${RESET}" || echo "${DIM}no key (default questions will be used)${RESET}")"
printf '%s\n\n' "${DIM}────────────────────────────────────────────────────────${RESET}"

[ -n "$DATABASE_URL_VALUE" ] || warn "Without DATABASE_URL the app will start but cannot load jobs or candidates."

# ── Start ────────────────────────────────────────────────────────────────────

if [ "$MODE" = "prod" ]; then
  info "Building production bundle…"
  pnpm run build
  info "Starting production server on http://localhost:$PORT"
  # Next reads PORT from the environment; passing flags through pnpm
  # re-forwards the "--" and Next reads it as a directory name.
  PORT="$PORT" exec pnpm run start
fi

info "Starting dev server on http://localhost:$PORT"
PORT="$PORT" exec pnpm run dev
