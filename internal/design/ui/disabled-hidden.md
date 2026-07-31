---
status: implemented
date: 2026-04-27
---

# Disabled and hidden controls

## Decision

Toolbar buttons use `aria-disabled`, not the HTML `disabled` attribute. This keeps visible disabled controls focusable and lets their tooltips explain why an action is unavailable.

Controls that are not useful are removed instead: HTML custom elements receive the native `hidden` attribute and React components return `null`. `data-disabled` and `data-hidden` remain styling hooks, while `data-availability` exposes the raw `available`, `unavailable`, or `unsupported` state.

Cast is the deliberate exception: an unsupported Cast button is hidden, but a supported button stays visible and disabled when no device is reachable.

## Rationale

The [WAI-ARIA toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) recommends `aria-disabled` so disabled controls remain discoverable during toolbar navigation. Native `hidden` provides semantic hiding without depending on a skin or consumer CSS.

Implementation and tests in `packages/core/src/core/ui/*-button/` define the current per-control availability rules.
