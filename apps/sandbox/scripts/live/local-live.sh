#!/usr/bin/env bash
# Non-Mux local live HLS source — no Mux account or creds. ffmpeg generates a
# test pattern + tone, and its HLS muxer writes demuxed CMAF/fMP4 (master +
# audio group + fMP4 init/segments) to a temp dir, served with CORS and NO
# caching. SPF plays it (also the hls.js / native sandbox pages).
#
# A live playlist MUST be served no-cache (http-server -c-1): otherwise reloads
# return a stale media-sequence and the client's window never advances.
#
# Usage: ./local-live.sh [--port N]   (default 8080). Ctrl-C to stop.
#   Then open, e.g.:
#   http://localhost:5173/spf-segment-loading/?src=http://localhost:8080/master.m3u8&muted=true&autoplay=true&preload=auto
#
# Requires: ffmpeg, npx (http-server).
set -uo pipefail

PORT=8080
while [ $# -gt 0 ]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    -h|--help) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 1 ;;
  esac
done

OUT="${TMPDIR:-/tmp}/spf-local-live"
rm -rf "$OUT"; mkdir -p "$OUT"

SVR=""; FF=""
cleanup() { kill "$SVR" "$FF" 2>/dev/null; exit 0; }
trap cleanup INT TERM

npx http-server "$OUT" -p "$PORT" --cors -c-1 -s & SVR=$!
sleep 1

echo "▶ live: http://localhost:$PORT/master.m3u8  (sliding-window, demuxed CMAF)"
echo "  sandbox: http://localhost:5173/spf-segment-loading/?src=http://localhost:$PORT/master.m3u8&muted=true&autoplay=true&preload=auto"
echo "  Ctrl-C to stop."

# Demuxed via --var_stream_map (video variant + EXT-X-MEDIA audio group); fMP4
# segments via -hls_segment_type fmp4; PDT for cross-track/reload timeline sync.
ffmpeg -re \
  -f lavfi -i testsrc=size=1280x720:rate=30 \
  -f lavfi -i sine=frequency=440:sample_rate=48000 \
  -map 0:v -map 1:a \
  -c:v libx264 -preset veryfast -tune zerolatency -g 60 -keyint_min 60 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -ar 48000 \
  -f hls -hls_time 2 -hls_list_size 6 \
  -hls_flags independent_segments+omit_endlist+program_date_time \
  -hls_segment_type fmp4 \
  -hls_fmp4_init_filename 'init_%v.mp4' \
  -hls_segment_filename "$OUT/seg_%v_%05d.m4s" \
  -master_pl_name master.m3u8 \
  -var_stream_map "v:0,agroup:aud,name:video a:0,agroup:aud,default:yes,name:audio" \
  "$OUT/stream_%v.m3u8" > "$OUT/ffmpeg.log" 2>&1 & FF=$!
wait "$FF"
