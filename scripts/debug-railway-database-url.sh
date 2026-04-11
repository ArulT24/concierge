#!/usr/bin/env bash
# Debug what Railway stores for DATABASE_URL (safe: masks password, shows + vs _).
# Prereqs: brew install railway; then from repo root:
#   railway login
#   railway link
# Optional: railway variable list -s <service-name> if multiple services

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Railway CLI =="
railway --version

echo ""
echo "== Auth =="
if ! railway whoami 2>/dev/null; then
  echo "Not logged in. Run: railway login"
  exit 1
fi

echo ""
echo "== Linked project / service =="
railway status 2>/dev/null || true

echo ""
echo "== Variable list (KV) — scheme inspected (password masked) =="
railway variable list -k 2>/dev/null | python3 -c '
import sys
for line in sys.stdin:
    if not line.startswith("DATABASE_URL="):
        continue
    url = line.split("=", 1)[1].strip().strip("\"")
    if "@" in url and "://" in url:
        scheme, rest = url.split("://", 1)
        userinfo, _, host = rest.partition("@")
        if ":" in userinfo:
            user, _, _ = userinfo.partition(":")
            safe = scheme + "://" + user + ":***@" + host
        else:
            safe = scheme + "://***@" + host
    else:
        safe = url[:50] + ("..." if len(url) > 50 else "")
    print("KV masked:", safe)
    print("KV first-40 repr:", repr(url[:40]))
    print("KV has plus after postgresql ?", "postgresql+" in url[:30] and "asyncpg://" in url[:40])
    break
else:
    print("(no DATABASE_URL in KV output)")
'

echo ""
echo "== Parsed DATABASE_URL debug =="
JSON="$(railway variable list --json 2>/dev/null || true)"
if [[ -z "$JSON" ]]; then
  echo "No JSON output. Run from repo root: railway link"
  exit 1
fi

echo "$JSON" | python3 -c '
import json, sys
raw = sys.stdin.read()
try:
    data = json.loads(raw)
except json.JSONDecodeError as e:
    print("Could not parse JSON:", e)
    print(raw[:500])
    sys.exit(1)

# Accept several possible Railway JSON shapes
pairs = {}
if isinstance(data, dict):
    if "variables" in data and isinstance(data["variables"], list):
        for item in data["variables"]:
            if isinstance(item, dict) and "name" in item:
                pairs[item["name"]] = item.get("value", "")
    else:
        for k, v in data.items():
            if k != "variables":
                pairs[k] = v
elif isinstance(data, list):
    for item in data:
        if isinstance(item, dict) and "name" in item:
            pairs[item["name"]] = item.get("value", "")

url = pairs.get("DATABASE_URL")
if not url:
    print("DATABASE_URL not found. Keys:", sorted(pairs.keys())[:40])
    sys.exit(1)

# Strip accidental wrapping quotes some UIs add
url = url.strip().strip("\"")

prefix, sep, rest = url.partition("://")
userinfo, sep2, hostpath = rest.partition("@") if "@" in rest else ("", "", rest)
# Mask password in userinfo (postgres:secret -> postgres:***)
if ":" in userinfo:
    user, _, _pwd = userinfo.partition(":")
    masked_userinfo = user + ":***"
else:
    masked_userinfo = userinfo or "(none)"

masked = prefix + "://" + masked_userinfo + ("@" + hostpath if sep2 else "")
print("Masked URL:", masked)
print("Length:", len(url))
print("Starts with postgresql+asyncpg:// ?", url.startswith("postgresql+asyncpg://"))
print("Contains literal underscore dialect (wrong) ?", "postgresql_asyncpg" in url[:40])

# Show first 35 chars with ASCII code for each character in the scheme
chunk = url[:40]
print("First chars (repr):", repr(chunk))
print("Codepoints (scheme area):", [(c, ord(c)) for c in url[:25]])
'
