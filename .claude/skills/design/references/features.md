# Feature Design Guidance

General guidance for writing feature Design Docs.

## When to Use

- New internal APIs
- Architectural decisions in your area
- Design patterns you're introducing
- Extensibility mechanisms

## Templates

| Template                      | Use For                                     |
| ----------------------------- | ------------------------------------------- |
| `templates/feature-single.md` | Straightforward designs with one concept    |
| `templates/feature-multi.md`  | Complex designs with 3+ distinct concepts   |

## Structure

**Single-file:** Problem → Solution → Quick Start → API → Behavior → Trade-offs → Open Questions

**Multi-file:**

- `index.md` — Problem, quick start, surface API
- `architecture.md` — Internal structure, data flow
- `decisions.md` — Design decisions with alternatives
- `examples.md` — Extended usage examples

## Tips

1. **Start with index.md** — Problem and quick start first
2. **Add files as needed** — Don't create empty architecture.md
3. **Link between files** — "See [decisions.md](decisions.md) for rationale"
4. **Keep examples minimal** — Just enough to show the concept
5. **Tables for structured info** — Parameters, returns, options

## Reference

See existing Design Docs in `internal/design/` for examples.

## Related Skills

- `api` skill — API design principles
