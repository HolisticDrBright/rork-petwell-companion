#!/usr/bin/env bash
# Verify Petwell's public pages the way a store reviewer reaches them:
# anonymously, over HTTPS, from a desktop and from a phone.
#
#   ./scripts/check-public-urls.sh https://your-host.example/petwell
#
# Prints a markdown table to paste into docs/LAUNCH_REPORT_P0P1.md, and exits
# non-zero if any page a store requires is missing or wrong. It sends no
# cookies, no credentials and no identifying headers.
#
# What "wrong" means here is taken from what each store actually checks:
#   * the URL must answer 200 over HTTPS without a login wall;
#   * the page must be HTML with a mobile viewport, not a PDF or a download;
#   * the deletion page must name the app, give the in-app steps AND a route
#     for someone who cannot get into the app, and say what is kept;
#   * nothing may still carry a draft marker or a placeholder domain.
#
# It cannot tell you whether the support mailbox is read by a person. Send
# that address a test message and wait for a human reply.
set -uo pipefail

BASE="${1:-}"
if [ -z "$BASE" ]; then
  echo "usage: $0 <base-url>     e.g. $0 https://your-host.example/petwell" >&2
  exit 2
fi
BASE="${BASE%/}"

case "$BASE" in
  https://*) ;;
  *) echo "FAIL: the base URL must start with https:// (both stores require HTTPS)." >&2; exit 2 ;;
esac

UA_DESKTOP="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
UA_PHONE="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
fail=0

# fetch <url> <user-agent> <outfile>  →  "<status> <final-url> <content-type>"
# A request that never got an HTTP answer (DNS, TLS, timeout) reports status
# 000 and leaves curl's own explanation in $tmp/err for the result column.
fetch() {
  local out
  if out="$(curl -sS -L --max-redirs 5 --max-time 20 -A "$2" -o "$3" \
      -w '%{http_code} %{url_effective} %{content_type}' "$1" 2>"$tmp/err")"; then
    echo "$out"
  else
    : > "$3"
    echo "000 $1 none"
  fi
}

# need <file> <label> <extended-regex>  — the page must contain it.
need() { grep -qiE -- "$3" "$1" || { problems+="missing: $2; "; }; }
# ban <file> <label> <extended-regex>   — the page must not contain it.
ban() { grep -qiE -- "$3" "$1" && { problems+="still present: $2; "; }; }

echo "Checked $(date -u '+%Y-%m-%d %H:%M UTC') with $(curl --version | head -1 | cut -d' ' -f1-2), base ${BASE}"
echo
echo "| Page | URL tried | HTTP (desktop / phone) | Final URL | Type | Title | Result |"
echo "| --- | --- | --- | --- | --- | --- | --- |"

for page in "" privacy terms support delete-account; do
  label="${page:-site root}"
  best=""
  # A host may serve /privacy, /privacy.html or both. Either is acceptable;
  # report the first that answers 200 and say so if neither does.
  if [ -z "$page" ]; then candidates=("$BASE/"); else candidates=("$BASE/$page" "$BASE/$page.html"); fi
  for url in "${candidates[@]}"; do
    read -r d_status d_final d_type <<<"$(fetch "$url" "$UA_DESKTOP" "$tmp/d.html")"
    read -r p_status _ _ <<<"$(fetch "$url" "$UA_PHONE" "$tmp/p.html")"
    if [ "$d_status" = "200" ] && [ "$p_status" = "200" ]; then best="$url"; break; fi
  done
  url="${best:-${candidates[0]}}"
  if [ -z "$best" ]; then
    read -r d_status d_final d_type <<<"$(fetch "$url" "$UA_DESKTOP" "$tmp/d.html")"
    read -r p_status _ _ <<<"$(fetch "$url" "$UA_PHONE" "$tmp/p.html")"
  fi

  problems=""
  title="$(grep -oiE '<title>[^<]*' "$tmp/d.html" 2>/dev/null | head -1 | sed -E 's/<title>//I' | cut -c1-50)"

  if [ "$d_status" = "000" ]; then
    # No HTTP answer at all: say why, and skip checks that need a response.
    problems+="no HTTP response ($(tr '\n' ' ' < "$tmp/err" | sed -E 's/^curl: \([0-9]+\) //' | cut -c1-90)); "
  else
    [ "$d_status" = "200" ] || problems+="desktop got HTTP $d_status; "
    [ "$p_status" = "200" ] || problems+="phone got HTTP $p_status; "
    case "$d_final" in https://*) ;; *) problems+="final URL is not HTTPS; " ;; esac
    case "$d_type" in text/html*) ;; *) problems+="not served as HTML ($d_type); " ;; esac
  fi

  if [ "$d_status" = "200" ]; then
    need "$tmp/p.html" "mobile viewport tag" '<meta[^>]+name="viewport"'
    need "$tmp/d.html" "the app name Petwell" 'petwell'
    ban "$tmp/d.html" "draft or placeholder text" 'general template|<your-domain>|\[INSERT|lorem ipsum|TODO|TBD'
    ban "$tmp/d.html" "a sign-in wall" 'type="password"'
    case "$page" in
      privacy)
        need "$tmp/d.html" "what is collected" 'email address'
        need "$tmp/d.html" "how to delete" 'Delete account'
        need "$tmp/d.html" "a contact address" 'mailto:|@[a-z0-9.-]+\.[a-z]{2,}' ;;
      terms)
        need "$tmp/d.html" "the not-veterinary-advice statement" 'not veterinary advice|not a veterinarian' ;;
      support)
        need "$tmp/d.html" "a mailto link" 'href="mailto:' ;;
      delete-account)
        need "$tmp/d.html" "the in-app steps" 'Delete account'
        need "$tmp/d.html" "a route without app access" "can.?t access the app|cannot access the app"
        need "$tmp/d.html" "a mailto link" 'href="mailto:'
        need "$tmp/d.html" "what is deleted" 'What is deleted'
        need "$tmp/d.html" "what is kept and for how long" 'What is kept' ;;
    esac
  fi

  # The site root is a convenience, not a store requirement.
  if [ -n "$problems" ]; then
    if [ -z "$page" ]; then result="WARN — ${problems%; }"; else result="FAIL — ${problems%; }"; fail=1; fi
  else
    result="OK"
  fi
  echo "| $label | $url | $d_status / $p_status | ${d_final:-n/a} | ${d_type:-n/a} | ${title:-n/a} | $result |"
done

echo
if [ "$fail" -eq 0 ]; then
  echo "All required pages answered correctly. Paste these exact URLs into the store consoles."
else
  echo "At least one required page failed. Do not paste these URLs into a store console yet."
fi
exit "$fail"
