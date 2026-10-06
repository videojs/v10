---
status: draft
date: 2026-08-28
definition: technical
---

# Full-segment clear-key AES decryption

Decrypt HLS content protected by `EXT-X-KEY:METHOD=AES-128` (and the wider
full-segment family — `AES-256`, `AES-256-CTR`, `AES-256-GCM`): fetch the key
named by the tag, decrypt each downloaded resource, and hand cleartext to the
buffer. This is **clear-key over HTTP** — a transform in the segment-loading
pipeline (fetch → decrypt → append), categorically **not** EME/DRM. It shares
nothing with [drm-support](./drm-support.md)'s negotiation / MediaKeys / license
path; the two only collide in error reporting today (see below).

## Status

- **Composition:** not implemented. SPF has no segment decryptor. The parser
  marks any non-`NONE` `EXT-X-KEY` method as encrypted, and an `AES-128`
  *identity*-keyformat key yields zero key-system candidates
  (`keySystemCandidates`, `media/drm.ts`), so every rendition prunes.
- **Near-term (separate, shipping first):** the misdiagnosis fix — SPF currently
  reports `SVTA_UNSUPPORTED_DRM_SYSTEM` for this non-DRM content. That
  error-vocabulary correction (distinguish identity-keyformat keys, emit an
  "encryption method not supported" cause) is tracked with [drm-support](./drm-support.md)
  and remains the correct fallback for any unsupported method even after this
  feature lands.
- **Definition depth:** technical — scope, boundary, and prior-art evidence are
  articulated; no implementation exists.

## Phases of complexity

| Phase | What | Status |
|---|---|---|
| **Whole-segment AES-128-CBC** | Fetch the 16-byte key from the `EXT-X-KEY` URI; AES-128-CBC-decrypt each segment (and encrypted init segment), strip PKCS#7 padding, append. | **Not implemented** — the core case |
| **IV resolution** | Explicit `IV` attribute, else derived big-endian from the media-sequence number (low 32 bits of a 16-byte block) per RFC 8216 §5.2. | **Not implemented** |
| **Key fetch / cache / rotation** | Key request carries the source's tokenization; keys cached and reused; multiple `EXT-X-KEY` tags across a playlist rotate per-segment. | **Not implemented** |
| **AES-256 / -CTR / -GCM** | The same path generalizes (CTR/GCM change the WebCrypto algorithm; GCM parses IV + auth tag from the payload). | **Deferred** — additive once the CBC path exists |
| **SAMPLE-AES** | Sample/NAL-level partial decryption. A **separate, harder** capability, not this path. | **Out of scope** → [sample-aes-support] |

## What's in scope vs out of scope

**In scope:** whole-segment clear-key AES decryption as a segment-pipeline
transform, keyed off `METHOD` + identity keyformat, for both media and encrypted
init segments.

**Out of scope (separate SPF features):**
- **SAMPLE-AES** ([sample-aes-support]) — sample-level, materially harder. In the
  reference engines, clear-key (`keyFormat=identity`) SAMPLE-AES is decrypted
  in-player at sample granularity, while non-identity and fMP4 SAMPLE-AES route to
  EME. videojs/http-streaming never implemented it at all. Its own feature.

**Out of scope (different architectural layer):**
- EME/DRM key systems — [drm-support](./drm-support.md). The boundary is the
  keyformat: `identity` (or a bare `METHOD` with no DRM `KEYFORMAT`) is this
  feature; a DRM system-id keyformat is that one.

## What's not implemented

Everything above. The one shipped adjacent change is the error-diagnosis fix, so
that until this feature lands the refusal at least names the real gap rather than
blaming DRM.

## Likely cross-cutting impact

- **Segment-loading pipeline** — introduces a decrypt step between fetch and
  append (`load-segments` / `appendSegment` on the `media/dom` side). The first
  transform to sit on the raw fetched bytes before the container is touched.
- **Key fetch resilience** — the key request wants the same retry/timeout policy
  as segment and license fetches; see [network-resilience](./network-resilience.md).
- **Init-segment path** — an encrypted `EXT-X-MAP` init segment is decrypted the
  same way, before init parsing.

## Implementation surface (indicative, not built)

- A decrypt transform over fetched bytes: `crypto.subtle.decrypt({ name: 'AES-CBC',
  iv }, key, bytes)` with PKCS#7 handled by WebCrypto.
- A key loader over the `EXT-X-KEY` URI, cached by key identity; the parser already
  collects the keys (`getMediaPlaylistMetadata(track)?.keys` — `method`, `uri`,
  `keyId`, `iv`).
- IV derivation from the media-sequence number when the tag carries none.

## Prior art (3-engine survey, 2026-08-28)

All three keep whole-segment AES strictly out of their EME path and treat it as a
small, self-contained pipeline transform:

- **Shaka** — decrypt in `lib/media/streaming_engine.js:3053` (`fetch_()`) →
  `lib/media/segment_utils.js:832-889` (`aesDecrypt`, WebCrypto `AES-CBC`); kept
  off EME via `lib/hls/hls_parser.js:3736` and `stream.encrypted = encrypted &&
  !aesEncrypted`; IV/key at `hls_parser.js:3808,3853`. **~170 LOC**, and the same
  path is reused by the DASH parser.
- **hls.js** — `src/crypt/` (`decrypter.ts` WebCrypto + a pure-JS Rijndael
  fallback `aes-decryptor.ts`); classification in `utils/encryption-methods-util.ts`;
  `key-loader.ts:133` routes `AES-128` to `loadKeyHTTP` (only `SAMPLE-AES*` can hit
  `loadKeyEME`); IV derivation `level-key.ts:126-141,262-268`; SAMPLE-AES is a
  separate `demux/sample-aes.ts`, and fMP4 SAMPLE-AES is refused in-player
  (`demux/mp4demuxer.ts:255`). Crypt module **~647 LOC** incl. the fallback.
- **videojs/http-streaming** — `decryptSegment` in `src/media-segment-request.js`
  (key fetch ~1113), IV derivation `src/segment-loader.js:2875`, key cache gated on
  a `cacheEncryptionKeys_` option; crypto delegated to the vendored `aes-decrypter`
  package (**~500 LOC**) in a Web Worker — **no WebCrypto**, and **no SAMPLE-AES
  path** at all.

Takeaway: the CBC path is small and leans on the platform; WebCrypto is the modern
choice (hls.js, Shaka), a pure-JS cipher the fallback (VHS).

## Open questions

- **WebCrypto vs. bundled cipher.** WebCrypto `AES-CBC` is the default choice, but
  it cannot do progressive/range decryption (hls.js drops to software for byte-range
  and SAMPLE-AES). Whether SPF needs a software path depends on I-frame / byte-range
  scope.
- **How far the family goes** — CBC only, or AES-256/CTR/GCM in the first cut.
- **Whether SAMPLE-AES is one feature or several** ([sample-aes-support]).

## Related features

- [drm-support](./drm-support.md) — the EME sibling; the keyformat is the boundary.
- [network-resilience](./network-resilience.md) — the key fetch shares its policy.
- [sample-aes-support] — the deferred sample-level sibling (no doc yet).

## See also

- [drm-support](./drm-support.md) — scope boundary and the shared error-reporting seam.
