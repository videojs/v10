# Quick Review Checklist

Single-agent checklist for fast API reviews without forking.

## Types

See `references/typescript.md` for patterns, `references/anti-patterns.md` for anti-patterns.

- [ ] Inference-first (minimal explicit generics)?
- [ ] Helper types exported (`ExtractState`, etc.)?
- [ ] Type guards for discriminated unions?
- [ ] No `unknown` in public API?
- [ ] Generics have appropriate constraints?
- [ ] Parsing at boundaries, not scattered?
- [ ] Context narrowing explicit in middleware?

## API Surface

See `references/principles.md` for principles, `references/anti-patterns.md` for anti-patterns.

- [ ] Config objects for 3+ parameters?
- [ ] No boolean traps?
- [ ] No function overloads?
- [ ] One way to do each thing?
- [ ] Flat returns for independent values?
- [ ] Defaults documented?
- [ ] Immutable inputs (no config mutation)?
- [ ] Platform patterns used (familiar APIs)?

## Extensibility

See `references/extensibility.md` for patterns.

- [ ] Extension through composition, not registration?
- [ ] Middleware ordering explicit (onion model)?
- [ ] Builder chains return new typed objects?
- [ ] Init/destroy lifecycle for resources?
- [ ] Framework-agnostic core (if applicable)?
- [ ] Adapters thin (<50 lines, no logic duplication)?

## Progressive Disclosure

See `references/principles.md` for patterns.

- [ ] Zero-config default works?
- [ ] Complexity grows with use case?
- [ ] Escape hatches compose (don't replace defaults)?
- [ ] Contracts explicit (no hidden requirements)?
- [ ] Dangerous operations obviously named?

## Packaging

See `references/anti-patterns.md` Packaging section.

- [ ] ESM-first?
- [ ] `sideEffects: false`?
- [ ] Shallow subpaths (`pkg/react` not `pkg/react/hooks/store`)?
- [ ] Peer deps correct (not bundled)?
- [ ] Tree-shakeable exports?

## Related Skills

For UI component-specific reviews, also check:

- `component` skill — compound components, polymorphism, styling patterns
- `aria` skill — keyboard, focus, ARIA attributes
