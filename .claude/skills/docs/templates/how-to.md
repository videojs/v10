# How-to Guide Template

Use for step-by-step guides that achieve a specific outcome.

> **Use sparingly.** Most documentation should be concept pages. Only use how-to guides
> when the reader needs multi-step instructions to build something specific.

## Frontmatter

```yaml
---
title: 'Achieve specific outcome'
description: 'Step-by-step guide to accomplish X'
---
```

## Page structure

```mdx
---
title: 'Build a custom player'
description: 'Step-by-step guide to building a player from scratch'
---

import FrameworkCase from '@/components/docs/FrameworkCase.astro';
import Aside from '@/components/Aside.astro';
import DocsLink from '@/components/docs/DocsLink.astro';

Brief description of what you'll build. One sentence.

### Prerequisites

- Familiarity with <DocsLink slug="concepts/prerequisite">prerequisite concept</DocsLink>
- Node.js 18+

## Step 1: Set up

Brief intro — what we're doing and why.

{/* Code for this step */}

<Aside type="note">
Supplementary context that isn't critical to the step.
</Aside>

## Step 2: Next action

What we're doing and why.

<FrameworkCase frameworks={["react"]}>

{/* React-specific code */}

</FrameworkCase>

<FrameworkCase frameworks={["html"]}>

{/* HTML-specific code */}

</FrameworkCase>

## Step 3: Final step

Last piece of the puzzle.

{/* Code */}

## Complete example

Everything together in one runnable block:

{/* Full working example with all imports */}

## What's next?

- <DocsLink slug="concepts/next-concept">Deeper concept</DocsLink>
- <DocsLink slug="how-to/next-guide">Follow-up guide</DocsLink>
- <DocsLink slug="reference/related-component">Component reference</DocsLink>
```

## Step structure

Each step should have:

1. **Heading** — clear action (`## Step N: Action`)
2. **Intro** — why we're doing this (1-2 sentences)
3. **Code** — the code to write
4. **Explanation** — what the code does (only if not obvious)

## Checklist

- [ ] Clear title stating what you'll build or achieve
- [ ] Prerequisites listed
- [ ] Numbered steps with clear actions
- [ ] Code example at each step
- [ ] Framework-specific content uses `<FrameworkCase>`
- [ ] Complete working example at end
- [ ] "What's next?" section with links
