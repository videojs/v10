---
status: implemented
date: 2026-05-22
definition: implemented
---

# Background video

Provide a small SPF composition for decorative, muted video where audio and text processing are unnecessary.

## Decisions

- Background video is a dedicated engine composition rather than a mode flag.
- The engine selects a suitable video track and composes only the playback work needed by this scenario.
- Product-shell concerns such as autoplay policy, looping UI, and visual decoration remain in adapters or components.
- General silent-video delivery can share primitives without inheriting product-specific behavior.

## Current sources

- packages/spf/src/playback/engines/background-video/engine.ts
- packages/spf/src/playback/engines/background-video/tests/engine.test.ts
- the background-video media-element adapter and tests

Future thermal, visibility, or resolution policy should compose through selection constraints rather than grow this record into a roadmap.
