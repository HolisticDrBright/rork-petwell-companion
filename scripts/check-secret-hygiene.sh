#!/usr/bin/env bash
# Secret hygiene gate (docs/SECURITY.md). Runs in CI and locally:
#
#   ./scripts/check-secret-hygiene.sh
#
# Three questions, each with a real answer rather than a keyword count:
#   1. Does anything that SHIPS IN THE APP BUNDLE read a server-side secret?
#      (Node-only tooling under expo/scripts legitimately does — it runs on a
#      developer's machine and is never bundled.)
#   2. Is any literal key material committed anywhere in the repo?
#   3. Is a real .env file tracked by git?
#
# Exits non-zero, printing every offending line, if any answer is yes.
#
# NOTE ON GREP EXIT CODES: grep returns 0 for "found", 1 for "not found" and 2
# for an error — including "no such directory". A missing scan path would
# otherwise look exactly like a clean result, so `scan` treats 2 as a hard
# failure. A gate that can't fail is worse than no gate.
set -uo pipefail

cd "$(dirname "$0")/.."

fail=0
report() {
  fail=1
  echo ""
  echo "FAIL: $1"
  echo "$2"
}

# scan <description> <extended-regex> <path...>
scan() {
  local what="$1" pattern="$2"
  shift 2
  local hits status
  hits=$(grep -rInE "$pattern" "$@" 2>&1)
  status=$?
  case "$status" in
    0) report "$what" "$hits" ;;
    1) : ;; # clean
    *) report "the scan for \"$what\" could not run (grep exit $status) — treat as unverified" "$hits" ;;
  esac
}

# Directories compiled into the shipped JS bundle. expo/scripts and
# supabase/functions are deliberately NOT here: those run server-side or on a
# developer machine, where reading a service key is the correct behaviour.
BUNDLED=(expo/app expo/components expo/lib expo/services expo/providers expo/constants expo/types)

# A renamed or deleted directory must break the build, not quietly shrink the
# scan's coverage.
for dir in "${BUNDLED[@]}"; do
  if [ ! -d "$dir" ]; then
    report "scan path '$dir' does not exist — update BUNDLED in $0" "The bundled-code scan is incomplete until this is fixed."
  fi
done

# 1. Server-only env vars must never be read from bundled code.
scan "bundled app code reads a server-side secret from the environment" \
  'process\.env\.[A-Z_]*(SERVICE_ROLE|OPENAI|ANTHROPIC|LLM_API|SMTP|POSTGRES|DATABASE_URL|PRIVATE_KEY|_SECRET)' \
  "${BUNDLED[@]}"

# 2. An EXPO_PUBLIC_* variable ships in the binary by definition, so it may
#    never be assigned anything that looks like a server key.
scan "a server-shaped key is assigned to an EXPO_PUBLIC_* variable" \
  'EXPO_PUBLIC_[A-Z_]*[[:space:]]*=[[:space:]]*["'"'"']?(sb_secret_|eyJ[A-Za-z0-9_-]{30,}|sk-[A-Za-z0-9_-]{20,})' \
  expo supabase --exclude-dir=node_modules

# 3. Literal key material anywhere in the tree. The patterns are shaped to match
#    REAL keys, not the strings that detect them: a Supabase secret key, a long
#    JWT, an OpenAI-style key.
scan "literal key material is committed to the repository" \
  '(sb_secret_[A-Za-z0-9_-]{8,}|eyJhbGciOi[A-Za-z0-9._-]{40,}|\bsk-[A-Za-z0-9]{20,})' \
  . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=web-build

# 4. Real .env files must never be tracked (only .env.example may be).
tracked=$(git ls-files | grep -E '(^|/)\.env($|\.)' | grep -v '\.example$' || true)
if [ -n "$tracked" ]; then
  report ".env file(s) tracked by git" "$tracked"
fi

if [ "$fail" -eq 0 ]; then
  echo "Secret hygiene: OK"
  echo "  · no bundled module reads a server-side secret"
  echo "  · no server-shaped value assigned to an EXPO_PUBLIC_* variable"
  echo "  · no literal key material committed"
  echo "  · no .env file tracked"
  exit 0
fi

echo ""
echo "See docs/SECURITY.md. Server secrets belong in Supabase Edge Function env vars"
echo "or EAS secrets — never in expo/ source or any EXPO_PUBLIC_* variable."
exit 1
