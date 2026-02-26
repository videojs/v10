---
status: decided
date: 2026-02-26
---

# Source URL Auto-Detection for Installation Page

## Decision

Replace the radio grid source picker on the installation page with a URL input + select dropdown.
Users paste a media URL, the system auto-detects the source type, and the generated code reflects
their actual URL.

## Context

The installation page wizard walks users through: framework → use case → skin → source → code output.

The source step currently shows a radio grid of icons (HTML5 Video, YouTube, HLS, etc.) via
`ImageRadioGroup`. This requires users to already know what source type they need. A URL-first
approach is more intuitive — paste the URL you have, we'll figure out the rest.

## Spec

### Layout

The left column of `RendererPicker` changes from a radio grid to:

```
"Enter the URL to a video to auto-detect"
┌─────────────────────────────────────┐
│ https://...                         │
└─────────────────────────────────────┘

"This looks like a YouTube link. Select YouTube"   ← dynamic label above dropdown
┌─ YouTube ──────────────────────── ▾ ┐
└─────────────────────────────────────┘
```

The label above the dropdown is dynamic — it changes based on detection state (see
Suggestion Text below). When no URL is entered, it reads "or select manually".

The right column (Mux uploader panel) stays as-is.

### Detection Rules

Given a URL, check **domain first**, then **file extension**. Domain always wins over extension.

| Signal | Renderer | Notes |
|--------|----------|-------|
| `youtube.com`, `youtu.be` | `youtube` | |
| `vimeo.com` | `vimeo` | |
| `stream.mux.com`, `mux.com` | `mux-video` / `mux-audio` | Depends on use case |
| `open.spotify.com` | `spotify` | |
| `watch.videodelivery.net`, `videodelivery.net`, `cloudflarestream.com` | `cloudflare` | |
| `cdn.jwplayer.com`, `content.jwplatform.com` | `jwplayer` | |
| `fast.wistia.com`, `fast.wistia.net`, `*.wistia.com` | `wistia` | |
| `.m3u8` extension | `hls` | |
| `.mpd` extension | `dash` | |
| `.mp4`, `.webm`, `.mov`, `.ogv` | `html5-video` | |
| `.mp3`, `.wav`, `.ogg`, `.flac`, `.aac` | `html5-audio` | |
| No match | `null` | Show "select manually" message |

### Mux Playback ID Extraction

Mux stream URLs follow the pattern `https://stream.mux.com/{PLAYBACK_ID}.m3u8`.
Extract the playback ID and store it in the `muxPlaybackId` nanostore so code generation
uses `playback-id="..."` instead of `src="..."`.

### Use Case Filtering

Detection is filtered by the active use case. If the detected renderer isn't valid for the
current use case (e.g., YouTube URL + audio use case), show:

> "No match for audio sources — select manually"

...and don't auto-select anything.

When the use case changes and a URL is present, re-run detection.

### Mux Upload Integration

When a Mux upload completes and a playback ID is available, construct
`https://stream.mux.com/{PLAYBACK_ID}.m3u8` and set it as the URL input value.
This triggers detection, which identifies it as Mux and extracts the playback ID.

### Select Dropdown Behavior

- Populated with the same renderer options currently in the radio grid, filtered by use case.
- When URL detection auto-selects a renderer, the dropdown reflects the selection.
- When the user manually overrides via the dropdown, the label changes to show the
  detection text with an inline "Select YouTube" link so they can revert to the
  detected choice.
- Manually picking from the dropdown does **not** clear the URL input.

### Code Output

The user's URL is injected into generated code:

- **HTML**: `<youtube-video src="https://youtube.com/watch?v=abc123"></youtube-video>`
- **React**: `<MyPlayer src="https://youtube.com/watch?v=abc123" />`
- **Mux special case**: Uses `playback-id="..."` instead of `src="..."`
- **Empty URL**: Falls back to `src="..."` placeholder (current behavior)

### Suggestion Text

The suggestion text replaces the dropdown label (not a separate area). Always hedge —
treat every detection as uncertain:

- No URL entered: _"or select manually"_
- Match found, matches current selection: _"This looks like a/an [Source] link"_
- Match found, differs from selection: _"This looks like a/an [Source] link."_ + underlined **"Select [Source]"** link
- No match: _"We couldn't detect the source type — select manually below"_

Always auto-select the detected renderer (when valid for the use case), even when hedging.

#### Determiner Logic

The article before the label ("a" vs "an") is chosen by the opening **sound** of the label,
not its first letter. Use "an" before vowel sounds, "a" before consonant sounds.

Implementation: a `Record<Renderer, "a" | "an">` maps every renderer to its article. Using
`Record<Renderer, ...>` ensures a compile-time error if a renderer is added to the `Renderer`
union without specifying its article. A helper `articleFor(renderer: Renderer): "a" | "an"`
looks up the record.

```ts
const RENDERER_ARTICLES: Record<Renderer, 'a' | 'an'> = {
  'background-video': 'a',
  'cloudflare':       'a',
  'dash':             'a',
  'hls':              'an',
  'html5-audio':      'an',
  'html5-video':      'an',
  'jwplayer':         'a',
  'mux-audio':        'a',
  'mux-background-video': 'a',
  'mux-video':        'a',
  'spotify':          'a',
  'vimeo':            'a',
  'wistia':           'a',
  'youtube':          'a',
};
```

## New State

Add to `installation.ts`:

```ts
export const sourceUrl = atom<string>('');
```

This is read by code generation components to inject the real URL into output.

## Files to Change

| File | Change |
|------|--------|
| `site/src/stores/installation.ts` | Add `sourceUrl` atom |
| `site/src/components/installation/RendererSelect.tsx` | Rewrite: URL input + select dropdown + detection logic |
| `site/src/components/installation/RendererPicker.tsx` | Update heading text from "Select your source" |
| `site/src/components/installation/MuxUploaderPanel.tsx` | On upload complete, set `sourceUrl` to Mux stream URL |
| `site/src/components/installation/HTMLUsageCodeBlock.tsx` | Read `sourceUrl`; use as `src` value when non-empty |
| `site/src/components/installation/ReactUsageCodeBlock.tsx` | Read `sourceUrl`; use as `src` value when non-empty |

New files:

| File | Purpose |
|------|---------|
| `site/src/utils/detectRenderer.ts` | Pure function: URL → `{ renderer, label }` or `null` |
| `site/src/utils/__tests__/detectRenderer.test.ts` | Tests for detection logic |

## Alternatives Considered

- **Keep the radio grid, add URL input above it** — More UI clutter, two selection mechanisms
  visible at once, confusing which takes priority.
- **Auto-detect only, no manual dropdown** — Some sources can't be detected from URL alone
  (e.g., user hasn't decided yet, or the URL is unusual).
- **Confidence levels (high/low) with different UX** — Adds complexity. Hedging the language
  universally is simpler and sufficient until we see user confusion.
