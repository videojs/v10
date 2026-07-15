---
status: implemented
date: 2026-04-06
---

# Hotkeys

This record preserves the rationale for declarative, player-scoped keyboard shortcuts. Current key syntax, actions, defaults, component props, and event behavior belong to source and tests.

## Problem

Media shortcuts must be configurable and accessible without stealing input from editable controls or causing multiple players to respond to one key event.

## Decisions

- Coordinate bindings per player target by default. Document-scoped bindings are explicit and route to the most recently active player.
- Parse declarative key patterns into normalized bindings, including platform-aware modifier aliases.
- Filter editable targets using the composed event path so input safety works across shadow boundaries.
- Resolve conflicts in one coordinator rather than in individual components.
- Keep action lookup separate from key matching so custom imperative handlers remain possible.
- Register active bindings with controls for `aria-keyshortcuts` rather than maintaining a second accessibility configuration.
- Default to keydown because operating-system behavior can suppress matching keyup events for modifier combinations.
- Share matching and coordination across HTML and React, with direct functions and hooks as escape hatches.

## Consequences

Each player can own predictable shortcuts without a global listener by default. Applications that opt into document scope accept cross-player routing responsibility. Physical-key layouts, iframe boundaries, key sequences, and visual shortcut help remain outside this core contract.

## Current sources of truth

- Parsing, coordination, actions, ARIA integration, and tests: `packages/core/src/dom/hotkey/`
- HTML element and tests: `packages/html/src/ui/hotkey/`
- React component, hooks, and tests: `packages/react/src/ui/hotkey/`
- Public exports and generated API reference
