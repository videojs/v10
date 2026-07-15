---
status: draft
date: 2026-05-20
definition: coarse
---

# Pseudo-ended detection

Recognize malformed VOD presentations that stall near their declared end and terminate them without misclassifying a recoverable network or decoder stall.

## Proposed direction

- Require near-end position, no forward buffer growth, and no outstanding append work.
- Keep detection separate from the termination mechanism.
- Coordinate with the existing endOfStream behavior rather than adding an independent owner.
- Gate narrowly by demonstrated browser/content failure modes.

## Before implementation

Capture a reproducible fixture first. Define the timing threshold, browser scope, interaction with stall recovery, and false-positive budget. Verify normal slow downloads, seek-back, and final-segment append.

## Related

[Buffer-stall recovery](./buffer-stall-recovery.md) and packages/spf/src/playback/behaviors/dom/end-of-stream.ts.
