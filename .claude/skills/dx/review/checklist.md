# Quick Review Checklist

Single-agent checklist for fast DX reviews without forking. Each section links to its source reference in the `dx` skill.

## Types

See `dx/references/typescript-patterns.md` for patterns, `dx/references/anti-patterns.md` for anti-patterns.

- [ ] Inference-first (minimal explicit generics)?
- [ ] Helper types exported (`ExtractState`, etc.)?
- [ ] Type guards for discriminated unions?
- [ ] No `unknown` in public API?
- [ ] Generics have constraints?

## API Shape

See `dx/references/principles.md` for principles, `dx/references/anti-patterns.md` for anti-patterns.

- [ ] Config objects over positional args?
- [ ] No boolean traps?
- [ ] One way to do each thing?
- [ ] Defaults documented?
- [ ] Immutable inputs (no config mutation)?

## Composition

See `dx/references/state-patterns.md` for state, `api-design/principles/adapter-patterns.md` for adapters.

- [ ] Small composable units (modules/atoms)?
- [ ] Extension points (middleware/plugins)?
- [ ] Tree-shakeable exports?
- [ ] Core has zero framework deps?
- [ ] Adapters under 50 lines?

## Packaging

See `dx/references/anti-patterns.md` Packaging Anti-Patterns section.

- [ ] ESM-first?
- [ ] `sideEffects: false`?
- [ ] Shallow subpaths (`pkg/react`)?
- [ ] Peer deps correct?

## Related Skills

For UI component-specific reviews, load:

- `component` skill — compound components, polymorphism, styling patterns
- `aria` skill — keyboard, focus, ARIA attributes
