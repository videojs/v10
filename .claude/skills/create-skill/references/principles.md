# Skill Principles

Core principles for writing effective skills.

## Concise is Key

The context window is a shared resource. Skills compete with system prompts, conversation history, and user requests.

**Guidelines:**

- Claude is already smart — only add knowledge Claude doesn't have
- Challenge each paragraph: "Does this justify its token cost?"
- Prefer concise examples over verbose explanations
- If Claude can figure it out, don't explain it

**Example:**

```markdown
// ❌ Verbose
In order to create a new component, you'll need to first understand
the component architecture patterns. Components in this codebase follow
the compound component pattern, which means...

// ✅ Concise
Components use compound pattern. See `component` skill for details.
```

## Degrees of Freedom

Match specificity to task fragility:

| Freedom    | When to Use                                    | Format                                |
| ---------- | ---------------------------------------------- | ------------------------------------- |
| **High**   | Multiple valid approaches, context-dependent   | Text instructions                     |
| **Medium** | Preferred pattern exists, some variation OK    | Pseudocode, templates with parameters |
| **Low**    | Fragile operations, consistency critical       | Specific steps, exact commands        |

**Metaphor:** A narrow bridge needs guardrails (low freedom). An open field allows many routes (high freedom).

**Examples:**

```markdown
// High freedom — many valid approaches
Write documentation following the tone and style guidelines.

// Medium freedom — preferred pattern
Use this template structure:
## Overview
## Usage
## API Reference

// Low freedom — exact sequence required
1. Run `git add -A`
2. Run `git commit -m "type(scope): message"`
3. Run `git push -u origin HEAD`
```

## Progressive Disclosure

Skills use a three-level loading system:

| Level | What                             | When Loaded          | Target Size  |
| ----- | -------------------------------- | -------------------- | ------------ |
| 1     | Metadata (name + description)    | Always               | ~100 words   |
| 2     | SKILL.md body                    | When skill triggers  | <500 lines   |
| 3     | references/ files                | On demand            | Unlimited    |

**Key insight:** Description is the ONLY thing Claude sees before deciding to load a skill. All "when to use" info MUST be in the description, not the body.

## Progressive Disclosure Patterns

### Pattern 1: High-Level Guide with References

Keep SKILL.md focused, link to details:

```markdown
## Quick Reference

Create components using compound pattern with data attributes for styling.

## Detailed Guides

- **Props conventions**: See [props.md](references/props.md)
- **Styling patterns**: See [styling.md](references/styling.md)
- **Accessibility**: See [aria.md](references/aria.md)
```

### Pattern 2: Domain-Specific Organization

Organize by domain to avoid loading irrelevant content:

```
skill/
├── SKILL.md (overview + navigation)
└── references/
    ├── react.md      # React-specific patterns
    ├── lit.md        # Lit-specific patterns
    └── vanilla.md    # Vanilla JS patterns
```

When user asks about React, Claude only loads `react.md`.

### Pattern 3: Conditional Details

Show basics, link to advanced:

```markdown
## Creating Components

Use compound pattern with Root, Trigger, and Content parts.

**For animations**: See [animation.md](references/animation.md)
**For collections**: See [collection.md](references/collection.md)
```

## Information Placement

Information lives in ONE place:

| Content Type                         | Location     |
| ------------------------------------ | ------------ |
| Quick reference, process overview    | SKILL.md     |
| Detailed patterns, examples, schemas | references/  |
| Output formats, boilerplate          | templates/   |
| Review checklists, agent prompts     | review/      |

**Anti-pattern:** Duplicating information between SKILL.md and references. This wastes tokens and creates maintenance burden.

## Reference File Guidelines

- Keep references one level deep from SKILL.md
- Files >100 lines should have a table of contents
- Structure by domain or variant, not by "type of content"
- Include code examples — they're often more concise than prose
