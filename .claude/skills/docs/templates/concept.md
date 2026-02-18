# Concept Page Template

Use for bite-sized explanation pages. One concept per page, quickly scannable.

## Frontmatter

```yaml
---
title: 'Your concept title'
description: 'One-sentence summary for search and metadata'
---
```

Optional — override the title per framework:

```yaml
---
title: 'State management'
description: 'How Video.js manages player state'
frameworkTitle:
  html: 'State management in HTML'
  react: 'State management in React'
---
```

## Page structure

```mdx
---
title: 'Concept name'
description: 'Brief description'
---

import FrameworkCase from '@/components/docs/FrameworkCase.astro';
import Aside from '@/components/Aside.astro';
import DocsLink from '@/components/docs/DocsLink.astro';

One-sentence description of the concept. Show code immediately:

{/* Minimal example — under 5 lines */}

## How it works

2-3 short paragraphs. Keep it brief — readers reference this while building,
not when learning from scratch.

<FrameworkCase frameworks={["react"]}>

React-specific explanation or code example.

</FrameworkCase>

<FrameworkCase frameworks={["html"]}>

HTML-specific explanation or code example.

</FrameworkCase>

## Common patterns

### Pattern name

When to use this pattern.

{/* Code example */}

<Aside type="tip">
Helpful optimization or best practice.
</Aside>

## Common pitfalls

{/* ❌ Don't — explain why */}
{/* ✅ Do — explain the fix */}

## See also

- <DocsLink slug="concepts/related-concept">Related concept</DocsLink>
- <DocsLink slug="reference/related-component">Component reference</DocsLink>
```

## Checklist

- [ ] Single concept per page
- [ ] Code example in first 5 lines after description
- [ ] Brief explanation (2-3 paragraphs max)
- [ ] Framework-specific content uses `<FrameworkCase>`
- [ ] Common pitfalls as do/don't
- [ ] See also with 2-4 links
- [ ] Scannable in under 2 minutes
