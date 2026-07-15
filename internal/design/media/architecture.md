---
status: implemented
date: 2026-04-08
---

# Media contracts

This record preserves why Video.js uses capability-based media contracts. TypeScript source, exports, adapters, and tests define the current interfaces and lifecycle.

## Problem

Treating every media target as a complete `HTMLMediaElement` coupled player state to the DOM and encouraged features to reach into platform details they did not need. Dynamic proxy and prototype-forwarding machinery also made custom media implementations difficult to inspect, type, and adapt to non-DOM environments.

## Decisions

- Define small capabilities for playback, source, seeking, volume, tracks, presentation modes, and related events instead of one mandatory browser-shaped contract.
- Keep core contracts structural and DOM-free. Minimal event, target, range, and track shapes allow browser objects to satisfy them without making browser types the abstraction boundary.
- Require a feature to narrow to the capability it needs. The base player target cannot imply support for optional media behavior.
- Put native-element forwarding in DOM host classes, where platform behavior belongs, rather than in the core contract.
- Expose engine ownership through `MediaEngineHost`; keep engine-specific state off the common media surface.
- Make engine destruction asynchronous so source or configuration replacement can wait for network and MediaSource cleanup.
- Keep HTML custom elements as adapters over core media hosts rather than a second media hierarchy.

## Consequences

Custom media can implement only the capabilities it supports, store features reveal their real dependencies, and non-DOM adapters can share the same core contracts. The cost is explicit capability checks and more interfaces, which is preferable to an implicit, oversized platform contract.

## Current sources of truth

- Contracts and type guards: `packages/core/src/core/media/`
- Browser hosts and engine-backed media: `packages/core/src/dom/media/`
- HTML element adapters: `packages/html/src/media/`
- Player feature consumers and tests: `packages/core/src/dom/store/features/`
- Public exports and generated API reference
