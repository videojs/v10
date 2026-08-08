---
status: implemented
date: 2026-08-07
---

# Menu

Video.js menus are headless compound components shared across React and custom-element adapters. Source and tests own the current component, element, part, attribute, and styling contracts.

## Problem

Applications need lightweight, independent menus. Player settings also need optional nested views, coordinated sizing, animation, and accessible focus management without making every menu load that machinery.

## Decisions

- Keep each menu's committed open state, items, focus, and positioning in a framework-neutral core. Open and close interactions request changes; adapters commit resolved controlled or uncontrolled state.
- Use compound parts rather than one configuration-heavy component so consumers can compose custom content while preserving behavior.
- Keep base Menu independent of parent detection, navigation stacks, transition coordination, and player-setting selectors. Retain `data-submenu` in the base Menu state/attribute contract so an explicit adapter binding can identify child content without transition-owned styling state.
- Bind nested settings explicitly through the shared core DOM coordinator, the existing React `Menu.TransitionRoot` and `Menu.TransitionView` parts, or `@videojs/html/ui/menu-transition`. The binding derives the active view from child menu roots and owns forward/back policy.
- Generate the root panel inside the transition binding. Consumers wrap child roots only; they do not author a root-view part.
- Use an ordinary menu item for a back row. Selecting it closes the child menu that owns it.
- Keep player-setting labels separate. React presets render labels from option hooks; HTML registers `<media-menu-item-value>` through `@videojs/html/ui/menu-settings`.
- Express panel state through `data-view-state`, `data-direction`, and the shared starting/ending transition attributes. CSS owns presentation and motion.
- Keep the shared coordinator state-only for rendered output. React and HTML subscribe to it and own data attributes, accessibility properties, focus effects, measurement, and CSS-variable publication.
- Publish destination size through `--media-menu-width` and `--media-menu-height`; base positioning publishes `--media-menu-available-width` and `--media-menu-available-height`.
- Keep inactive and outgoing panels in the live DOM for visual completion while applying `inert`, `aria-hidden`, and eventually `hidden`.
- Integrate with the platform popover boundary where available while retaining core behavior independently of it.

## Consequences

Base core and HTML imports exclude nested navigation, transition measurement, and setting integrations. React exposes transition parts on its complete `Menu` namespace and measures that namespace as a unit. React and HTML retain matching transition concepts while adapting rendering and registration to each platform. Unwrapped child menus remain independent popups.

## Current sources of truth

- Base core and tests: `packages/core/src/core/ui/menu/` and `packages/core/src/dom/ui/menu/`
- Shared DOM coordinator: `packages/core/src/dom/ui/menu/create-menu-transition.ts`
- HTML base and optional bindings: `packages/html/src/ui/menu/` and `packages/html/src/define/ui/menu-*.ts`
- React Menu namespace and transition binding: `packages/react/src/ui/menu/`
- Detailed rationale and migration: `rfc/menu-view-transitions.md`
- Public API reference and package exports
