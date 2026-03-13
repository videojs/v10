# Algolia DocSearch Setup

Step-by-step instructions for provisioning the Algolia account, configuring the crawler, and connecting it to the site's `<DocSearch>` component.

The site's DocSearch integration uses **two search indices** (docs ranked by relevance, blog ranked by recency) and an **Ask AI assistant** backed by a markdown index. All three are queried from a single `<DocSearch>` component via the `indices` and `askAi` props.

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Create the Algolia application](#2-create-the-algolia-application)
3. [Create indices](#3-create-indices)
4. [Configure the crawler](#4-configure-the-crawler)
5. [Create the Ask AI assistant](#5-create-the-ask-ai-assistant)
6. [Update site config](#6-update-site-config)
7. [Run the crawler](#7-run-the-crawler)
8. [Verify](#8-verify)

---

## 1. Prerequisites

- An Algolia account with the DocSearch plan (free for open-source: https://docsearch.algolia.com/apply)
- The site deployed to `https://videojs.org` (crawler needs a live URL)
- Access to the Algolia Dashboard at https://dashboard.algolia.com

## 2. Algolia application

The application already exists:
- **Application ID**: `5WD2PWU9HZ`
- **Search API Key**: `2f6bc6cd0361b6bb7a75f1e7f43fe511` (public, read-only — already in `search.config.ts`)

Both are visible at https://dashboard.algolia.com > Settings > API Keys.

## 3. Create indices

Create three indices in the Algolia Dashboard (Search > Index):

| Index name | Purpose |
|---|---|
| `videojs_docs` | Docs pages — relevance-ranked, filterable by framework and category |
| `videojs_blog` | Blog posts — recency-ranked |
| `videojs_docs-markdown` | Markdown content for Ask AI (not used for keyword search) |

The indices will be populated automatically by the crawler. You don't need to add records manually.

You don't need to manually configure index settings in the Dashboard. The crawler config's `initialIndexSettings` (in step 4) automatically applies all settings — facets, ranking, searchable attributes, etc. — on the first crawl.

If you ever need to tweak settings after the first crawl, edit them in **Search > Index > {index} > Configuration**. But for initial setup, the crawler handles it.

## 4. Configure the crawler

Go to https://crawler.algolia.com, select your application, and open the **Editor**. Paste the following configuration:

```js
new Crawler({
  appId: '5WD2PWU9HZ',
  apiKey: '2f6bc6cd0361b6bb7a75f1e7f43fe511',
  rateLimit: 8,
  startUrls: ['https://videojs.org/'],
  sitemaps: ['https://videojs.org/sitemap-index.xml'],
  ignoreCanonicalTo: true,
  ignoreQueryParams: ['source', 'utm_*'],
  saveBackup: false,
  discoveryPatterns: ['https://videojs.org/**'],
  actions: [
    // ──────────────────────────────────────────────
    // Action 1: Docs index (videojs_docs)
    // ──────────────────────────────────────────────
    {
      indexName: 'videojs_docs',
      pathsToMatch: ['https://videojs.org/docs/framework/**'],
      // Only index pages with a content article (data-pagefind-body now, data-search-content after migration)
      selectorsToMatch: ['article[data-pagefind-body], article[data-search-content]'],
      recordExtractor: ({ $, helpers }) => {
        // Remove elements excluded from search (supports both old and new attributes)
        $('[data-pagefind-ignore], [data-search-ignore]').remove();
        $('[data-llms-ignore]').remove();

        // Extract the framework, section, and category from data attributes
        const $article = $('article[data-pagefind-body], article[data-search-content]');
        const framework = $article.attr('data-framework') || '';
        const section = $article.attr('data-site') || '';
        const category = $article.attr('data-category') || '';

        return helpers.docsearch({
          recordProps: {
            lvl0: {
              selectors: '',
              defaultValue: category || 'Documentation',
            },
            lvl1: 'article h1',
            lvl2: 'article h2',
            lvl3: 'article h3',
            lvl4: 'article h4',
            content: 'article p, article li, article td',

            // Custom attributes — these become facetable/filterable
            framework: {
              defaultValue: [framework],
            },
            section: {
              defaultValue: [section],
            },
            category: {
              defaultValue: [category],
            },
          },
          indexHeadings: true,
          aggregateContent: true,
          recordVersion: 'v3',
        });
      },
    },

    // ──────────────────────────────────────────────
    // Action 2: Blog index (videojs_blog)
    // ──────────────────────────────────────────────
    {
      indexName: 'videojs_blog',
      pathsToMatch: ['https://videojs.org/blog/**'],
      // Only index pages with a content article (skips listing pages, author pages, etc.)
      selectorsToMatch: ['article[data-pagefind-body], article[data-search-content]'],
      recordExtractor: ({ $, helpers }) => {
        // Remove elements excluded from search (supports both old and new attributes)
        $('[data-pagefind-ignore], [data-search-ignore]').remove();
        $('[data-llms-ignore]').remove();

        // Extract the publication date from the data-llms-sort attribute
        // This is an ISO 8601 date string on the <article> element
        const $article = $('article[data-pagefind-body], article[data-search-content]');
        const dateISO = $article.attr('data-llms-sort') || '';
        // Convert to Unix timestamp (seconds) for Algolia numeric ranking
        const dateTimestamp = dateISO ? Math.floor(new Date(dateISO).getTime() / 1000) : 0;

        return helpers.docsearch({
          recordProps: {
            lvl0: {
              selectors: '',
              defaultValue: 'Blog',
            },
            lvl1: 'article h1',
            lvl2: 'article h2',
            lvl3: 'article h3',
            content: 'article p, article li',

            // Custom attribute for recency ranking
            date: {
              defaultValue: [String(dateTimestamp)],
            },
          },
          indexHeadings: true,
          aggregateContent: true,
          recordVersion: 'v3',
        });
      },
    },

    // ──────────────────────────────────────────────
    // Action 3: Markdown index for Ask AI (videojs_docs-markdown)
    // ──────────────────────────────────────────────
    {
      indexName: 'videojs_docs-markdown',
      pathsToMatch: ['https://videojs.org/docs/framework/**'],
      selectorsToMatch: ['[data-llms-content]'],
      recordExtractor: ({ $, helpers, url }) => {
        // Remove elements excluded from LLM content (supports both old and new attributes)
        $('[data-llms-ignore]').remove();
        $('[data-pagefind-ignore], [data-search-ignore]').remove();
        // Remove scripts and styles
        $('script, style').remove();

        const $content = $('[data-llms-content]');
        if ($content.length === 0) return [];

        const framework = $content.attr('data-framework') || '';
        const title = $('head > title').text() || $('h1').text() || '';

        // Extract text content as markdown-like plain text
        const textContent = $content.text().replace(/\s+/g, ' ').trim();
        if (!textContent) return [];

        // Split into records if content is large
        return helpers.splitContentIntoRecords({
          baseRecord: {
            url: url.href,
            title,
            framework,
            type: 'content',
          },
          $elements: $content,
          maxRecordBytes: 100000,
          textAttributeName: 'content',
          orderingAttributeName: 'part',
        });
      },
    },
  ],

  // ──────────────────────────────────────────────
  // Index settings applied on first crawl
  // ──────────────────────────────────────────────
  initialIndexSettings: {
    videojs_docs: {
      attributesForFaceting: [
        'type',
        'lang',
        'filterOnly(framework)',
        'filterOnly(category)',
      ],
      attributesToRetrieve: [
        'hierarchy',
        'content',
        'anchor',
        'url',
        'url_without_anchor',
        'type',
        'framework',
        'category',
      ],
      attributesToHighlight: ['hierarchy', 'content'],
      attributesToSnippet: ['content:10'],
      camelCaseAttributes: ['hierarchy', 'content'],
      searchableAttributes: [
        'unordered(hierarchy.lvl0)',
        'unordered(hierarchy.lvl1)',
        'unordered(hierarchy.lvl2)',
        'unordered(hierarchy.lvl3)',
        'unordered(hierarchy.lvl4)',
        'content',
      ],
      distinct: true,
      attributeForDistinct: 'url',
      customRanking: [
        'desc(weight.pageRank)',
        'desc(weight.level)',
        'asc(weight.position)',
      ],
      ranking: [
        'words',
        'filters',
        'typo',
        'attribute',
        'proximity',
        'exact',
        'custom',
      ],
      highlightPreTag: '<span class="algolia-docsearch-suggestion--highlight">',
      highlightPostTag: '</span>',
      minWordSizefor1Typo: 3,
      minWordSizefor2Typos: 7,
      allowTyposOnNumericTokens: false,
      minProximity: 1,
      ignorePlurals: true,
      advancedSyntax: true,
      attributeCriteriaComputedByMinProximity: true,
      removeWordsIfNoResults: 'allOptional',
    },
    videojs_blog: {
      attributesForFaceting: [
        'type',
        'lang',
      ],
      attributesToRetrieve: [
        'hierarchy',
        'content',
        'anchor',
        'url',
        'url_without_anchor',
        'type',
        'date',
      ],
      attributesToHighlight: ['hierarchy', 'content'],
      attributesToSnippet: ['content:10'],
      camelCaseAttributes: ['hierarchy', 'content'],
      searchableAttributes: [
        'unordered(hierarchy.lvl0)',
        'unordered(hierarchy.lvl1)',
        'unordered(hierarchy.lvl2)',
        'unordered(hierarchy.lvl3)',
        'content',
      ],
      distinct: true,
      attributeForDistinct: 'url',
      customRanking: [
        'desc(date)',
        'desc(weight.pageRank)',
        'desc(weight.level)',
        'asc(weight.position)',
      ],
      ranking: [
        'words',
        'filters',
        'typo',
        'attribute',
        'proximity',
        'exact',
        'custom',
      ],
      highlightPreTag: '<span class="algolia-docsearch-suggestion--highlight">',
      highlightPostTag: '</span>',
      minWordSizefor1Typo: 3,
      minWordSizefor2Typos: 7,
      allowTyposOnNumericTokens: false,
      minProximity: 1,
      ignorePlurals: true,
      advancedSyntax: true,
      attributeCriteriaComputedByMinProximity: true,
      removeWordsIfNoResults: 'allOptional',
    },
    'videojs_docs-markdown': {
      searchableAttributes: ['title', 'content'],
      attributesToRetrieve: ['title', 'content', 'url', 'framework', 'part'],
      distinct: true,
      attributeForDistinct: 'url',
      customRanking: ['asc(part)'],
    },
  },
});
```

### How the crawler config works

**`startUrls`** — The crawler begins here and follows links to discover pages.

**`sitemaps`** — The sitemap ensures all pages are discovered even if they're not linked from the start URL.

**`discoveryPatterns`** — Limits the crawler to `videojs.org` (won't follow external links).

**`actions`** — Each action matches a URL pattern and defines how to extract records. `selectorsToMatch` on each action ensures only pages with the right content element are indexed (listing pages, author pages, etc. are skipped automatically):

| Action | `pathsToMatch` | `selectorsToMatch` | Index | What it does |
|---|---|---|---|---|
| Docs | `/docs/framework/**` | `[data-search-content]` | `videojs_docs` | Extracts heading hierarchy + content. Adds `framework`, `section`, `category` as custom facets. |
| Blog | `/blog/**` | `[data-search-content]` | `videojs_blog` | Same heading extraction for blog posts. Adds `date` (Unix timestamp) for recency ranking. |
| Ask AI | `/docs/framework/**` | `[data-llms-content]` | `videojs_docs-markdown` | Extracts full text and splits into large records for the AI assistant. |

**`initialIndexSettings`** — Applied once when the index is first created. Sets faceting, searchable attributes, ranking, and deduplication. Can be overridden later in the Algolia Dashboard.

### Data attributes the crawler reads

These attributes are set in the Astro templates (`[...slug].astro`, `FrameworkCase.astro`):

| Attribute | Set on | Value | Used by |
|---|---|---|---|
| `data-search-content` | `<article>` | (boolean) | All actions — scopes selectors to the main content area |
| `data-search-ignore` | various | `"all"` | All actions — excluded elements (e.g. hidden FrameworkCase, reading time) |
| `data-framework` | `<article>` | `"html"` \| `"react"` | Docs action — extracted as `framework` facet |
| `data-site` | `<article>` | `"docs"` \| `"blog"` | Docs action — extracted as `section` |
| `data-category` | `<article>` | e.g. `"Getting started"` | Docs action — extracted as `category` facet + lvl0 default |
| `data-llms-content` | `<article>` | (boolean) | Ask AI action — scopes content extraction |
| `data-llms-ignore` | various | `"all"` \| `"true"` | All actions — excluded (same elements as search-ignore, but for LLM content) |
| `data-llms-sort` | `<article>` (blog) | ISO 8601 date | Blog action — converted to Unix timestamp for `date` ranking |

## 5. Create the Ask AI assistant

1. Go to **AI > Assistants** in the Algolia Dashboard
2. Click **Create Assistant**
3. Configure:
   - **Name**: `videojs-docs`
   - **Index**: `videojs_docs-markdown`
   - **Instructions** (system prompt): Something like:
     ```
     You are an AI assistant for Video.js v10, a modern video player framework.
     Answer questions about Video.js using the provided documentation context.
     When referencing specific APIs, components, or hooks, be precise about which
     framework (HTML or React) they apply to. If you're unsure, say so.
     ```
4. Note down the **Assistant ID** (shown on the assistant detail page)

## 6. Update site config

`site/src/search.config.ts` already has the correct `appId`, `apiKey`, and index names. The only placeholder left is the Ask AI assistant ID — replace it after creating the assistant in step 5:

```ts
export const DOCSEARCH_ASK_AI_ASSISTANT_ID = 'your-assistant-id'; // ← replace this
```

The **Search API Key** is safe to commit — it can only read public search data.

## 7. Run the crawler

1. Go to https://crawler.algolia.com
2. Select the videojs.org crawler
3. Click **Start a Crawl** (or set up a schedule, e.g. `every 1 day`)
4. Wait for the crawl to complete — check the **Monitoring** tab for progress
5. Once done, verify record counts in each index:
   - `videojs_docs` — should have hundreds of records (one per heading/content block per page)
   - `videojs_blog` — should have records for each blog post
   - `videojs_docs-markdown` — should have large text records for AI

### Setting up a schedule

In the crawler Editor, you can add a `schedule` property at the top level:

```js
new Crawler({
  // ...
  schedule: 'every 1 day at 3:00 am',
  // ...
});
```

Or configure it via the Dashboard UI under **Settings > Schedule**.

## 8. Verify

### In the Algolia Dashboard
1. Go to **Search > Index > videojs_docs > Browse**
   - Records should have `hierarchy.lvl0`, `hierarchy.lvl1`, `content` fields
   - Records should have `framework` field with values `"html"` or `"react"`
   - Records should have `category` field with section names
2. Go to **Search > Index > videojs_blog > Browse**
   - Records should have `date` field (Unix timestamp)
   - Try sorting by `date` descending — recent posts should appear first
3. Go to **Search > Index > videojs_docs-markdown > Browse**
   - Records should have `content` (large text blocks), `title`, `framework`, `url`

### On the site
1. Run `pnpm -F site dev` or deploy to a preview URL
2. Click the search button or press Cmd+K / Ctrl+K
3. Type a query — results should appear grouped by docs and blog
4. Click "Ask AI" — the assistant should respond using docs context
5. Switch framework (HTML ↔ React) — docs results should update to match the selected framework

### Debugging
- **No results**: Check that the crawler completed successfully and records exist in the index
- **Wrong facet filtering**: Verify `framework` attribute is in `attributesForFaceting` for `videojs_docs`
- **Blog not sorted by date**: Verify `customRanking: ['desc(date)']` is set on `videojs_blog`
- **Ask AI not working**: Verify the assistant ID is correct and the `videojs_docs-markdown` index has records

---

## Architecture summary

```
                         ┌─────────────────────┐
                         │   videojs.org site   │
                         │   (Astro + React)    │
                         └──────────┬───────────┘
                                    │
                         DocSearch component
                         (Cmd+K / search button)
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
             ┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
             │ videojs_docs │ │videojs_blog│ │  Ask AI     │
             │   (index)   │ │  (index)   │ │ (assistant) │
             │             │ │            │ │      │      │
             │ faceted by  │ │ ranked by  │ │      ▼      │
             │ framework   │ │ date desc  │ │ videojs_docs│
             │ + category  │ │            │ │  -markdown  │
             └──────▲──────┘ └─────▲──────┘ └──────▲──────┘
                    │               │               │
                    └───────────────┼───────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │   Algolia Crawler   │
                         │  (reads live site)  │
                         └─────────────────────┘
```
