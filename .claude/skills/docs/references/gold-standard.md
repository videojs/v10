# Gold Standard Documentation

Deep analysis of exemplary documentation sites that set the quality bar.

## Tailwind CSS

**Strength:** Direct, code-first, utility-class documentation.

**Key patterns:**
- **Generated output transparency** — shows both utility class AND the CSS it produces
- **Comparison approach** — directly addresses skepticism ("isn't this just inline styles?")
- **Progressive complexity** — simple utilities → composition → customization
- **Responsive/state variants** — consistent `hover:`, `md:` prefix documentation

**Applicable to Video.js:**
- Show player configuration AND resulting DOM/behavior
- Address "why not just use `<video>`?" directly
- Document state variants (`data-playing`, `data-buffering`)

```markdown
// Tailwind pattern
<div class="bg-blue-500 hover:bg-blue-700">

// Generates:
.bg-blue-500 { background-color: #3b82f6; }
.hover\:bg-blue-700:hover { background-color: #1d4ed8; }
```

## Base UI

**Strength:** Minimal prose, AI-ready, clean component docs.

**Key patterns:**
- **Handbook + Components separation** — concepts vs API reference
- **llms.txt** — full docs available for AI consumption
- **"View as Markdown"** links on every page
- **Data attributes focus** — CSS styling hooks prominently documented
- **Compound components** — Root/Track/Thumb pattern

**Applicable to Video.js:**
- Separate Core concepts from DOM component docs
- Provide llms.txt and markdown exports
- Document all data attributes for styling

```markdown
// Base UI component anatomy
<Slider.Root>
  <Slider.Track>
    <Slider.Range />
  </Slider.Track>
  <Slider.Thumb />
</Slider.Root>
```

## Stripe

**Strength:** Confident, scannable, personalized.

**Key patterns:**
- **Personalized examples** — logged-in users see their API keys
- **State machine diagrams** — payment flow visualization
- **Dual-pane layout** — prose left, code right
- **Language/SDK selector** — persists across navigation

**Applicable to Video.js:**
- Visualize player state machine (loading → ready → playing → paused → ended → error)
- SDK selector for React/Vue/Svelte/Solid
- Show player lifecycle with diagrams

```
Player States:
┌─────────┐     ┌───────┐     ┌─────────┐
│ loading │ ──▶ │ ready │ ──▶ │ playing │
└─────────┘     └───────┘     └────┬────┘
                    ▲              │
                    │              ▼
                    │         ┌────────┐
                    └──────── │ paused │
                              └────────┘
```

## Clerk

**Strength:** Framework-specific guides done right.

**Key patterns:**
- **Framework SDK selector** — persists across all docs
- **Content adapts** — React hooks vs Vue composables vs vanilla
- **"Open in ChatGPT/Claude/Cursor"** buttons
- **Quickstart per framework** — not one-size-fits-all

**Applicable to Video.js:**
- Dedicated quickstarts: React, Vue, Svelte, Solid, vanilla
- Persist framework choice across navigation
- Framework-native idioms (hooks vs composables vs stores)

```markdown
// React
const { state } = usePlayer();

// Vue
const { state } = usePlayer();

// Svelte
const state = getPlayerState();

// Solid
const state = usePlayer();
```

## Supabase

**Strength:** Tutorials + API refs, Dashboard/Code toggle.

**Key patterns:**
- **Dashboard/Code toggle** — same operation, two views
- **Framework quickstart grid** — visual icons, clear paths
- **Step-by-step tutorials** — numbered, completable
- **API reference generated** — from OpenAPI spec

**Applicable to Video.js:**
- Show configuration via JS object AND data attributes
- Framework quickstart grid with icons
- Complete tutorials that build something

```markdown
// Dashboard view (conceptual)
Set volume: [slider: 0.5]

// Code view
player.request.setVolume(0.5);
```

## Quality Checklist

When writing docs, verify against these standards:

- [ ] **Direct tone** — no filler words (Stripe)
- [ ] **Code-first** — examples before prose (Tailwind)
- [ ] **Minimal prose** — every sentence earns its place (Base UI)
- [ ] **Framework-native** — use idioms, not abstractions (Clerk)
- [ ] **Complete tutorials** — working examples (Supabase)
- [ ] **AI-ready** — self-contained, markdown exportable (Base UI)
