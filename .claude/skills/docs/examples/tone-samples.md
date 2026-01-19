# Tone & Voice Samples

Reference samples showing the target voice for Video.js documentation.

## Core Voice Attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| **Direct** | Get to the point | "Create a player:" not "To create a player..." |
| **Confident** | No hedging | "Use requests" not "You might want to use" |
| **Friendly** | Warm but not chatty | Technical but approachable |
| **Code-first** | Show, don't tell | Example before explanation |

## Quick Start Sample

```markdown
## Quick Start

Install Video.js:

npm install @videojs/core

Create a player:

import { createPlayer } from '@videojs/core';

const player = createPlayer({ src: 'video.mp4' });

Attach to a video element:

const video = document.querySelector('video');
await player.attach(video);

[Full getting started guide →](/guides/getting-started)
```

**Why this works:**
- Immediate value (code in seconds)
- No preamble or explanation
- Action-oriented headings
- Links to more detail

## Concept Explanation Sample

```markdown
## State Management

Player state is a readonly snapshot of current values.

const { currentTime, volume, playing } = player.state;

State updates through requests, not direct mutation:

// ❌ This won't work
player.state.volume = 0.5;

// ✅ Use requests
await player.request.setVolume(0.5);

Requests are async because they coordinate with the media element.
They return a result indicating success or failure:

const result = await player.request.play();
if (!result.success) {
  // Handle autoplay blocked, etc.
}
```

**Why this works:**
- Concept in one sentence
- Code example immediately
- Do/don't shows contrast
- Brief "why" explanation
- No fluff or padding

## API Reference Sample

```markdown
## createPlayer

Creates a player instance.

import { createPlayer } from '@videojs/core';

const player = createPlayer({
  src: 'video.mp4',
  autoplay: true,
});

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `src` | `string` | — | Media source URL |
| `autoplay` | `boolean` | `false` | Start playing when ready |
| `muted` | `boolean` | `false` | Start muted |

### Returns

`Player` — A player instance. See [Player API](/api/player).

### Example

const player = createPlayer({
  src: 'https://example.com/video.mp4',
  autoplay: true,
  muted: true,
});

await player.attach(document.querySelector('video'));
```

**Why this works:**
- Function name as heading
- One-line description
- Immediate code example
- Clean options table
- Return type linked
- Complete example

## Error Documentation Sample

```markdown
## Handling Errors

Players emit `error` events when something goes wrong:

player.on('error', (error) => {
  console.error(error.code, error.message);
});

### Error Codes

| Code | Name | Description |
|------|------|-------------|
| `1` | `MEDIA_ERR_ABORTED` | Fetching aborted |
| `2` | `MEDIA_ERR_NETWORK` | Network error |
| `3` | `MEDIA_ERR_DECODE` | Decoding failed |
| `4` | `MEDIA_ERR_SRC_NOT_SUPPORTED` | Source not supported |

### Common Fixes

**MEDIA_ERR_SRC_NOT_SUPPORTED**

Check that:
- URL is accessible (no CORS issues)
- Format is supported by browser
- File exists and isn't corrupted

const player = createPlayer({
  src: 'video.mp4',
  crossOrigin: 'anonymous', // Enable CORS
});
```

**Why this works:**
- Shows how to catch errors first
- Reference table for lookup
- Actionable troubleshooting
- Code solution included

## Warning/Note Sample

```markdown
:::note
Autoplay requires `muted: true` in most browsers due to autoplay policies.
:::

:::warning
Calling `destroy()` removes all event listeners. Store references to
handlers if you need to reattach them.
:::

:::tip
Use `preload: 'metadata'` for faster initial load when autoplay is off.
:::
```

**When to use each:**
- **Note**: Supplementary info, not critical
- **Warning**: Could cause problems if ignored
- **Tip**: Optimization or best practice

## Migration Sample

```markdown
## Migrating to v10

### Player Creation

// ❌ v9
const player = videojs('my-video', { sources: [{ src: 'video.mp4' }] });

// ✅ v10
const player = createPlayer({ src: 'video.mp4' });
await player.attach(document.getElementById('my-video'));

### Accessing State

// ❌ v9 — methods
const time = player.currentTime();

// ✅ v10 — properties
const time = player.state.currentTime;

Run the codemod to automate most changes:

npx @videojs/codemod v9-to-v10
```

**Why this works:**
- Before/after code pairs
- Clear v9/v10 labels
- Automated migration offered
- Minimal explanation needed

## Words to Avoid

| Avoid | Use Instead |
|-------|-------------|
| "In order to" | "To" |
| "Basically" | (delete) |
| "Simply" | (delete) |
| "Just" | (delete) |
| "Very" | (delete) |
| "Actually" | (delete) |
| "You might want to" | "Use" |
| "It should be noted that" | (delete, just say it) |
| "Please note that" | (delete, just say it) |
| "As you can see" | (delete) |
| "Obviously" | (delete) |
| "Clearly" | (delete) |

## Sentence Patterns

### Task-Oriented

```markdown
// ✅ Good — starts with action
Create a player with autoplay enabled.
Subscribe to state changes.
Handle errors using the error event.

// ❌ Avoid — passive or wordy
A player can be created with autoplay enabled.
You can subscribe to state changes if you want.
Errors can be handled by using the error event.
```

### Linking Concepts

```markdown
// ✅ Good — natural link
See [Events](/handbook/events) for the full list.
Learn more in the [State Guide](/guides/state).

// ❌ Avoid — awkward phrasing  
For more information about events, please refer to the Events page.
You can find additional details in the State Guide documentation.
```

## Length Guidelines

| Content Type | Target Length |
|--------------|---------------|
| Function description | 1 sentence |
| Concept intro | 1-2 sentences |
| Handbook page | 300-500 words |
| Guide section | 100-200 words |
| Code comments | < 10 words |

## Checklist

When reviewing docs for tone:

- [ ] No filler words (basically, simply, just)
- [ ] Active voice throughout
- [ ] Code appears before explanation
- [ ] Sentences under 20 words
- [ ] No hedging (might, could, perhaps)
- [ ] Links are natural, not awkward
- [ ] Headings are actions or nouns
