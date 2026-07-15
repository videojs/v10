---
status: implemented
date: 2026-03-19
---

# Gestures

This record explains the shared gesture architecture. Current gesture types, component props, hooks, actions, and conflict rules belong to source and tests.

## Decisions

- Separate input recognition from player actions. Framework-neutral recognizers report candidates; action resolution remains an adapter concern.
- Coordinate gestures once per player surface so tap/double-tap timing, pointer filtering, region precedence, and overlapping bindings have one authority.
- Support full-surface and named-region gestures, with region matches taking precedence over broader matches.
- Filter by pointer type at the binding boundary so touch and mouse can use different interactions without application-level mode switching.
- Share core recognizers and coordination across HTML and React while exposing platform-appropriate components and hooks.
- Return explicit cleanup from imperative factories and bind component lifetime to that cleanup.
- Keep gesture components declarative for common actions while preserving direct factories and callbacks as escape hatches.

## Consequences

Skins can compose familiar mobile and desktop interactions without duplicating recognition logic. Central coordination adds one ownership boundary, but prevents independent detectors from racing or firing conflicting actions.

## Current sources of truth

- Recognition, coordination, actions, and tests: `packages/core/src/dom/gesture/`
- HTML adapter and tests: `packages/html/src/ui/gesture/`
- React component, hooks, and tests: `packages/react/src/ui/gesture/`
- Related tactical choice: [`internal/decisions/ui/gestures-as-components.md`](../../decisions/ui/gestures-as-components.md)
- Public exports and generated API reference
