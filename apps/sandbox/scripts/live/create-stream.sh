#!/usr/bin/env bash
# Create a low-latency Mux live stream for testing live / DVR playback in any
# HLS-capable sandbox page. Prints the stream id, stream key, RTMPS ingest URL,
# and the live playback URL.
#
# Requires: curl, jq, and Mux API credentials. Credentials resolve from (in
# precedence order) the --token-id / --token-secret flags, else the
# MUX_TOKEN_ID / MUX_TOKEN_SECRET environment variables. Get them from the Mux
# dashboard → Settings → Access Tokens; never commit them. (Prefer the env vars:
# flag values are visible in the process list.)
#
# Usage: ./create-stream.sh [--token-id ID] [--token-secret SECRET]
#                           [--latency low|reduced|standard] [--quiet]
#   --quiet  print only "<id> <key> <playback-id>" on one line (for scripting).
set -euo pipefail

token_id="${MUX_TOKEN_ID:-}"
token_secret="${MUX_TOKEN_SECRET:-}"
latency="low"
quiet=0

usage() { sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'; }

while [ $# -gt 0 ]; do
  case "$1" in
    --token-id) token_id="$2"; shift 2 ;;
    --token-secret) token_secret="$2"; shift 2 ;;
    --latency) latency="$2"; shift 2 ;;
    --quiet) quiet=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; usage >&2; exit 1 ;;
  esac
done

[ -n "$token_id" ] || { echo "missing Mux token id (--token-id or MUX_TOKEN_ID)" >&2; exit 1; }
[ -n "$token_secret" ] || { echo "missing Mux token secret (--token-secret or MUX_TOKEN_SECRET)" >&2; exit 1; }

# latency_mode "low" → LL-HLS (PART-INF, ~2s target duration). new_asset_settings
# makes the stream record, so its recording asset can serve the DVR / EVENT
# manifest (see dvr-url.sh).
resp=$(curl -sS -u "$token_id:$token_secret" \
  -H 'Content-Type: application/json' \
  -d "{\"latency_mode\":\"$latency\",\"playback_policy\":[\"public\"],\"new_asset_settings\":{\"playback_policy\":[\"public\"]}}" \
  https://api.mux.com/video/v1/live-streams)

id=$(echo "$resp" | jq -r '.data.id // empty')
key=$(echo "$resp" | jq -r '.data.stream_key // empty')
pb=$(echo "$resp" | jq -r '.data.playback_ids[0].id // empty')

if [ -z "$id" ]; then
  echo "Mux API error:" >&2
  echo "$resp" | jq . >&2 2>/dev/null || echo "$resp" >&2
  exit 1
fi

if [ "$quiet" -eq 1 ]; then
  echo "$id $key $pb"
  exit 0
fi

cat <<EOF
Live stream created.

  Stream ID:      $id
  Stream key:     $key
  RTMPS ingest:   rtmps://global-live.mux.com:443/app/$key
  Live playback:  https://stream.mux.com/$pb.m3u8   (sliding-window live)

Next:
  ./broadcast.sh $key      # push a test feed in a separate terminal
  ./dvr-url.sh $id      # once broadcasting, get the DVR / EVENT playback URL
EOF
