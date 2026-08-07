# Capability Guide Template

Use for one page per player capability (Autoplay, Text Tracks, Video Quality). The rules — when a capability gets its own page, the section list, and the frontmatter fields — live in `site/src/content/docs/how-to/write-guides.mdx`; read it first. Follow an existing capability guide (e.g., `how-to/autoplay.mdx`) for current MDX and demo patterns.

## Page structure

```mdx
---
title: 'Capability name'
description: 'One-sentence summary for search and metadata'
category: 'capability'
components: ['RelatedComponent']
api: ['relatedFeature']
keywords: ['search phrase', 'another phrase']
---

{/* Demo, DocsLink, FrameworkCase, StyleCase imports and ?raw demo files */}

One- or two-sentence summary. No heading.

<CustomUiNote />


## Recommended approach

The one recommended implementation, stated directly. Smallest complete example
first, as a <Demo> backed by real demo files per framework/style.

## How it works

Only the background needed to understand or modify the code above, using exact
exported names. Link deeper explanation to concept pages.

## Availability and constraints

Browser restrictions, platform differences, permission or user-interaction
requirements, expected failure modes. Stated plainly.

## Common variations

### Variation name

Alternatives, each in its own subsection, kept separate from the recommended
approach.

## Troubleshooting

### Symptom as the reader sees it

Likely cause, then the fix.

## Related components

- <DocsLink slug="reference/..." />

## Related API

- <DocsLink slug="reference/..." />

## Related guides

- <DocsLink slug="how-to/..." />
```

## Checklist

- [ ] Goal-oriented title in the reader's words — completes "How to…" without the literal prefix; one capability per page
- [ ] Sections present keep the template names and order (skip ones that don't apply)
- [ ] Primary example is real demo files imported into MDX, not inline fences
- [ ] Exact export, prop, event, and attribute names throughout
- [ ] `category`, `components`, `api`, and `keywords` frontmatter set
- [ ] `<CustomUiNote />` after the summary
- [ ] Sidebar entry added in `src/docs.config.ts`
