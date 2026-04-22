---
name: create-issue
description: >-
  Create GitHub issues with consistent title casing, type prefixes, and body
  structure for the videojs/v10 repo. Use when filing bugs, requesting features,
  or creating any ticket/issue. Triggers: "create issue", "new issue",
  "file issue", "open issue", "file bug", "request feature", "create ticket",
  "new ticket", "file ticket", "open ticket".
allowed-tools: Bash(gh:*), Read, Glob, Grep, WebFetch, question
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

Use Title Case. The triage bot will add the appropriate type prefix (`Bug:`, `Feature:`, etc.) automatically.

### Labels

Do not add labels when creating issues. The triage bot handles labeling automatically.

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

### Reference Libraries

When creating **Feature**, **Architecture**, or **Design** issues, research how reference libraries handle similar functionality. Include relevant links in the body.

**UI libraries (component patterns, API design):**

| Library  | Docs                          | Source                                              |
| -------- | ----------------------------- | --------------------------------------------------- |
| Base UI  | https://base-ui.com           | https://github.com/mui/base-ui                      |
| Radix    | https://www.radix-ui.com      | https://github.com/radix-ui/primitives              |

**Player libraries (media-specific patterns, prior art):**

| Library      | Source                                    |
| ------------ | ----------------------------------------- |
| video.js v8  | https://github.com/videojs/video.js       |
| media chrome | https://github.com/muxinc/media-chrome    |
| plyr         | https://github.com/sampotts/plyr          |
| vidstack     | https://github.com/vidstack/player        |

**Rules:**
- Search docs and source for the feature/pattern being proposed.
- Only include references that are genuinely relevant -- don't pad with tangential links.
- Prefer linking to specific components, APIs, or source files over top-level repos.
- UI libraries for component/API patterns; player libraries for media-specific prior art.

## Your Tasks

### Step 1: Gather Information

If $ARGUMENTS provides enough detail, extract:
1. **Title** -- Short, descriptive, Title Case
2. **Description** -- The what and why

If details are missing, use the `question` tool to ask the user.

### Step 2: Format Title

Construct the title in Title Case (no type prefix — the triage bot adds that).

**Title Case rules:**
- Capitalize the first and last word
- Capitalize all major words (nouns, verbs, adjectives, adverbs)
- Lowercase articles (a, an, the), conjunctions (and, but, or), and short prepositions (in, on, at, to, for, of, with) unless they are the first or last word

### Step 3: Research Prior Art

**For Feature, Architecture, and Design issues only.** Skip this step for Bug, Docs, and Chore issues.

1. Search the reference UI libraries (Base UI, Radix) for similar components or patterns -- check their docs sites and GitHub source.
2. Search the reference player libraries (video.js v8, media chrome, plyr, vidstack) for how they handle similar media-specific functionality.
3. Collect specific, relevant links (component pages, source files, API docs).

### Step 4: Compose Body

Write the body following the body conventions. Default to a single description paragraph. Only add Context or Tasks sections if they genuinely improve communication.

For Feature/Architecture/Design issues, weave prior art references into the body naturally -- either inline or in a Context section if there are several.

### Step 5: Confirm with User

Before creating, show the user:
- Full title
- Body preview

Ask for confirmation using the `question` tool.

### Step 6: Create Issue

```bash
gh issue create --repo videojs/v10 \
  --title "Title Case Description" \
  --body "body content"
```

Use a HEREDOC for the body to preserve formatting:

```bash
gh issue create --repo videojs/v10 \
  --title "Add OAuth Support" \
  --body "$(cat <<'EOF'
Description text here.

## Context

- [Base UI Dialog](https://base-ui.com/react/components/dialog) -- compound component pattern
- [vidstack player](https://github.com/vidstack/player/blob/main/...) -- media-specific approach
EOF
)"
```

### Step 7: Report

Output the created issue URL.
