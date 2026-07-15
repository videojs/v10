---
name: write-docs
description: Write Video.js guides, concepts, READMEs, and JSDoc. Use for site prose, examples, inline API documentation, or package documentation.
---

# Documentation

Treat implementation, types, tests, and content schemas as factual sources. Read `site/src/content/docs/how-to/write-guides.mdx` before authoring a site guide.

## Choose the artifact

- Task-oriented outcome: how-to guide
- Mental model or rationale: concept page
- Package install and entry points: package README
- Non-obvious public contract at the symbol: JSDoc
- Generated component/utility surface: update the builder-owned reference source rather than duplicating it in prose

## Workflow

1. Identify the audience, question, and owning source files.
2. Read neighboring docs for current voice and MDX patterns.
3. Load only what applies:
   - Voice and structure: `references/writing-style.md`
   - SEO-sensitive site content: `references/seo.md`
   - State/tooling concepts: `references/state-tooling.md`
   - Component-library comparisons: `references/component-libraries.md`
   - Code or error examples: the matching file in `patterns/`
   - New artifact scaffold: the matching file in `templates/`
4. Lead with the user outcome or concept. Use complete, verified examples and explain only non-obvious parts.
5. Add the sidebar entry and framework/style restrictions for new site pages.
6. Run examples or relevant tests where practical and render affected MDX for every supported variant.

Do not duplicate signatures TypeScript already expresses. API-builder exports are the exception when its tests require structured JSDoc fields.

## Example

Input: “Write a guide for configuring captions.”

Output: A task-oriented page with verified examples, the correct sidebar metadata, and rendered MDX validation.
