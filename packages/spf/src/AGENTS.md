# `@videojs/spf` source guide

Treat source and tests as the current implementation truth. Use `internal/design/spf/` for rationale and conventions, then verify every claim against code.

## Layout and dependencies

- `core/`: runtime primitives and composition. It must not import `media/` or `dom/`.
- `media/`: media and playback-engine implementations built on `core/`. It must not import `dom/`.
- `dom/`: browser bindings built on `core/` and, when needed, `media/`.
- `index.ts`, `dom.ts`, `playback-engine.ts`: public export boundaries. Do not expose internals accidentally.

Place a new module at the lowest layer that satisfies its dependencies. Run `pnpm -F @videojs/spf check:boundaries` when moving code across layers.

## Implementation rules

- Read `internal/design/spf/conventions/README.md` and only the convention files relevant to the change.
- Follow nearby behavior, actor, reactor, signal, and cleanup shapes; do not reproduce their implementation rules here.
- Keep DOM types and APIs out of `core/`.
- Update the appropriate entry point when adding a public export.
- Keep public API bundle impact deliberate; use `pnpm -F @videojs/spf size` when the change can affect it.
- Prefer `const` and an expression over mutable `let` plus conditional reassignment when both remain readable.

## Verification

SPF has separate Vitest projects. Use the project that owns the code:

```bash
pnpm -F @videojs/spf test --project unit
pnpm -F @videojs/spf test --project playback-engine
pnpm -F @videojs/spf build
pnpm -F @videojs/spf check:boundaries
```

Use the matching `create-spf-*`, `change-spf-*`, `document-spf-*`, or `implement-spf-*` skill only when the requested workflow requires it.
