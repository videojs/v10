# Skills

Specialized knowledge for AI agents working on Video.js 10.

## Quick Reference

| Workflow                   | Load                               |
| -------------------------- | ---------------------------------- |
| Building store/features    | `api`                              |
| Building HTML components   | `component` + `aria`               |
| Building React components  | `component` + `aria`               |
| Writing documentation      | `docs`                             |
| Writing Design Docs / RFCs | `design` or `rfc`                  |
| Reviewing API/architecture | `api` → `review/workflow.md`       |
| Reviewing documentation    | `docs` → `review/workflow.md`      |
| Reviewing components       | `component` → `review/workflow.md` |
| Reviewing accessibility    | `aria` → `review/workflow.md`      |
| Accessibility audit        | `aria`                             |
| Committing / creating PRs  | `git` or `/commit-pr`              |
| Reviewing branch changes   | `/review-branch`                   |
| Analyzing GitHub issues    | `/gh-issue`                        |
| Updating AI docs           | `/claude-update`                   |
| Creating new skills        | `/create-skill`                    |

## Skills

| Skill                                   | Purpose                                                                | Has Review? |
| --------------------------------------- | ---------------------------------------------------------------------- | ----------- |
| [api](api/SKILL.md)                     | API design and DX — extensibility, type safety, progressive disclosure | Yes         |
| [aria](aria/SKILL.md)                   | Accessibility patterns — ARIA, keyboard, focus, media player a11y      | Yes         |
| [claude-update](claude-update/SKILL.md) | Update CLAUDE.md and skills when introducing new patterns              | No          |
| [commit-pr](commit-pr/SKILL.md)         | Commit changes and create/update PRs with conventions                  | No          |
| [component](component/SKILL.md)         | Build headless UI components — compound patterns, state, styling       | Yes         |
| [create-skill](create-skill/SKILL.md)   | Create new skills with proper structure and conventions                | No          |
| [design](design/SKILL.md)               | Write Design Docs — decisions you own, component specs, feature designs| No          |
| [docs](docs/SKILL.md)                   | Write Video.js 10 documentation                                        | Yes         |
| [gh-issue](gh-issue/SKILL.md)           | Analyze GitHub issues and create implementation plans                  | No          |
| [git](git/SKILL.md)                     | Git workflow — commit messages, PRs, branch naming, scope inference    | No          |
| [review-branch](review-branch/SKILL.md) | Review branch changes and suggest improvements                         | No          |
| [rfc](rfc/SKILL.md)                     | Write RFCs — proposals needing buy-in (public API, product, DX)        | No          |

## Review Workflows

Skills with review capability have a `review/` subfolder:

```
skill/
├── SKILL.md
├── references/
└── review/
    ├── workflow.md    # Review process and checklists
    ├── agents.md      # Sub-agent prompts
    └── templates.md   # Output formats
```

| Skill               | Review Focus                                      |
| ------------------- | ------------------------------------------------- |
| `api/review/`       | API design, architecture, DX, type safety         |
| `docs/review/`      | Documentation quality — tone, structure, examples |
| `component/review/` | Component architecture, state, props, styling     |
| `aria/review/`      | Accessibility — ARIA, keyboard, focus, WCAG       |

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

1. Create file in `references/`
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

1. Identify affected skill (component, aria, api, docs)
2. Update the relevant reference file or add a new one
3. If pattern is cross-cutting, update CLAUDE.md Code Rules instead

**Triggers for skill updates:**

- New component patterns (compound components, state management)
- New accessibility patterns (ARIA, keyboard, focus)
- New API design decisions (extensibility, type safety)
- New DX considerations (inference, defaults, naming)

For detailed guidance and consistency checklists, run `/claude-update`.
