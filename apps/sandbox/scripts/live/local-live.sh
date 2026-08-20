#!/usr/bin/env bash
# Non-Mux local live HLS source — no Mux account or creds. ffmpeg generates a
# test pattern + tone, and its HLS muxer writes demuxed CMAF/fMP4 (master +
# audio group + fMP4 init/segments) to a temp dir, served with CORS and NO
# caching. SPF plays it (also the hls.js / native sandbox pages).
#
# A live playlist MUST be served no-cache (http-server -c-1): otherwise reloads
# return a stale media-sequence and the client's window never advances.
#
# Usage: ./local-live.sh [--port N]   (default 5399). Ctrl-C to stop.
#   Then open, e.g.:
#   http://localhost:5173/spf-segment-loading/?src=http://localhost:5399/master.m3u8&muted=true&autoplay=true&preload=auto
#
# Requires: ffmpeg, npx (http-server).
#
# 5399 rather than a conventional 8080/8000: a collision here is actively
# misleading, not merely inconvenient. Serving these playlists from someone
# else's server — with ordinary caching — reproduces the stale-media-sequence
# stall described above, which reads as a player bug. 5399 also stays clear of
# Vite's climb from 5173 and the e2e servers on 5180 / 5299.
set -uo pipefail

PORT=5399
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
cleanup() { kill "$SVR" "$FF" 2>/dev/null; }
# On EXIT, not just the signals: ffmpeg can die on its own (bad args, encoder
# error), which returns the `wait` at the end and drops off the script — leaving
# http-server holding the port. A stale server there is the misleading failure
# this port choice exists to avoid. INT/TERM route through `exit` so one handler
# runs and the error paths keep their own status.
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

npx http-server "$OUT" -p "$PORT" --cors -c-1 -s & SVR=$!
sleep 1

# Demuxed via --var_stream_map (video variant + EXT-X-MEDIA audio group); fMP4
# segments via -hls_segment_type fmp4; PDT for cross-track/reload timeline sync.
ffmpeg -re \
  -f lavfi -i testsrc=size=1280x720:rate=30 \
  -f lavfi -i sine=frequency=440:sample_rate=48000 \
  -map 0:v -map 1:a \
  -c:v libx264 -preset veryfast -tune zerolatency -crf 23 -maxrate 3M -bufsize 6M \
  -g 60 -keyint_min 60 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -ar 48000 \
  -f hls -hls_time 2 -hls_list_size 6 \
  -hls_flags independent_segments+omit_endlist+program_date_time \
  -hls_segment_type fmp4 \
  -hls_fmp4_init_filename 'init_%v.mp4' \
  -hls_segment_filename "$OUT/seg_%v_%05d.m4s" \
  -master_pl_name ffmpeg-master.m3u8 \
  -var_stream_map "v:0,agroup:aud,name:video a:0,agroup:aud,default:yes,name:audio" \
  "$OUT/stream_%v.m3u8" > "$OUT/ffmpeg.log" 2>&1 & FF=$!

# Publish a corrected master. ffmpeg (checked 7.1.1 and 8.0) never assigns
# `avg_bandwidth` on the live/non-final path in hlsenc.c's create_master_playlist,
# so AVERAGE-BANDWIDTH is uninitialized stack memory — observed both negative and
# implausibly large positive values, differing per run. Rewrite it to equal
# BANDWIDTH, which is what Mux Video emits (live and VOD, every rendition), so this
# fixture matches the shape of the real source it stands in for.
#
# A one-time snapshot is enough despite ffmpeg rewriting its own copy on every
# segment: the master is invariant here (one variant, fixed codecs/resolution).
# `-maxrate` above is what makes BANDWIDTH honest at all — without it libx264 runs
# pure CRF, `codecpar->bit_rate` stays 0, and BANDWIDTH ends up advertising only the
# audio bitrate (~140 kbps for 720p). `get_stream_bit_rate` falls back to the CPB
# max_bitrate, so capped CRF keeps CRF's rate control and still declares a ceiling.
FFMPEG_MASTER="$OUT/ffmpeg-master.m3u8"
for _ in $(seq 1 50); do
  [ -s "$FFMPEG_MASTER" ] && break
  kill -0 "$FF" 2>/dev/null || break
  sleep 0.2
done
if [ ! -s "$FFMPEG_MASTER" ]; then
  echo "✗ ffmpeg never wrote $FFMPEG_MASTER — see $OUT/ffmpeg.log" >&2
  exit 1
fi
sed -E 's/([:,])BANDWIDTH=([0-9]+),AVERAGE-BANDWIDTH=-?[0-9]+/\1BANDWIDTH=\2,AVERAGE-BANDWIDTH=\2/g' \
  "$FFMPEG_MASTER" > "$OUT/master.m3u8"

echo "▶ live: http://localhost:$PORT/master.m3u8  (sliding-window, demuxed CMAF)"
echo "  sandbox: http://localhost:5173/spf-segment-loading/?src=http://localhost:$PORT/master.m3u8&muted=true&autoplay=true&preload=auto"
echo "  Ctrl-C to stop."

wait "$FF" || echo "✗ ffmpeg exited — see $OUT/ffmpeg.log" >&2
