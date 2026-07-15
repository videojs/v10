---
status: implemented
date: 2026-05-20
definition: sketched
---

# Engine-adapter integration

Adapters drive an SPF engine through shared signal references rather than reaching into its behavior graph.

## Implemented decisions

- `shareSignals` publishes writable and readonly references after composition setup, creating a small framework-level adapter boundary.
- The HLS DOM adapter maps an HTMLMediaElement-shaped contract onto those references; other platforms may build different adapters on the same boundary.
- Engine lifetime is independent of media-element attachment. Attach/detach does not destroy the engine, and assigning another source recycles it.
- Programmatic play activates loading before delegating to native playback so preload gating cannot deadlock the request.
- The adapter owns platform semantics; behaviors remain reusable and unaware of wrapper classes.

## Deferred scope

Curated notifications, a public error-state contract, multiple simultaneous engines, and non-HTML adapters are separate API decisions.

## Current sources of truth

- Signal-sharing primitive and tests: `packages/spf/src/core/composition/share-signals.ts` and `packages/spf/src/core/composition/tests/share-signals.test.ts`
- HLS adapters and tests: `packages/spf/src/playback/engines/hls/`
- Public wrapper behavior: `packages/core/src/dom/media/simple-hls/`
