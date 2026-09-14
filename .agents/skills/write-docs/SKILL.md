---
name: write-docs
description: Write Video.js guides, concepts, READMEs, and JSDoc. Use for site prose, examples, inline API documentation, or package documentation.
---

# Documentation

Treat implementation, types, tests, and content schemas as factual sources. Read `site/src/content/docs/writing-style/write-guides.mdx` before authoring a site guide.

## Choose the artifact

Before drafting, write down the type, the reader's question, and the compass quadrant it serves (action or cognition, study or work). The content folder is the type: the site derives it from the path, shows it as the page eyebrow, and `pnpm -F site test diataxis` fails when the prose contradicts the folder.

- Achieve a specific outcome with the player (autoplay, captions, self-hosting): how-to guide. Keep only the explanation needed to complete or adapt that task.
- Reusable mental model or rationale that helps with several tasks: concept page. Do not create a concept page for background that belongs to one how-to.
- Package install and entry points: package README
- Non-obvious public contract at the symbol: JSDoc
- Exact component, feature, hook, utility, option, or state surface: reference page. Update the builder-owned source rather than duplicating exhaustive API detail in a guide.

## Workflow

1. Identify the audience, question, and owning source files.
2. Read neighboring docs for current voice and MDX patterns.
3. Load only what applies:
   - Voice and structure: `references/writing-style.md`
   - Content drifting between document types, or per-type tone and sentence forms: `references/diataxis.md`
   - SEO-sensitive site content: `references/seo.md`
   - State/tooling concepts: `references/state-tooling.md`
   - Component-library comparisons: `references/component-libraries.md`
   - Code or error examples: the matching file in `patterns/`
   - New artifact scaffold: the matching file in `templates/`
4. Lead with the user outcome or concept. Use complete, verified examples and explain only non-obvious parts.
5. Reread the draft against `references/diataxis.md`: every heading and sentence form matches the page type. Move passages that read like another type to that page and leave a link.
6. Add the sidebar entry and framework/style restrictions for new site pages. When a page moves folders, add `redirectFrom` with the old slug to its sidebar entry.
7. Run examples or relevant tests where practical, run `pnpm -F site test diataxis` for site pages, and render affected MDX for every supported variant.

Do not duplicate signatures TypeScript already expresses. API-builder exports are the exception when its tests require structured JSDoc fields.

## Example

Input: “Write a guide for configuring captions.”

Output: A task-oriented page with verified examples, the correct sidebar metadata, and rendered MDX validation.
