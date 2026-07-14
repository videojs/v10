---
status: implemented
date: 2026-02-09
---

# Slider

Video.js sliders are headless compound components shared by time, volume, and custom media controls. Source and tests own the current parts, tags, attributes, events, and CSS tokens.

## Problem

A media slider needs pointer and keyboard input, buffered and filled ranges, previews, thumbnails, accessible value text, and skin-controlled geometry without duplicating interaction logic in every domain slider.

## Decisions

- Put interaction and normalized value state in a framework-neutral core; adapt it into React and custom-element compound parts.
- Keep the thumb in the DOM at all times so focus, geometry, and assistive-technology identity remain stable.
- Put slider semantics and domain-specific labels/value text on the focusable thumb. Do not add a hidden native range input that would create a second control and synchronization path.
- Separate center-aligned and edge-aligned thumb geometry so endpoints can match either track centers or outer bounds without JS layout correction.
- Expose interaction and range state through data attributes and CSS custom properties; skins own visual rendering.
- Let domain sliders provide their own keyboard increments, orientation, labels, and formatted value text while reusing the shared interaction model.
- Keep rapidly changing visual value announcements out of a live region; the focused slider's ARIA value properties provide the accessible update.

## Consequences

Time and volume controls share one behavioral contract while retaining domain semantics. Custom skins can rearrange parts, but must preserve one focusable thumb and the core labeling and keyboard behavior.

## Current sources of truth

- Core and DOM behavior plus tests: `packages/core/src/core/ui/slider/` and `packages/core/src/dom/ui/`
- HTML elements and tests: `packages/html/src/ui/slider/`
- React components and tests: `packages/react/src/ui/slider/`
- Time and volume specializations in the corresponding package UI directories
- Public API reference and package exports
