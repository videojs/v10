# How-to Guide Template

Use for pages under `site/src/content/docs/how-to/` — one page per reader goal ("Autoplay", "Show captions and subtitles", "Remember user preferences"). The rules — when a topic gets its own page, the section list, and the frontmatter fields — live in `site/src/content/docs/how-to/write-guides.mdx`; read it first. Follow an existing guide (e.g., `how-to/autoplay.mdx`) for current MDX and demo patterns.

## Page structure

Use this structure when it helps a reader scan the task. Established, high-value guides may keep a clearer topic-specific structure; do not rename headings mechanically when that makes the page harder to use.

```mdx
---
title: 'Goal-oriented title'
description: 'One-sentence summary for search and metadata'
---

{/* Demo, DocsLink, FrameworkCase, StyleCase imports and ?raw demo files */}

One- or two-sentence summary. No heading.

<CustomUiNote />
{/* Only when the guide assumes the reader is building custom UI with the
    Video.js UI library. Skip it when the outcome works without ejecting. */}


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

- [ ] Goal-oriented title in the reader's words — completes "How to…" without the literal prefix; one goal per page
- [ ] Sections present usually keep the template names and order; any exception makes the task easier to follow
- [ ] Primary example is real demo files imported into MDX, not inline fences
- [ ] Exact export, prop, event, and attribute names throughout
- [ ] `<CustomUiNote />` after the summary when the guide assumes custom UI; omitted otherwise
- [ ] Sidebar entry added in `src/docs.config.ts`
