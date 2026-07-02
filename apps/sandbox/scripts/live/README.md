# Live / DVR test streams (ffmpeg + Mux Video)

Spin up an ephemeral live HLS source to exercise the live path in the sandbox.
Uses `ffmpeg`'s built-in test-pattern generator pushed to a Mux live stream.

The stream is **renderer-agnostic** — it's a normal Mux HLS source, playable by
any HLS-capable sandbox page (the SPF engine, an hls.js-backed player, or native
HLS). Reuse comes from pointing `--page` at a different template, not from
per-renderer scripts.

One broadcast yields **two** sources to test:

- **Sliding-window live** — the live stream's own playback id (small window that
  rolls off the back).
- **DVR / EVENT** — the recording asset's playback id (`#EXT-X-PLAYLIST-TYPE:EVENT`,
  grows from the start, seekable all the way back), reached via the stream's
  `active_asset_id` while it's broadcasting.

Both are CMAF/fMP4, which is what the SPF MSE pipeline appends (it does not
transmux MPEG-TS, so generic TS live test streams won't play there).

## Local source (no Mux, no creds)

For a sliding-window live source without a Mux account, `local-live.sh` uses
ffmpeg's own HLS muxer to write **demuxed CMAF/fMP4** (master + audio group +
fMP4 init/segments) to a temp dir, served with CORS and **no caching**:

```sh
./local-live.sh                # serves http://localhost:8080/master.m3u8
# then open the sandbox at that src (start `pnpm dev` first):
open "http://localhost:5173/spf-segment-loading/?src=http://localhost:8080/master.m3u8&muted=true&autoplay=true&preload=auto"
```

The no-cache part is load-bearing (`http-server -c-1`): a live playlist served
with a positive `max-age` makes reloads return a stale media-sequence, so the
client's window never advances and playback stalls — a server misconfiguration,
not a player bug. Mux gets this right; a plain static file server does not by
default. (This is VOD-free and doesn't model DVR/EVENT — use the Mux flow above
for those.)

## Prerequisites (Mux flow)

- `ffmpeg`, `curl`, `jq` on `PATH`.
- A Mux access token (Mux dashboard → Settings → Access Tokens). Provide it via
  env vars (**preferred** — flag values show up in the process list) or flags:

  ```sh
  export MUX_TOKEN_ID=...
  export MUX_TOKEN_SECRET=...   # never commit these
  ```

- The sandbox dev server running: `pnpm dev` (from `apps/sandbox`).

## Quick start — `live-test.sh` (orchestrator)

Creates a stream, broadcasts, waits for it to go live, and opens the page.
Ctrl-C stops the broadcast and deletes the stream (use `--keep` to retain it).

```sh
cd apps/sandbox/scripts/live

# SPF segment-loading harness, sliding-window live (defaults):
./live-test.sh

# DVR / EVENT source on the SPF harness:
./live-test.sh --flavor dvr

# Open both flavors at once:
./live-test.sh --flavor both
```

Reuse across renderers — just change `--page` (and `--params` if the page
doesn't need SPF's `preload=auto` load quirk):

```sh
./live-test.sh --page live-hls-engine            # bare SPF engine harness
./live-test.sh --page html-hls-video             # hls.js-backed player component
./live-test.sh --page html-native-hls-video      # native HLS (Safari)
```

Options: `--page`, `--flavor sliding|dvr|both`, `--port`, `--params`,
`--latency low|reduced|standard`, `--no-open`, `--keep`, `--token-id`,
`--token-secret`. See `./live-test.sh --help`.

## Manual steps (the individual scripts)

```sh
# 1. Create a low-latency live stream. Note the Stream ID, Stream key, playback URL.
./create-stream.sh            # or: --token-id ID --token-secret SECRET --latency low

# 2. Broadcast a test feed (color bars + 440 Hz tone). Leave running; Ctrl-C to stop.
./broadcast.sh <STREAM_KEY>

# 3. Play it in the sandbox (default dev port 5173):
open "http://localhost:5173/spf-segment-loading/?src=https://stream.mux.com/<PLAYBACK_ID>.m3u8&muted=true&autoplay=true&preload=auto"

# 4. DVR / EVENT — resolve the recording asset's playback URL (stream must be
#    broadcasting), then open it the same way:
./dvr-url.sh <STREAM_ID>
```

The `spf-segment-loading` page's Live / DVR panel classifies the source
(`sliding live` vs `DVR (… seekable)`) and the seek controls drive
seek-to-live / DVR back-seek.

## Notes

- Live streams are **ephemeral**. `live-test.sh` deletes its stream on exit
  (unless `--keep`); the manual scripts leave it — clean up from the Mux
  dashboard so they don't accumulate.
- `preload=auto` is in the default params because the SPF page needs it to
  load+play a live source (autoplay alone isn't sufficient). Player-component
  pages manage their own loading; override `--params` for them as needed.
- `--latency low` gives LL-HLS (≈2 s segments); `reduced` / `standard` test
  other latencies.
- For an **on-demand** CMAF baseline (no live machinery), the sandbox default
  `https://stream.mux.com/JX01bG8eB4uaoV3OpDuK602rBfvdSgrMObjwuUOBn4JrQ.m3u8`
  is a public VOD asset.
