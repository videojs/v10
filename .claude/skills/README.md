# Skills

Specialized knowledge for AI agents working on Video.js 10.

## Quick Reference

| Workflow                  | Load                                      |
| ------------------------- | ----------------------------------------- |
| Building store/slices     | `api-design`                              |
| Building Lit components   | `component` + `aria`                      |
| Building React components | `component` + `aria` (load react.md refs) |
| Writing documentation     | `docs`                                    |
| Reviewing architecture    | `api-design` → `review/workflow.md`       |
| Reviewing DX/ergonomics   | `dx` → `review/workflow.md`               |
| Reviewing documentation   | `docs` → `review/workflow.md`             |
| Accessibility audit       | `aria`                                    |

## Skills

| Skill                             | Purpose                                                                  | Has Review? |
| --------------------------------- | ------------------------------------------------------------------------ | ----------- |
| [api-design](api-design/SKILL.md) | Design library APIs — extensibility, type safety, progressive disclosure | Yes         |
| [dx](dx/SKILL.md)                 | Evaluate library DX — inference ergonomics, defaults, naming             | Yes         |
| [docs](docs/SKILL.md)             | Write Video.js 10 documentation                                          | Yes         |
| [component](component/SKILL.md)   | Build headless UI components — compound patterns, state, styling         | No          |
| [aria](aria/SKILL.md)             | Accessibility patterns — ARIA, keyboard, focus, media player a11y        | No          |

## Review Workflows

Each skill with review capability has a `review/` subfolder:

```
skill/
├── SKILL.md
├── references/        # or principles/
└── review/
    ├── workflow.md    # Review process and checklists
    ├── agents.md      # Sub-agent prompts
    └── templates.md   # Output formats
```

| Skill                | Review Focus                                                |
| -------------------- | ----------------------------------------------------------- |
| `api-design/review/` | Internal architecture — middleware, builders, type flow     |
| `dx/review/`         | External API surface — ergonomics, inference, composability |
| `docs/review/`       | Documentation quality — tone, structure, examples           |

## Skill Structure

```
skill-name/
├── SKILL.md              # Entry point with overview and reference table
├── references/           # Detailed reference files (load on demand)
│   └── *.md
└── review/               # (optional) Review workflow
    ├── workflow.md
    └── *.md
```

## Extending Skills

**Add a reference file:**

1. Create file in `references/` (or `principles/`)
2. Add entry to reference table in SKILL.md
3. Add cross-links to related files

**Add review capability:**

1. Create `review/` subfolder
2. Add `workflow.md` with process and checklists
3. Add agent prompts and templates
4. Add Review section to SKILL.md

**Add a new skill:**

1. Create directory with SKILL.md
2. Add frontmatter with `name` and `description`
3. Add to this README

## Keeping Skills Current

When code changes introduce new patterns that a skill should cover:

1. Identify affected skill (component, aria, api-design, dx, docs)
2. Update the relevant reference file or add a new one
3. If pattern is cross-cutting, update CLAUDE.md Code Rules instead

**Triggers for skill updates:**

- New component patterns (compound components, state management)
- New accessibility patterns (ARIA, keyboard, focus)
- New API design decisions (extensibility, type safety)
- New DX considerations (inference, defaults, naming)
