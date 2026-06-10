---
status: draft
date: 2026-06-08
---

# Error Model

A structured error model for surfacing playback failures to analytics and UI
in a consistent, consumable way across all playback types.

## Problem

Before PR #1164, errors from hls.js and native HLS were inconsistently
surfaced — different shapes, no stable codes, no state the UI or analytics
could subscribe to. The error dialog and analytics integrations had no
contract to build against.

PR #1164 laid the foundation: `MediaError` class, `errorFeature`, HLS/native
mixins, `selectError`, and error dialog. Three gaps remain:

1. **Narrow state interface** — `MediaErrorState.error` is typed as
   `{ code, message }` (the interface in `state.ts`), not the class. Analytics
   consumers can't read `fatal` or `context` from `selectError` without casting.

2. **Non-fatal errors are dropped** — the HLS mixin suppresses recoverable
   errors (`if (!data.fatal) return`). Analytics needs these for reliability
   metrics; UI does not.

3. **No SPF-level error surface** — pipeline-level failures (network timeouts,
   VTT segment errors, ABR failures) are logged to console but never reach
   the player error state. See #441.

## Design

### The `MediaError` class

Six codes aligned with W3C spec: `MEDIA_ERR_ABORTED` (1),
`MEDIA_ERR_NETWORK` (2), `MEDIA_ERR_DECODE` (3), `MEDIA_ERR_SRC_NOT_SUPPORTED`
(4), `MEDIA_ERR_ENCRYPTED` (5), plus `MEDIA_ERR_CUSTOM` (100) for everything
else. Codes 2–5 are auto-`fatal`; everything else defaults to non-fatal unless
explicitly set.

Properties beyond the W3C spec: `fatal: boolean`, `context?: string` (a
provider-specific detail string, e.g. hls.js `ErrorDetails`), and `data?: unknown`
(raw provider payload — untyped escape hatch for debugging).

`context` is the analytics escape hatch for sub-categorizing errors without
adding more numeric codes. For example, `MEDIA_ERR_NETWORK + context: 'manifestLoadError'`
is more actionable than just `code: 2`.

### State interface

`MediaErrorState.error` will be widened from `{ code, message }` to include
`fatal` and `context`. `data` stays off the interface — it has no stable type
contract and is for debugging only.

`selectError` then returns enough for analytics to categorize errors without
inspecting raw provider payloads.

### Non-fatal error surface

Fatal errors go to `error: MediaError | null` — same as today. Only one
active error at a time; it's cleared on `dismissError()` or `emptied`.

Non-fatal (recoverable) errors go to a separate `warnings: readonly MediaError[]`
state, accumulated and cleared on `emptied`. The HLS mixin emits a
`CustomEvent('warn', { detail: error })` for non-fatal errors instead of
dropping them. The error dialog ignores `warnings`; analytics subscribes
via `selectWarnings`.

Using a separate channel rather than one merged array keeps the UI contract
simple (`error` = playback stopped, `warnings` = informational).

### Error flow

```
native/hls.js error
  ├── fatal   → ErrorEvent('error')   → errorFeature → store.error
  └── non-fatal → CustomEvent('warn') → warningsFeature → store.warnings

SPF pipeline error (#441)
  └── maps to MediaError → same ErrorEvent/warn channel
```

### Analytics contract

Stable fields consumers can rely on:

| Field | Stable | Notes |
|-------|--------|-------|
| `code` | ✅ | W3C codes 1–5 + 100 |
| `message` | ✅ | Human-readable default per code |
| `fatal` | ✅ | Whether playback stopped |
| `context` | ✅ | Provider detail string (hls.js `ErrorDetails`, etc.) |
| `data` | ❌ | Raw provider object — debugging only, no contract |

## Alternatives Considered

**Single `errors` array (all errors, severity flag)** — simpler shape but
forces UI to filter by `fatal` on every render. Fatal/non-fatal separation
in the state is the right model because their consumers are different (UI
vs. analytics).

**`errorCategory` enum** (`network`, `drm`, `decode`, etc.) instead of
`context` string — was in the original #982 scope, descoped. A typed enum
adds maintenance overhead when provider error strings change; `context` is
sufficient for analytics to substring-match without requiring enum alignment.

**Surface non-fatal errors through `ErrorEvent`** instead of a new
`CustomEvent('warn')` — would let consumers use one listener but conflates
severity at the event level. A distinct event name makes filtering trivially
clear without inspecting payloads.

## Open Questions

1. Should `warnings` be bounded (e.g., last N) to avoid unbounded growth on
   poor connections? An array cap of ~10 seems reasonable.

2. Does the SPF `warn` channel (#441) emit `MediaError` instances directly,
   or does it use a different shape that gets mapped at the feature layer?
   Should align before both land.
