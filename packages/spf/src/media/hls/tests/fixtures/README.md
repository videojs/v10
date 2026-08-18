# Live HLS playlist fixtures

Real media-playlist snapshots captured from public Mux live test streams, used
by `parse-media-playlist.test.ts` to exercise carry-forward, container
detection, and `EXT-X-PROGRAM-DATE-TIME` handling against actual server output
(not just synthetic playlists).

URLs are **sanitized**: signed query strings (`signature`, `expires`, `skid`,
`cdn`, …) are stripped and absolute chunk URLs collapsed to bare filenames, so
no playback tokens live in the repo. Segments resolve against the test's shell
`url`. Tags (`EXTINF`, `PROGRAM-DATE-TIME`, `MEDIA-SEQUENCE`, `EXT-X-MAP`,
`EXT-X-PART`, …) are preserved verbatim.

| Fixture | Source profile | Captured | Notes |
|---|---|---|---|
| `live-ts-video-{1,2,3}.m3u8` | MPEG-TS, HLS v3, non-LL | 2026-06-15 | Three consecutive reloads, media-seq 85→86→88 — a **non-uniform window slide** (gap of 2), which the synthetic carry-forward tests don't cover. |
| `live-cmaf-video.m3u8` | CMAF/fMP4, HLS v7, LL-HLS | 2026-06-15 | `EXT-X-MAP`, `EXT-X-PART`/`PRELOAD-HINT`/`SERVER-CONTROL` (ignored by the parser today), PDT per segment. media-seq 81. |
| `live-cmaf-audio.m3u8` | CMAF/fMP4 demuxed audio | 2026-06-15 | The audio rendition paired with `live-cmaf-video`. media-seq 82 (offset +1 from video) — same segment number shares a PDT across tracks, the cross-track sync anchor. |

Source streams (live test assets — ephemeral, may not resolve later):

- TS: `https://stream.mux.com/00iwuqnq2leM4ZREDQxLUtH00y86bk6scDbc2yj9YmP00w.m3u8`
- CMAF/LL-HLS: `https://stream.mux.com/1DRguGQyA2K2TIelbV7rU7uePlZXHyYWR1LEMC8iTC4.m3u8`

To refresh: fetch a rendition playlist a few times ~5s apart, then sanitize with
`perl -0pe 's/\?[^"\s\n]*//g; s{https?://[^"\s]*/}{}g; s{URI="/[^"]*/}{URI="}g'`.
