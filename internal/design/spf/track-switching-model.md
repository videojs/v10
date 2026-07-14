---
status: implemented
date: 2026-04-02
---

# Track switching: selection rules

This record explains the shared model for selecting video, audio, and text tracks. Current rule types, ordering, and behavior are defined in source and tests.

## Problem

Track selection combines hard requirements, user intent, stream defaults, language preference, quality, and fallback. Encoding all of that in a monolithic picker makes precedence implicit and difficult to reuse across track types.

## Decision

Selection is a chain with two kinds of operation:

1. Constraints narrow the candidate set when they match and otherwise preserve a usable fallback set.
2. Terminal rules choose or rank from the remaining candidates.

More authoritative intent is applied earlier. User intent therefore constrains the set before defaults or automatic quality rules choose within it. The same mechanism serves video, audio, and text even though each supplies different rules.

## Why this shape

- Each rule has one purpose and can be tested independently.
- Ordering makes authority and fallback visible at the composition site.
- Constraints separate "must prefer this subset" from "pick the best item."
- Track types share the orchestration without sharing domain-specific policy.
- Selection can be explained by inspecting the chain rather than tracing branches through one picker.

Ranked fallback is the main limitation: a sequence of narrowing rules cannot always express a complete multi-dimensional preference order. Add an explicit ranking terminal only when a feature needs that precision; do not complicate every constraint pre-emptively.

## Current sources of truth

- Rule-chain implementation: `packages/spf/src/playback/behaviors/track-switching.ts`
- Cross-track behavior tests: `packages/spf/src/playback/behaviors/tests/track-switching.test.ts`
- Shared quality selection: `packages/spf/src/media/abr/quality-selection.ts`
- Feature-specific compositions: `packages/spf/src/playback/engines/`
