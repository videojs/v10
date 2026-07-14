---
status: implemented
date: 2026-04-13
---

# Menu

Video.js menus are headless compound components shared across React and custom-element adapters. Source and tests own the current component, element, part, attribute, and styling contracts.

## Problem

Player settings need nested views, radio and checkbox choices, keyboard navigation, animation, and accessible focus management without baking one skin or framework into the state model.

## Decisions

- Keep menu state and navigation in a framework-neutral core; React and HTML layers adapt that state to their component models.
- Use compound parts rather than one configuration-heavy component so consumers can compose custom content while preserving behavior.
- Model nested settings as a view stack with push, pop, and reset. One menu owns focus and navigation instead of mounting independent nested menus.
- Treat radio selection as an optional return to the parent view, matching compact media-control workflows.
- Express animation state through stable data attributes and measured CSS custom properties. CSS owns presentation and motion.
- Follow menu-button semantics: the trigger controls open state; active views own roving focus, arrow navigation, Home/End, activation, Escape, and return focus.
- Integrate with the platform popover boundary where available while retaining core behavior independently of it.

## Consequences

HTML and React can offer parity without sharing rendering code. Skins can replace markup and animation, but must preserve the core focus, naming, and selection contracts. Deep or rapidly changing navigation remains one coordinated state machine.

## Current sources of truth

- Core state, styling tokens, transitions, and tests: `packages/core/src/core/ui/menu/` and `packages/core/src/dom/ui/menu/`
- HTML elements and tests: `packages/html/src/ui/menu/`
- React components and tests: `packages/react/src/ui/menu/`
- Public API reference and package exports
