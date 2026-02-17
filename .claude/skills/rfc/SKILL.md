---
name: rfc
description: >-
  Write RFCs for Video.js 10. Use for proposals that need buy-in — public API changes,
  product direction, user-facing DX, core architecture. Triggers: "write RFC", "create RFC",
  "propose", "need buy-in", "architecture proposal".
---

# RFC

Write Request for Comments (RFC) documents for Video.js 10.

RFCs are for **proposals that need buy-in** from others before proceeding. For decisions you own, use a Design Doc instead (`design` skill, `internal/design/`).

## Reference Material

| Task               | Load                                |
| ------------------ | ----------------------------------- |
| Any RFC task       | This file (SKILL.md)                |
| Writing principles | `design` skill (Principles section) |

## When to Write an RFC

**Write an RFC when:**

- Changes public API surface
- Affects product direction
- Affects user-facing developer experience
- Significant changes to core architecture
- Needs buy-in from others

**Use a Design Doc instead when:**

- Architectural decisions in your area
- Internal implementation choices
- Design patterns or component specs you own

**Skip both for:**

- Bug fixes
- Small features in one package
- Implementation details
- Documentation updates

See `rfc/README.md` for status lifecycle, branch workflow, and relationship to implementation plans.

## Checklist

Before finalizing an RFC:

- [ ] Problem clearly stated — why is this worth solving now?
- [ ] Solution is high-level — details come in Design Docs after approval
- [ ] Alternatives considered with pros/cons
- [ ] Trade-offs are explicit
- [ ] Open questions listed
- [ ] Next steps clear (what happens if approved)
- [ ] Frontmatter has `status: draft`

## Process

1. **Identify need** — Does this actually need buy-in? If not, write a Design Doc
2. **Draft proposal** — Focus on problem and approach, not implementation details
3. **List alternatives** — Show you've considered other options
4. **Surface trade-offs** — Be honest about costs
5. **Gather feedback** — Share with affected parties
6. **Iterate** — Update based on feedback
7. **Get approval** — Move to `status: accepted` when agreed
8. **Document** — Write Design Doc with full details after approval

## Writing Principles

For detailed writing guidance (progressive disclosure, conciseness, etc.), see the `design` skill's Principles section. The same principles apply to RFCs.

## Related

| Need                       | Use               |
| -------------------------- | ----------------- |
| Decisions you own          | `design` skill    |
| API design principles      | `api` skill       |
| Building UI components     | `component` skill |
| Writing documentation      | `docs` skill |
