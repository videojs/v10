---
allowed-tools: Bash(git:*), Bash(gh:*), Glob, Grep, Read, mcp__github__*, skill
description: Analyze a GitHub issue and create a comprehensive plan to solve it
---

# GitHub Issue Analysis

Deep-dive on a GitHub issue. Find the problem and generate a plan.
Do not write code. Explain the problem clearly and propose a comprehensive plan to solve it.

## Usage

```
/gh-issue <issue>
```

- `issue` (required): GitHub issue number (assumes videojs/v10 repo) or full GitHub issue URL

### Examples

```
/gh-issue 123
/gh-issue https://github.com/videojs/v10/issues/123
```

## Issue

$ARGUMENTS

Fetch the issue details using GitHub tools. The argument above can be an issue number (assumes videojs/v10 repo) or a full GitHub issue URL.

## Your Tasks

You are an experienced software developer tasked with diagnosing issues.

### Step 1: Fetch and Analyze Issue Type

1. Fetch the issue details using GitHub tools
2. Identify the issue type by examining:

**Labels** — Look for:

- `api`, `rfc`, `breaking-change` → API/Architecture
- `docs`, `documentation` → Documentation
- `dx`, `types`, `typescript` → Developer Experience
- `a11y`, `accessibility` → Accessibility
- `ui`, `component` → UI Components
- `bug`, `fix` → Bug fix
- `enhancement`, `feature` → New feature

**Title and Body Keywords**:
| Keywords | Type |
|----------|------|
| "API", "design", "RFC", "architecture", "breaking" | API/Architecture |
| "ergonomics", "types", "inference", "DX", "developer experience" | DX |
| "documentation", "docs", "README", "guide", "handbook" | Documentation |
| "accessibility", "keyboard", "screen reader", "ARIA", "focus" | Accessibility |
| "component", "compound", "render prop", "polymorphism" | UI Components |

**Affected Packages** (from file paths or mentions):

- `packages/core/`, `packages/store/` → Core architecture
- `packages/html/`, `packages/react/` → UI/Components
- `site/` → Documentation

### Step 2: Load Appropriate Skill

Based on detected type, load the relevant skill for domain expertise:

| Detected Type                   | Load Skill   | Why                                                           |
| ------------------------------- | ------------ | ------------------------------------------------------------- |
| API proposal, RFC, architecture | `api-design` | Extensibility, progressive disclosure, type safety principles |
| DX, ergonomics, types           | `dx`         | DX principles, TypeScript patterns, state/adapter patterns    |
| Documentation                   | `docs`       | Tone, structure, code examples, doc types                     |
| Accessibility                   | `aria`       | Keyboard, focus, ARIA patterns                                |
| UI component implementation     | `component`  | Compound components, polymorphism, styling patterns           |
| Bug/Feature (general)           | `dx`         | General principles apply                                      |

**Load the skill using the skill tool before proceeding to analysis.**

**Notes:**

- For domain-specific bugs (e.g., accessibility bug), load the relevant domain skill (`aria`) instead of `dx`
- When issues span multiple domains (e.g., "add accessible slider component"), load multiple skills: primary domain first, then supporting skills

### Step 3: Examine the Codebase

1. Examine the relevant parts of the codebase
2. Analyze the code thoroughly until you have a solid understanding of how it works
3. Apply the loaded skill's principles when evaluating the current implementation

### Step 4: Explain the Issue

Explain the issue in detail, including:

- The problem and its root cause
- How it relates to the loaded skill's principles (if applicable)
- Current behavior vs expected behavior

### Step 5: Create a Comprehensive Plan

Create a plan to solve the issue that includes:

**Core Changes:**

- Required code changes
- Potential impacts on other parts of the system

**Quality Assurance:**

- Necessary tests to be written or updated
- Documentation updates

**Risk Assessment:**

- Performance considerations
- Security implications
- Backwards compatibility (if applicable)

**Skill-Specific Considerations:**

For **API/Architecture** issues (with `api-design` skill):

- Does the solution follow emergent extensibility?
- Is progressive disclosure maintained?
- Are types inferred without annotation?
- Does it avoid anti-patterns (overloads, shotgun parsing)?

For **DX** issues (with `dx` skill):

- Does it minimize time-to-first-success?
- Does it reduce cognitive load?
- Are mental models clear and predictable?
- Does it maximize editor/TypeScript ergonomics?

For **Documentation** issues (with `docs` skill):

- Does it follow the appropriate doc type template?
- Is the tone direct and confident?
- Are code examples complete and runnable?
- Are cross-links included?

For **Accessibility** issues (with `aria` skill):

- Does it follow WAI-ARIA patterns?
- Is keyboard navigation supported?
- Is focus management correct?
- Are ARIA attributes properly used?

For **UI Component** issues (with `component` skill):

- Does it use compound component pattern?
- Is polymorphism via `render` prop or `asChild`?
- Are both controlled and uncontrolled modes supported?
- Are data attributes used for styling?

### Step 6: References

Include:

- Link to the source issue
- Related discussions or issues
- Relevant skill principles applied

**ONLY CREATE A PLAN. DO NOT WRITE ANY CODE.** Your task is to create a thorough, comprehensive strategy for understanding and resolving the issue.
