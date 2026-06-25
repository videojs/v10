#!/usr/bin/env bash
# Resolve the DVR / EVENT playback URL for a live stream that is currently
# broadcasting. Mux records by default; while the stream is active its recording
# asset (active_asset_id) serves a growing #EXT-X-PLAYLIST-TYPE:EVENT manifest —
# the DVR source, seekable back to the start — which is distinct from the live
# stream's own sliding-window playback id (from create-stream.sh).
#
# Usage: ./dvr-url.sh [--quiet] <STREAM_ID>
#   --quiet  print only the playback .m3u8 URL (for scripting).
#   Requires curl, jq, and MUX_TOKEN_ID / MUX_TOKEN_SECRET in the environment.
#   Exits non-zero (no asset yet) until the stream has started broadcasting.
set -euo pipefail

: "${MUX_TOKEN_ID:?set MUX_TOKEN_ID}"
: "${MUX_TOKEN_SECRET:?set MUX_TOKEN_SECRET}"

quiet=0
id=""
while [ $# -gt 0 ]; do
  case "$1" in
    --quiet) quiet=1; shift ;;
    -h|--help) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) id="$1"; shift ;;
  esac
done

[ -n "$id" ] || { echo "Usage: $0 [--quiet] <STREAM_ID>" >&2; exit 1; }

asset=$(curl -sS -u "$MUX_TOKEN_ID:$MUX_TOKEN_SECRET" \
  "https://api.mux.com/video/v1/live-streams/$id" | jq -r '.data.active_asset_id // empty')

if [ -z "$asset" ]; then
  echo "No active_asset_id yet — is the stream broadcasting? Start ./broadcast.sh first." >&2
  exit 1
fi

pb=$(curl -sS -u "$MUX_TOKEN_ID:$MUX_TOKEN_SECRET" \
  "https://api.mux.com/video/v1/assets/$asset" | jq -r '.data.playback_ids[0].id // empty')

[ -n "$pb" ] || { echo "recording asset $asset has no public playback id" >&2; exit 1; }

if [ "$quiet" -eq 1 ]; then
  echo "https://stream.mux.com/$pb.m3u8"
else
  echo "DVR / EVENT playback: https://stream.mux.com/$pb.m3u8   (growing window, back-seek to start)"
fi
