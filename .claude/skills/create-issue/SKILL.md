---
name: create-issue
description: >-
  Create GitHub issues with consistent title casing, type prefixes, labels,
  and body structure for the videojs/v10 repo. Use when filing bugs, requesting
  features, or creating any ticket/issue. Triggers: "create issue", "new issue",
  "file issue", "open issue", "file bug", "request feature", "create ticket",
  "new ticket", "file ticket", "open ticket".
allowed-tools: Bash(gh:*), Read, Glob, Grep, question
context: fork
---

# Create Issue

Create GitHub issues with consistent formatting for the videojs/v10 repo.

## Usage

```
/create-issue [description]
```

- `description` (optional): Brief description of the issue to create. If omitted, will prompt interactively.

## Arguments

$ARGUMENTS

## Conventions

### Title Format

**`Type: Title Case Description`**

Use Title Case for the description portion. The type prefix is followed by a colon and space.

| Prefix           | When to Use                                           | Example                                          |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------ |
| `Feature:`       | New capability or behavior                            | Feature: Add OAuth Support                       |
| `Bug:`           | Something broken or not working as expected           | Bug: Playback Stalls on iOS Safari               |
| `Docs:`          | Documentation additions or improvements               | Docs: Add Getting Started Guide                  |
| `Architecture:`  | Internal structure, design patterns, core refactoring | Architecture: Redesign State Management Layer    |
| `Chore:`         | Maintenance, deps, tooling, CI                        | Chore: Upgrade Vitest to v3                      |
| `Design:`        | Design docs, component specs, visual design           | Design: Component Spec for Slider                |

**Not** conventional commit prefixes (`feat:`, `fix:`, `docs:`) — those are for commits only.

### Labels

Use labels instead of GitHub issue types (Bug/Task/Enhancement). **Always use existing repo labels -- never create new ones.** Run `gh label list --repo videojs/v10` if unsure what exists. Prefer no label over inventing one.

**Domain:** `api`, `a11y`, `components`, `docs`, `dx`, `i18n`, `media`, `skin`, `store`, `types`

**Package:** `pkg:core`, `pkg:html`, `pkg:react`, `pkg:utils`, `pkg:store`, `pkg:dom`, `pkg:icons`

**Area:** `build`, `cli`, `compiler`, `errors`, `examples`, `perf`, `site`, `test`, `workspace`

**Other:** `feature`, `planning`, `needs discussion`, `good first issue`, `epic`

**Rules:**
- Apply 1-3 labels -- don't over-label
- Check labels on related/cross-referenced issues for consistency
- If no existing label fits, leave it unlabeled for human triage

### Body

**Goal:** A reader should understand what the issue tracks or solves in 30 seconds.

**Default to a single section** -- most issues need only a Description. Every additional section must earn its place by adding communication value the description alone can't provide.

**Tailor content to issue type:**

- **Bug** -- Describe the broken behavior and expected behavior. Include reproduction steps only if non-obvious.
- **Feature** -- What the capability is and why it's needed.
- **Architecture / Design** -- What API surface or internal pattern is affected and the problem with the current approach.
- **Docs / Chore** -- What needs to change and why.

**Structure:**

```markdown
[1-3 paragraphs: what this issue tracks and why it matters]
```

If -- and only if -- the issue benefits from it, add additional sections:

```markdown
## Context

[Links to Slack threads, related issues, prior art -- only when background isn't obvious]

## Tasks

- [ ] Task 1
- [ ] Task 2
```

**Rules:**
- Be concise. Cut filler. Every sentence should carry information.
- Don't repeat the title in the body.
- Omit sections that add no value -- no empty headers, no placeholder text.
- Task lists only when scope is well-defined and breakdown aids tracking.

## Your Tasks

### Step 1: Gather Information

If $ARGUMENTS provides enough detail, extract:
1. **Type** — Which prefix applies (Feature, Bug, Docs, Architecture, Chore, Design)
2. **Title** — Short, descriptive, Title Case
3. **Description** — The what and why
4. **Labels** — 1-3 relevant labels

If details are missing, use the `question` tool to ask the user.

### Step 2: Format Title

Construct the title as `Type: Title Case Description`.

**Title Case rules:**
- Capitalize the first and last word
- Capitalize all major words (nouns, verbs, adjectives, adverbs)
- Lowercase articles (a, an, the), conjunctions (and, but, or), and short prepositions (in, on, at, to, for, of, with) unless they are the first or last word

### Step 3: Compose Body

Write the body following the body conventions. Default to a single description paragraph. Only add Context or Tasks sections if they genuinely improve communication.

### Step 4: Confirm with User

Before creating, show the user:
- Full title
- Labels
- Body preview

Ask for confirmation using the `question` tool.

### Step 5: Create Issue

```bash
gh issue create --repo videojs/v10 \
  --title "Type: Title Case Description" \
  --label "label1,label2" \
  --body "body content"
```

Use a HEREDOC for the body to preserve formatting:

```bash
gh issue create --repo videojs/v10 \
  --title "Feature: Add OAuth Support" \
  --label "feature,api" \
  --body "$(cat <<'EOF'
## Description

...
EOF
)"
```

### Step 6: Report

Output the created issue URL.
