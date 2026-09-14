# Concept Page Template

Use for explanation pages under `site/src/content/docs/guides/`: one reusable mental model per page, scannable while building. They share the folder with how-to guides; the shape is what differs. The rules for choosing a concept over a how-to live in `site/src/content/docs/writing-style/write-guides.mdx`; the boundaries and sentence forms live in `../references/diataxis.md`. Follow an existing concept (e.g., `guides/skins.mdx`) for current MDX patterns.

## Frontmatter

```yaml
---
title: 'Concept name'
description: 'What the page explains, as a noun phrase'
---
```

Optional fields: `ogTitle` (shorter title for the social image) and `frameworkTitle` (per-framework title override). There is no `type` field; the folder is the type.

## Page structure

```mdx
---
title: 'Concept name'
description: 'What the page explains'
---

import DocsLink from '@/components/docs/DocsLink.astro';
import FrameworkCase from '@/components/docs/FrameworkCase.astro';

One or two sentences that define the concept and say why it exists. A short
snippet may follow when it shows the shape being explained, not a task.

## What it is made of

Noun-phrase headings that name the thing explained ("Feature bundles",
"Packaged and ejected skins"), never the task ("Create a bundle").

## How the pieces relate

Trade-offs, alternatives, and rationale belong here. Compare with the native
element or with other approaches when it helps the reader decide.

<FrameworkCase frameworks={["react"]}>

Framework-specific shape, when the model differs.

</FrameworkCase>

## Related guides

- <DocsLink slug="guides/..." />

## Related API

- <DocsLink slug="reference/..." />
```

## Checklist

- [ ] One concept per page, explained rather than taught
- [ ] Headings are noun phrases; no step-by-step instructions, numbered procedures, or install commands
- [ ] No `<CustomUiNote />` and none of the how-to sections (Recommended approach, How it works, Common variations, Troubleshooting)
- [ ] Tasks link to the guide that performs them; exact surfaces link to reference
- [ ] Framework-specific content uses `<FrameworkCase>`
- [ ] Sidebar entry added in `src/docs.config.ts`; `pnpm -F site test diataxis` passes
