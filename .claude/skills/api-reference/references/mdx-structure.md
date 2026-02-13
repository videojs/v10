# MDX Structure

Structure and conventions for API reference MDX pages at `site/src/content/docs/reference/`.

## Frontmatter

```yaml
---
title: MuteButton              # PascalCase component name
frameworkTitle:
  html: media-mute-button      # HTML custom element tag name
description: A button component for muting and unmuting audio playback
---
```

- `title`: PascalCase React component name
- `frameworkTitle.html`: The `static tagName` from the HTML element file
- `description`: One-line description of the component

## Page Structure

```
frontmatter
imports (React demos, HTML demos)
## Anatomy
## Behavior       (if applicable)
## Styling        (if applicable)
## Accessibility  (if applicable)
## Examples
### BasicUsage
### [Additional demos]
<ApiReference component="{PascalCase}" />
```

## Imports Section

### React demo imports

```mdx
{/* React demos */}
import BasicUsageDemoReact from "@/components/docs/demos/{component}/react/css/BasicUsage";
import basicUsageReactTsx from "@/components/docs/demos/{component}/react/css/BasicUsage.tsx?raw";
import basicUsageReactCss from "@/components/docs/demos/{component}/react/css/BasicUsage.css?raw";
```

- Component import: default export from `.tsx` (no extension needed)
- Source imports: `?raw` suffix for displaying source code in tabs

### HTML demo imports

```mdx
{/* HTML demos */}
import BasicUsageDemoHtml from "@/components/docs/demos/{component}/html/css/BasicUsage.astro";
import basicUsageHtml from "@/components/docs/demos/{component}/html/css/BasicUsage.html?raw";
import basicUsageHtmlCss from "@/components/docs/demos/{component}/html/css/BasicUsage.css?raw";
import basicUsageHtmlTs from "@/components/docs/demos/{component}/html/css/BasicUsage.ts?raw";
```

- `.astro` wrapper: renders live demo
- `.html`, `.css`, `.ts`: `?raw` imports for source tabs

### Import naming convention

| Type | Pattern | Example |
|------|---------|---------|
| React component | `{DemoName}DemoReact` | `BasicUsageDemoReact` |
| React source | `{demoName}React{Ext}` | `basicUsageReactTsx` |
| HTML component | `{DemoName}DemoHtml` | `BasicUsageDemoHtml` |
| HTML source | `{demoName}Html` / `{demoName}Html{Ext}` | `basicUsageHtml`, `basicUsageHtmlCss` |

## Anatomy Section

```mdx
## Anatomy

<FrameworkCase frameworks={["react"]}>
```tsx
<MuteButton />
```
</FrameworkCase>

<FrameworkCase frameworks={["html"]}>
```html
<media-mute-button></media-mute-button>
```
</FrameworkCase>
```

For multi-part components, show composed usage:

```mdx
<FrameworkCase frameworks={["react"]}>
```tsx
<Time.Group>
  <Time.Value type="current" />
  <Time.Separator />
  <Time.Value type="duration" />
</Time.Group>
```
</FrameworkCase>
```

## Prose Sections

### Behavior

Explain state transitions, timing, and interaction logic. Use tables for enumerated states:

```mdx
## Behavior

Toggles mute on and off. Exposes a derived `volumeLevel` based on the current volume and mute state:

| Level | Condition |
|-------|-----------|
| `off` | Muted or volume is 0 |
| `low` | Volume < 0.5 |
```

### Styling

Show data attributes as a table, then CSS selector patterns:

```mdx
## Styling

| Attribute | Values | Description |
|-----------|--------|-------------|
| `data-muted` | Present / absent | Present when audio is muted |
| `data-volume-level` | `"off"` \| `"low"` \| `"medium"` \| `"high"` | Current volume level |

Use `data-volume-level` for multi-level icon switching:

```css
media-mute-button[data-volume-level="off"] .icon-off { display: inline; }
```
```

### Accessibility

Describe ARIA attributes, keyboard interactions, and label overrides:

```mdx
## Accessibility

Renders a `<button>` with an automatic `aria-label`: "Unmute" when muted, "Mute" when unmuted. Override with the `label` prop. Keyboard activation: <kbd>Enter</kbd> / <kbd>Space</kbd>.
```

## Examples Section

### Nesting pattern

```mdx
## Examples

### Basic Usage

<FrameworkCase frameworks={["react"]}>
  <StyleCase styles={["css"]}>
    <Demo files={[
      { title: "App.tsx", code: basicUsageReactTsx, lang: "tsx" },
      { title: "App.css", code: basicUsageReactCss, lang: "css" },
    ]}>
      <BasicUsageDemoReact client:idle />
    </Demo>
  </StyleCase>
</FrameworkCase>

<FrameworkCase frameworks={["html"]}>
  <StyleCase styles={["css"]}>
    <Demo files={[
      { title: "index.html", code: basicUsageHtml, lang: "html" },
      { title: "index.css", code: basicUsageHtmlCss, lang: "css" },
      { title: "index.ts", code: basicUsageHtmlTs, lang: "ts" },
    ]}>
      <BasicUsageDemoHtml />
    </Demo>
  </StyleCase>
</FrameworkCase>
```

Key details:
- React demos use `client:idle` for hydration
- HTML demos render server-side (no `client:*` directive)
- React source tabs: `App.tsx`, `App.css`
- HTML source tabs: `index.html`, `index.css`, `index.ts`

## ApiReference Component

Always the last element in the file:

```mdx
<ApiReference component="MuteButton" />
```

The component auto-renders Props, State, Data Attributes for single-part and all Parts for multi-part.

## Sidebar Entry

Add to `site/src/docs.config.ts` in the Components section, alphabetically:

```ts
{
  sidebarLabel: 'Components',
  contents: [
    // sorted alphabetically
    { slug: 'reference/buffering-indicator' },
    { slug: 'reference/controls' },
    // ...
    { slug: 'reference/{name}' },  // <-- insert alphabetically
    // ...
  ],
},
```

## Required Astro Component Imports

Every reference MDX needs these at the top of the imports:

```mdx
import ApiReference from "@/components/docs/api-reference/ApiReference.astro";
import FrameworkCase from "@/components/docs/FrameworkCase.astro";
import StyleCase from "@/components/docs/StyleCase.astro";
import Demo from "@/components/docs/demos/Demo.astro";
```
