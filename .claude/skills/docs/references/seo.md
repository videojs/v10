# SEO Metadata Conventions

Conventions for page titles, meta descriptions, and structured data across the Video.js site.

## Target keywords

These are the search terms we optimize for. Work them into titles, descriptions, body content, and anchor text where they fit naturally.

| Priority | Keyword                       | Where it appears                                               |
| -------- | ----------------------------- | -------------------------------------------------------------- |
| High     | **open source video player**  | Every page title suffix, homepage                              |
| High     | **React video player**        | React docs title suffix, installation intro, meta descriptions |
| High     | **HTML video player**         | HTML docs title suffix, installation intro, meta descriptions  |
| Medium   | **video player**              | Site description, body content, anchor text                    |
| Medium   | **video player components**   | Installation page, component reference descriptions            |
| Medium   | **accessible video player**   | Component descriptions, installation intro                     |
| Medium   | **video player performance**  | Site description, architecture page, installation description  |
| Medium   | **lightweight video player**  | Site description, installation intro                           |
| Medium   | **fast video player**         | Architecture page, performance-related content                 |
| Low      | **streaming**                 | Site description, installation description                     |
| Low      | **customizable video player** | Component descriptions, skins pages                            |

**Framework-specific keywords** are the highest priority for docs pages because each framework gets its own URL (`/docs/framework/react/...` and `/docs/framework/html/...`), creating natural keyword-targeting opportunities.

**Performance keywords** are natural fits — v10 is built around minimal bundle sizes, CSS-driven animations, and smooth rendering. Use "performance", "lightweight", and "fast" in descriptions for architecture, installation, and component pages.

## Page titles

Pattern: `PAGE | Video.js | Open Source [Framework] Video Player`

| Context      | Format                                               | Example                                                          |
| ------------ | ---------------------------------------------------- | ---------------------------------------------------------------- |
| Docs (React) | `Page \| Video.js \| Open Source React Video Player` | `PlayButton \| Video.js \| Open Source React Video Player`       |
| Docs (HTML)  | `Page \| Video.js \| Open Source HTML Video Player`  | `media-play-button \| Video.js \| Open Source HTML Video Player` |
| Non-docs     | `Page \| Video.js \| Open Source Video Player`       | `Blog \| Video.js \| Open Source Video Player`                   |
| Homepage     | `Video.js \| Open Source Video Player`               | —                                                                |

### How it works

- `SITE_TITLE` (`Video.js`) — brand segment, always present
- `SEO_SUFFIX` (`Open Source Video Player`) — default suffix for non-docs pages
- `Base.astro` accepts an optional `suffix` prop (defaults to `SEO_SUFFIX`)
- `Docs.astro` overrides suffix with `Open Source ${FRAMEWORK_LABELS[framework]} Video Player`
- Title construction: `pageTitle | SITE_TITLE | suffix` (or just `SITE_TITLE | suffix` for homepage)

### Guidelines

- Keep total title under ~60 characters — Google truncates beyond that
- Target keywords should appear before the truncation point
- Don't add "Video.js" or "video player" to the page-specific segment — the suffix handles it

## Meta descriptions

### Docs pages

Docs descriptions come from MDX frontmatter `description` + an automatic framework suffix appended by `Docs.astro`:

```
${description} — Video.js ${Framework} Video Player.
```

**Writing good descriptions:**

- Describe the benefit, not just the feature: "Accessible play/pause button with keyboard support" not "A button component for playing and pausing"
- Don't include "Video.js" or version numbers — the suffix handles branding
- Keep the frontmatter description under ~120 chars so the full description (with suffix) stays under ~160 chars
- Use action words: "Accessible", "Customizable", "Composable", "Lightweight", "Fast", "Performant"

### Non-docs pages

Set directly in the page or layout. Include "video player" and relevant keywords naturally.

## Body content keywords

The installation page (`how-to/installation.mdx`) uses `<FrameworkCase>` to show framework-specific intro text with target keywords:

- **React:** "React video player component library"
- **HTML:** "HTML video player built on custom elements"

When adding new high-traffic landing pages, include framework-specific keywords in body content — not just metadata.

## Structured data (JSON-LD)

`createTechArticleSchema` in `site/src/utils/jsonLd/schemas.ts` generates JSON-LD for docs pages. It includes:

```ts
about: {
  '@type': 'SoftwareApplication',
  name: 'Video.js',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Web',
}
```

This helps search engines categorize docs as documentation for a specific software product.

## Internal linking

Use keyword-rich anchor text for internal links instead of generic text:

| Instead of           | Use                                                       |
| -------------------- | --------------------------------------------------------- |
| "click here"         | descriptive text about the target page                    |
| "learn more"         | what the reader will learn, e.g. "customize player skins" |
| bare component names | "video player controls" or "PlayButton component"         |

High-value linking opportunities:

- Homepage → framework installation pages (anchor text: "React video player", "HTML video player")
- Cross-links between related component reference pages
- Links from concept pages to relevant reference pages with descriptive text
