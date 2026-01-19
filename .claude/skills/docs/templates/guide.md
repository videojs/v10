# Guide Template

Use this template for step-by-step tutorials that teach concepts.

> **Use sparingly.** Most documentation should be handbook pages. Guides are only
> for true tutorials: Getting Started, Building X from Scratch. If you're
> documenting a single concept, use `templates/handbook.md` instead.

---

## Template

```markdown
## Guide Title

Brief description of what you'll build/learn.

### What You'll Learn

- Learning outcome 1
- Learning outcome 2
- Learning outcome 3

### Prerequisites

- [Getting Started](/guides/getting-started) completed
- Basic knowledge of X
- Node.js 18+

### Time

~15 minutes

---

## Step 1: Setup

Brief intro to this step.

npm install @videojs/core

Create your project structure:

my-project/
├── index.html
├── main.ts
└── styles.css

> **Note:** You can also use the starter template:
> `npx create-videojs-app my-project`

---

## Step 2: Create the Player

Explanation of what we're doing and why.

import { createPlayer } from '@videojs/core';

const player = createPlayer({
src: 'video.mp4',
});

Let's break this down:

- `createPlayer` — Factory function that creates a player instance
- `src` — The video source URL

---

## Step 3: Add Controls

Now we'll add playback controls.

import { createPlayer } from '@videojs/core';
import { PlayButton, VolumeSlider } from '@videojs/dom';

const player = createPlayer({ src: 'video.mp4' });

const playButton = PlayButton({ player });
const volume = VolumeSlider({ player });

document.getElementById('controls').append(playButton, volume);

:::tip
The DOM components automatically sync with player state.
:::

---

## Step 4: Handle Events

Listen to player events:

player.on('play', () => {
console.log('Playback started');
});

player.on('ended', () => {
console.log('Video finished');
});

Common events:

| Event   | Description      |
| ------- | ---------------- |
| `play`  | Playback started |
| `pause` | Playback paused  |
| `ended` | Video finished   |
| `error` | Error occurred   |

---

## Step 5: Style the Player

Add custom styles:

.player {
--player-accent-color: #3b82f6;
--player-bg: #000;
}

.player[data-fullscreen] {
width: 100vw;
height: 100vh;
}

---

## Complete Example

Here's everything together:

import { createPlayer } from '@videojs/core';
import { PlayButton, VolumeSlider, Timeline } from '@videojs/dom';
import './styles.css';

// Create player
const player = createPlayer({
src: 'video.mp4',
autoplay: false,
});

// Create controls
const controls = document.getElementById('controls');
controls.append(
PlayButton({ player }),
Timeline({ player }),
VolumeSlider({ player }),
);

// Handle events
player.on('error', (e) => {
console.error('Player error:', e);
});

// Attach to video element
const video = document.querySelector('video');
await player.attach(video);

[Open in StackBlitz →](https://stackblitz.com/edit/videojs-guide-example)

---

## What's Next?

You've learned the basics. Next steps:

- [Add captions and subtitles](/guides/text-tracks)
- [Build custom controls](/guides/custom-controls)
- [Handle multiple sources](/guides/sources)

### Related

- [API Reference: createPlayer](/api/create-player)
- [Handbook: Events](/handbook/events)
- [Components: PlayButton](/components/play-button)
```

---

## Step Structure

Each step should have:

1. **Heading** — Clear action (`## Step N: Action`)
2. **Intro** — Why we're doing this (1-2 sentences)
3. **Code** — The code to write
4. **Explanation** — What the code does
5. **Notes/Tips** — Optional callouts

---

## Callout Patterns

```markdown
:::note
Additional context that's helpful but not required.
:::

:::tip
Pro tip or best practice.
:::

:::warning
Important caveat or common mistake.
:::

:::danger
Critical warning — something that could break things.
:::
```

---

## Progress Indicators

Show progress through the guide:

```markdown
**Progress:** ██████░░░░ 60% complete
```

Or step indicators:

```markdown
Steps: [1] → [2] → **[3]** → [4] → [5]
```

---

## Code Evolution

Show how code changes across steps:

````markdown
## Step 2

Add event handling to our player:

```ts
const player = createPlayer({ src: 'video.mp4' });

// highlight-start
player.on('play', () => {
  console.log('Playing');
});
// highlight-end
```
````

Or use diff:

```ts
const player = createPlayer({ src: 'video.mp4' });

+ player.on('play', () => {
+   console.log('Playing');
+ });
```

---

## Checkpoints

Add verification points:

```markdown
## Step 3: Test It

At this point, you should see:

- [ ] Video element renders
- [ ] Play button appears
- [ ] Clicking play starts video

If something's wrong, check:

1. Is the video URL correct?
2. Is the element attached?
3. Check console for errors
```

---

## Branching Paths

For guides with options:

```markdown
## Step 4: Choose Your Framework

<Tabs>
<Tab label="React">

If you're using React, install the adapter:

npm install @videojs/react

[Continue with React →](#react-setup)

</Tab>
<Tab label="Vue">

If you're using Vue, install the adapter:

npm install @videojs/vue

[Continue with Vue →](#vue-setup)

</Tab>
</Tabs>
```

---

## Checklist

When writing guides:

- [ ] Clear title stating what you'll build/learn
- [ ] Prerequisites listed
- [ ] Estimated time
- [ ] Numbered steps with clear actions
- [ ] Code examples at each step
- [ ] Explanations of why, not just what
- [ ] Complete working example at end
- [ ] StackBlitz link for live testing
- [ ] "What's Next" section with links
- [ ] Related handbook/API pages linked
