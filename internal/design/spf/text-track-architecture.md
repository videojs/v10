---
status: implemented
date: 2026-04-02
---

# Text track architecture

The text-track spike established reusable actor/reactor patterns for SPF. This record keeps those architectural findings; current states, messages, and data flow belong to the implementation and tests.

## Decisions

- Separate user intent from the resolved selected-track identifier. Constraints and defaults may resolve intent without overwriting it.
- Let reactors observe signals and choose states; let actors own asynchronous loading, queues, and message-driven work.
- Keep DOM interaction at the adapter boundary: DOM changes become intent, while the resolved selection is mirrored one way back to track modes. Guards prevent that mirror from being interpreted as fresh user intent.
- Use `deriveState`/monitor logic for transitions and per-state effects for work. Entry cleanup resets per-source state and aborts work when the owning state exits.
- Construct child actors in the owner that controls their lifetime. Destroy them from that same boundary.
- Use untracked reads for contextual values that should not restart work, and split independent reactive effects so each has its own dependency and cleanup scope.

## Consequences

Track discovery, selection, DOM synchronization, and cue loading can evolve independently. The pattern extends to audio and video track selection without making DOM state authoritative or mixing network lifecycle into selection logic.

The spike also exposed useful boundaries: actor ownership must be unambiguous, entry cleanup is load-bearing, and timing guards at browser integration points need focused tests. Cue deduplication policy and richer surfaced actor errors remain separate feature decisions rather than responsibilities of the machine primitives.

## Current sources of truth

- Text-track actors and tests: `packages/spf/src/playback/actors/`
- DOM track slots: `packages/spf/src/media/dom/text/`
- Setup, synchronization, loading behaviors, and tests: `packages/spf/src/playback/behaviors/dom/`
- Selection behavior and tests: `packages/spf/src/playback/behaviors/track-switching.ts` and `packages/spf/src/playback/behaviors/tests/track-switching.test.ts`
- Machine semantics: [Actor and reactor factories](actor-reactor-factories.md)
- Selection rationale: [Track switching](track-switching-model.md)
