# Quick Review Checklist

Single-agent checklist for fast API reviews without forking.

## Types

- [ ] Inference-first (minimal explicit generics)?
- [ ] Helper types exported (`ExtractState`, etc.)?
- [ ] Type guards for discriminated unions?
- [ ] No `unknown` in public API?
- [ ] Generics have appropriate constraints?
- [ ] Parsing at boundaries, not scattered?
- [ ] Context narrowing explicit in middleware?

## API Surface

- [ ] Config objects for 3+ parameters?
- [ ] No boolean traps?
- [ ] No function overloads?
- [ ] One way to do each thing?
- [ ] Flat returns for independent values?
- [ ] Defaults documented?
- [ ] Immutable inputs (no config mutation)?
- [ ] Platform patterns used (familiar APIs)?

## Extensibility

- [ ] Extension through composition, not registration?
- [ ] Middleware ordering explicit (onion model)?
- [ ] Builder chains return new typed objects?
- [ ] Init/destroy lifecycle for resources?
- [ ] Framework-agnostic core (if applicable)?
- [ ] Adapters thin (<50 lines, no logic duplication)?

## Progressive Disclosure

- [ ] Zero-config default works?
- [ ] Complexity grows with use case?
- [ ] Escape hatches compose (don't replace defaults)?
- [ ] Contracts explicit (no hidden requirements)?
- [ ] Dangerous operations obviously named?

## Packaging

- [ ] ESM-first?
- [ ] `sideEffects: false`?
- [ ] Shallow subpaths (`pkg/react` not `pkg/react/hooks/store`)?
- [ ] Peer deps correct (not bundled)?
- [ ] Tree-shakeable exports?
