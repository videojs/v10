# Feature Design Guidance

Guidance for writing feature design docs. Think of these as **proto-user-facing docs** — the API surface spec plus the state/store context needed for implementation.

## When to Use

- New internal APIs or store features
- Architectural decisions in your area
- Design patterns you're introducing
- Extensibility mechanisms

## Templates

| Template                      | Use For                                   |
| ----------------------------- | ----------------------------------------- |
| `templates/feature-single.md` | Straightforward designs with one concept  |
| `templates/feature-multi.md`  | Designs that benefit from a separate file for debated decisions |

## Structure

**Single-file:** Problem → Solution → Quick Start → API Surface → State & Store → Behavior → Open Questions

**Multi-file:**

- `index.md` — Problem, API surface, state requirements, behavior
- `decisions.md` — Only when decisions are raised and debated

No `architecture.md` — implementation details go in `.claude/plans/`. No `examples.md` — keep examples in the main doc, minimal.

## State & Store

Every feature design should document its store integration:

- What slice/feature does it define? What's the state shape?
- What selectors or derived state does it expose?
- What requests/actions does it handle?
- Dependencies on other features/slices?
- Any side effects on connect/disconnect?

## Tips

1. **Start with the problem** — Why does this feature exist?
2. **API surface is the core** — What does the consumer interact with?
3. **State shape is critical** — Document what state this introduces
4. **Keep examples in the doc** — No separate examples file needed
5. **Decisions only when debated** — Don't scaffold `decisions.md` upfront; add it when real trade-offs are discussed
6. **Let code talk** — Implementation details live in the code, not the design doc

## Reference

See existing Design Docs in `internal/design/` for examples.

## Related Skills

- `api` skill — API design principles
