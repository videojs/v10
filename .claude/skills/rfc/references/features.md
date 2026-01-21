# Feature RFC Guidance

General guidance for writing feature RFCs.

## When to Use

- New public APIs
- Architectural changes affecting multiple packages
- Cross-cutting patterns
- Extensibility mechanisms

## Choose a Template

| Template                      | Use For                                     |
| ----------------------------- | ------------------------------------------- |
| `templates/feature-single.md` | Straightforward proposals with one concept  |
| `templates/feature-multi.md`  | Complex proposals with 3+ distinct concepts |

## Tips

1. **Start with index.md** — Problem and quick start first
2. **Add files as needed** — Don't create empty architecture.md
3. **Link between files** — "See [decisions.md](decisions.md) for rationale"
4. **Keep examples minimal** — Just enough to show the concept
5. **Tables for structured info** — Parameters, returns, options

## Reference

See `rfc/player-api/` for a complete multi-file example.

## Related Skills

- `api` skill — API design principles
