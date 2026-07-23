#!/usr/bin/env bash
# Push an ffmpeg-generated test feed (color bars + 440 Hz tone) to a Mux live
# stream. Run in its own terminal; Ctrl-C to stop. Mux turns this into both a
# sliding-window live playlist and (because the stream records) a growing
# DVR / EVENT playlist.
#
# Usage: ./broadcast.sh <STREAM_KEY>
#   STREAM_KEY is printed by create-stream.sh.
set -euo pipefail

key="${1:-}"
if [ -z "$key" ]; then
  echo "Usage: $0 <STREAM_KEY>   (the stream key printed by create-stream.sh)" >&2
  exit 1
fi

# -re paces input at real time; zerolatency + short GOP keep segments small for
# low-latency live. CMAF/fMP4 output is what the SPF MSE pipeline appends.
exec ffmpeg -re \
  -f lavfi -i "testsrc=size=1280x720:rate=30" \
  -f lavfi -i "sine=frequency=440:sample_rate=48000" \
  -c:v libx264 -preset veryfast -tune zerolatency -g 60 -keyint_min 60 \
  -b:v 2500k -pix_fmt yuv420p \
  -c:a aac -b:a 128k -ar 48000 \
  -f flv "rtmps://global-live.mux.com:443/app/$key"
