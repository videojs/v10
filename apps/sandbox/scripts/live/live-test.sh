#!/usr/bin/env bash
# Orchestrate a live / DVR sandbox test end to end: create a Mux live stream,
# start an ffmpeg test broadcast, wait for the playlist to go live, and open the
# chosen sandbox page pointed at it. On exit (Ctrl-C) the broadcast stops and the
# stream is deleted (unless --keep).
#
# The stream itself is renderer-agnostic — any HLS-capable sandbox page works.
# Point --page at the SPF harness or an hls.js / native player page, e.g.:
#   spf-segment-loading, live-hls-engine, html-hls-video, html-native-hls-video
#
# Usage: ./live-test.sh [options]
#   --page <name>     sandbox template dir (default: spf-segment-loading)
#   --flavor <f>      sliding | dvr | both          (default: sliding)
#   --port <n>        dev server port               (default: 5173)
#   --params <qs>     query string appended to the page URL
#                     (default: muted=true&autoplay=true&preload=auto)
#   --latency <m>     low | reduced | standard      (default: low)
#   --no-open         print the URL(s) instead of opening a browser
#   --keep            do not delete the Mux stream on exit
#   --token-id ID / --token-secret SECRET   Mux creds (default: env vars)
#
# Requires: curl, jq, ffmpeg, and Mux credentials (flags or MUX_TOKEN_ID /
# MUX_TOKEN_SECRET). Start the sandbox dev server (`pnpm dev`) first.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"

page="spf-segment-loading"
flavor="sliding"
port="5173"
params="muted=true&autoplay=true&preload=auto"
latency="low"
do_open=1
keep=0
token_id="${MUX_TOKEN_ID:-}"
token_secret="${MUX_TOKEN_SECRET:-}"

usage() { sed -n '2,28p' "$0" | sed 's/^# \{0,1\}//'; }

while [ $# -gt 0 ]; do
  case "$1" in
    --page) page="$2"; shift 2 ;;
    --flavor) flavor="$2"; shift 2 ;;
    --port) port="$2"; shift 2 ;;
    --params) params="$2"; shift 2 ;;
    --latency) latency="$2"; shift 2 ;;
    --no-open) do_open=0; shift ;;
    --keep) keep=1; shift ;;
    --token-id) token_id="$2"; shift 2 ;;
    --token-secret) token_secret="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; usage >&2; exit 1 ;;
  esac
done

case "$flavor" in sliding|dvr|both) ;; *) echo "--flavor must be sliding|dvr|both" >&2; exit 1 ;; esac
[ -n "$token_id" ] && [ -n "$token_secret" ] || { echo "missing Mux creds (--token-id/--token-secret or MUX_TOKEN_ID/MUX_TOKEN_SECRET)" >&2; exit 1; }
# Export so the child scripts (create-stream, dvr-url) inherit the resolved creds.
export MUX_TOKEN_ID="$token_id" MUX_TOKEN_SECRET="$token_secret"

open_url() {
  if [ "$do_open" -eq 0 ]; then echo "  open: $1"; return; fi
  if command -v open >/dev/null 2>&1; then open "$1"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$1"
  else echo "  open manually: $1"; fi
}

wait_for_m3u8() {
  for _ in $(seq 1 30); do
    curl -sf -o /dev/null --max-time 5 "$1" && return 0
    sleep 1
  done
  return 1
}

stream_id=""; bpid=""
cleanup() {
  trap - INT TERM EXIT
  [ -n "$bpid" ] && kill "$bpid" 2>/dev/null || true
  if [ "$keep" -eq 0 ] && [ -n "$stream_id" ]; then
    curl -sS -u "$MUX_TOKEN_ID:$MUX_TOKEN_SECRET" -X DELETE \
      "https://api.mux.com/video/v1/live-streams/$stream_id" >/dev/null 2>&1 || true
    echo "deleted live stream $stream_id"
  elif [ -n "$stream_id" ]; then
    echo "kept live stream $stream_id (delete it from the Mux dashboard when done)"
  fi
}
trap cleanup INT TERM EXIT

read -r stream_id stream_key live_pb < <("$here/create-stream.sh" --quiet --latency "$latency") || true
[ -n "$stream_id" ] || { echo "failed to create stream (check Mux credentials)" >&2; exit 1; }
echo "created live stream $stream_id"

log="${TMPDIR:-/tmp}/live-test-ffmpeg-$stream_id.log"
"$here/broadcast.sh" "$stream_key" >"$log" 2>&1 &
bpid=$!
echo "broadcasting (ffmpeg pid $bpid; log: $log)"

base="http://localhost:$port"
curl -sf -o /dev/null --max-time 2 "$base/$page/" \
  || echo "warning: dev server not responding at $base/$page/ — run 'pnpm dev' in apps/sandbox"

if [ "$flavor" = sliding ] || [ "$flavor" = both ]; then
  m="https://stream.mux.com/$live_pb.m3u8"
  echo "waiting for sliding-window live to go live…"
  wait_for_m3u8 "$m" && open_url "$base/$page/?src=$m&$params" || echo "sliding live did not come up in time"
fi

if [ "$flavor" = dvr ] || [ "$flavor" = both ]; then
  echo "waiting for the DVR / EVENT recording asset…"
  dvr=""
  for _ in $(seq 1 40); do
    dvr="$("$here/dvr-url.sh" --quiet "$stream_id" 2>/dev/null)" && [ -n "$dvr" ] && break
    dvr=""; sleep 2
  done
  if [ -n "$dvr" ] && wait_for_m3u8 "$dvr"; then open_url "$base/$page/?src=$dvr&$params"
  else echo "DVR / EVENT source did not come up in time"; fi
fi

echo "broadcasting — Ctrl-C to stop and clean up."
wait "$bpid"
