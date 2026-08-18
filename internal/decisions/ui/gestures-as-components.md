---
status: decided
date: 2026-03-13
---

# Gestures Should Be UI Components

## Decision

Gestures (click-to-play, double-click-fullscreen, keyboard shortcuts, etc.) will be implemented as UI components, not store features.

## Context

Users reported that click-to-play and hotkey behavior were missing in v10. This surfaced an open design question: should gestures follow the store feature pattern (renderless behavior attached to the store/container) or the UI component pattern (declarative elements in markup)?

So far in v10, anything renderless that operates on the container has been a store feature (e.g. fullscreen, PiP), while things that render content or benefit from props live as UI components. Gestures are renderless, so the answer wasn't obvious.

## Alternatives Considered

- **Store feature** — Gestures don't render content and operate on the container, which fits the store feature pattern. Not chosen because store features make it harder to dynamically change options at runtime, can't be conditionally rendered based on context (e.g. ad playback, device type), and would unnecessarily expose gesture concerns on the store's surface area.

- **Store feature with script setup** — Similar to how fullscreen and PiP currently work. Not chosen because gestures benefit from a declarative HTML-first API without requiring JS setup, and adding more script-setup-only behaviors widens an inconsistency that we are trying to minimize.

## Rationale

## Why Components win for gestures

1. **Dynamic configuration via props** — Component attributes/props make it straightforward to change gesture settings at runtime without reaching into store internals.
2. **Conditional rendering** — Gesture components can be conditionally included or excluded from the DOM based on context (e.g. ad playback, device type), which is more natural than toggling a store feature flag.
3. **Clean declarative markup** — Keeping gestures in HTML as components avoids requiring script-based setup, which is the preferred pattern for v10's HTML-first API.
4. **No store surface area** — Gestures don't need to expose state or actions on the store (unlike fullscreen or PiP), so there's little benefit to them living there.
5. **Event structure over focus management** — DOM event bubbling and capture on the component tree handle gesture detection without requiring deep focus assumptions, which is important for Smart TV and custom focus-management library compatibility.

### When to prefer store features

The general heuristic:

| Criteria | → Store Feature | → UI Component |
|---|---|---|
| Renders content | No | Yes (or optional) |
| Needs dynamic prop-driven settings | No | Yes |
| Dispatches events consumed locally by framework | No | Yes |
| Exposes state/actions on the store (e.g. `isFullscreen`) | Yes | No |
| Renderless + operates on the container | Yes | Not necessarily |

Gestures are renderless but benefit strongly from dynamic props and conditional rendering, tipping the balance toward components.

### Gesture components and focus

Gesture components do **not** need focus. DOM structure combined with event bubbling/capture should account for all necessary interactions. This avoids problematic focus assumptions that conflict with Smart TV environments and spatial-navigation / focus-management libraries (a known pain point from prior Media Chrome work).

### Context menu

The native video element context menu should remain accessible by default. Blocking it to "prevent downloads" is considered an anti-pattern; if content protection is needed, an actual DRM/streaming solution (e.g. Mux) should be used instead. We may revisit this if strong real-world use cases emerge.

## Consequences

- Gesture behaviors (click-to-play, double-click-fullscreen, keyboard shortcuts, etc.) will each be implemented as custom element components.
- Fullscreen, PiP, and similar capabilities that expose store state will remain as store features, even though they currently require script setup — this inconsistency is accepted for now.