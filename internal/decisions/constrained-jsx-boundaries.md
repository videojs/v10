---
status: decided
date: 2026-06-20
---

# Constrained JSX Boundaries

## Decision

Core owns the Video.js constrained JSX surface: component manifests, generated component symbols, `defineComponent`, `createComponent`, `Slot`, and the JSX runtime/dev-runtime.

The compiler package remains generic. It may parse, match, transform, rewrite imports, and emit JSX, CSS, or diagnostics, but it must not contain Video.js component names, skin fixtures, runtime concepts, or platform assumptions.

Source JSX in core is target-neutral. It exposes only Video.js components and explicitly modeled component props. Shared base props are limited to `className` and `children`. Lowercase HTML intrinsics and generic platform attributes such as `id`, `role`, `tabIndex`, `hidden`, `aria-*`, `data-*`, `commandfor`, and `render` are not part of the core JSX source surface.

Target-specific lowering and adapter layers own platform output. HTML/React/native adapters can set ARIA, data attributes, focusability, command wiring, slots, and native element details as implementation output.

## Context

The skin port introduced pressure to share JSX across React, HTML, and future React Native targets. Allowing web-shaped source JSX in core would make the authoring surface look portable while quietly baking in DOM-only details.

At the same time, component generation had drifted toward the compiler package. That coupled a generic transform tool to Video.js UI manifests and made compiler tests depend on skin-specific fixtures.

## Alternatives Considered

- **Keep component generation in compiler** - Rejected because it makes `@videojs/compiler` aware of Video.js UI semantics and fixtures.
- **Allow HTML intrinsics and global attrs in core JSX** - Rejected because it leaks DOM shape into code that should lower to multiple targets.
- **Introduce generic layout primitives now** - Rejected because no shared primitive API has been designed yet; source JSX should use real Video.js components until that need is proven.
- **Let source authors set ARIA/data/focus attrs directly** - Rejected because those attributes are target output and should be derived from component state, defaults, or adapter behavior.

## Rationale

This keeps boundaries simple and enforceable. Core defines the portable component contract. Compiler stays reusable and mechanically testable. Target packages remain free to emit platform-specific markup without turning those details into cross-target source API.

The constrained JSX type surface also makes accidental DOM leakage fail at author time instead of during a later platform port.
