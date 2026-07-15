---
status: implemented
date: 2026-04-24
---

# Input feedback

Input-feedback components briefly confirm gesture and hotkey actions visually and to assistive technology. Current components, state, labels, timing, styling hooks, and supported actions belong to source and tests.

## Decisions

- Observe activated input actions instead of coupling feedback to each gesture or hotkey binding.
- Derive feedback from the pre-action media snapshot so toggle actions can describe the state that will result.
- Keep derivation and labels in framework-neutral core modules shared by HTML and React.
- Separate visual indicators from the screen-reader announcer. Visual surfaces remain decorative; one persistent polite status region owns announcements.
- Give status, volume, and seek feedback focused components rather than one configuration-heavy overlay.
- Coordinate visual visibility per player so feedback surfaces do not overlap, while allowing every accessible announcement to run.
- Preserve payload through exit transitions and reset transient accumulation only after close.
- Do not announce repeated seeking through this channel; ordinary media state exposes the resulting time.

## Consequences

Skins can arrange and animate independent feedback surfaces without duplicating action semantics. The observer boundary depends on action notification ordering, which is intentional and covered by core tests.

## Current sources of truth

- Derivation, lifecycle, component cores, styling contracts, and tests: `packages/core/src/core/ui/input-feedback/`
- Gesture and hotkey event sources: `packages/core/src/dom/gesture/` and `packages/core/src/dom/hotkey/`
- HTML elements: `packages/html/src/ui/status-indicator/`, `status-announcer/`, `volume-indicator/`, and `seek-indicator/`
- React components: corresponding directories under `packages/react/src/ui/`
- Preset composition and styling: package preset sources
