# Migration Guide Template

Use this template for version migration documentation.

---

## Template

```markdown
## Migrating from vX to vY

This guide covers migrating from Video.js X to Video.js Y.

### Overview

Video.js Y introduces [major changes]. This guide will help you update your code.

**Estimated time:** 30-60 minutes for typical projects

### Breaking Changes Summary

| Change | Impact | Migration |
|--------|--------|-----------|
| `oldApi()` removed | High | Use `newApi()` |
| Config format changed | Medium | Update config |
| Event renamed | Low | Rename handlers |

### Automated Migration

Run the codemod to handle most changes automatically:

npx @videojs/codemod v9-to-v10

This handles:
- ✅ API renames
- ✅ Config format updates
- ✅ Import path changes
- ⚠️ Manual review needed for custom plugins

### Step-by-Step Migration

#### 1. Update Dependencies

npm install @videojs/core@10

If using framework adapters:

npm install @videojs/react@10 @videojs/vue@10

#### 2. Update Imports

// ❌ v9
import videojs from 'video.js';

// ✅ v10
import { createPlayer } from '@videojs/core';

#### 3. Update Player Creation

// ❌ v9
const player = videojs('my-video', {
  sources: [{ src: 'video.mp4', type: 'video/mp4' }],
  autoplay: true,
});

// ✅ v10
const player = createPlayer({
  src: 'video.mp4',
  autoplay: true,
});

await player.attach(document.getElementById('my-video'));

#### 4. Update Event Handlers

// ❌ v9
player.on('loadedmetadata', function() {
  console.log(this.duration());
});

// ✅ v10
player.on('loadedmetadata', () => {
  console.log(player.state.duration);
});

#### 5. Update Method Calls

| v9 | v10 |
|----|-----|
| `player.play()` | `await player.request.play()` |
| `player.pause()` | `player.request.pause()` |
| `player.currentTime(30)` | `player.request.seek(30)` |
| `player.volume(0.5)` | `player.request.setVolume(0.5)` |
| `player.muted(true)` | `player.request.setMuted(true)` |

#### 6. Update State Access

// ❌ v9 — getter methods
const time = player.currentTime();
const vol = player.volume();
const dur = player.duration();

// ✅ v10 — state object
const { currentTime, volume, duration } = player.state;

#### 7. Update Plugins

// ❌ v9
videojs.registerPlugin('myPlugin', function(options) {
  const player = this;
  // plugin code
});

player.myPlugin({ option: 'value' });

// ✅ v10
function myPlugin(player, options) {
  // plugin code
  return {
    destroy() {
      // cleanup
    },
  };
}

player.use(myPlugin, { option: 'value' });

### Removed APIs

These APIs have been removed with no direct replacement:

| Removed | Alternative |
|---------|-------------|
| `player.tech()` | Use `player.state` for media info |
| `player.el()` | Pass element to `attach()` |
| `player.addClass()` | Use CSS classes directly |

### Changed Behaviors

#### Autoplay

v10 follows browser autoplay policies more strictly:

// v10 — autoplay requires muted
const player = createPlayer({
  src: 'video.mp4',
  autoplay: true,
  muted: true, // Required for autoplay in most browsers
});

#### Error Handling

// v10 — requests can fail
const result = await player.request.play();

if (!result.success) {
  console.error(result.error);
}

### Framework Adapter Changes

#### React

// ❌ v9
import { Player } from 'video.js/react';

<Player>
  <source src="video.mp4" type="video/mp4" />
</Player>

// ✅ v10
import { Player } from '@videojs/react';

<Player src="video.mp4" />

#### Vue

// ❌ v9
import VideoPlayer from 'video.js/vue';

// ✅ v10
import { Player } from '@videojs/vue';

### TypeScript Changes

Types are now included in the package:

// ❌ v9
npm install @types/video.js

// ✅ v10 — types included
import type { Player, PlayerOptions } from '@videojs/core';

### CSS Changes

// ❌ v9
@import 'video.js/dist/video-js.css';

// ✅ v10 — optional, components are unstyled
@import '@videojs/dom/styles.css'; // Optional base styles

### Testing Updates

// ❌ v9
const player = videojs(document.createElement('video'));

// ✅ v10
import { createTestPlayer } from '@videojs/test-utils';

const player = createTestPlayer();

### Troubleshooting

#### "createPlayer is not a function"

Check your import:

// ❌ Wrong
import createPlayer from '@videojs/core';

// ✅ Correct
import { createPlayer } from '@videojs/core';

#### "Cannot read property 'play' of undefined"

Ensure player is attached:

const player = createPlayer({ src: 'video.mp4' });
await player.attach(videoElement); // Don't forget this!
await player.request.play();

#### Plugin not working

Update plugin registration:

// Old way doesn't work
videojs.registerPlugin('myPlugin', fn);

// Use the new API
player.use(myPlugin, options);

### Getting Help

- [GitHub Discussions](https://github.com/videojs/video.js/discussions)
- [Discord](https://discord.gg/videojs)
- [Migration FAQ](/guides/migration-faq)

### Changelog

See [CHANGELOG.md](https://github.com/videojs/video.js/blob/main/CHANGELOG.md) for complete list of changes.
```

---

## Codemod Documentation

If providing automated migration:

```markdown
## Codemod

### Installation

npx @videojs/codemod --help

### Usage

# Dry run (preview changes)
npx @videojs/codemod v9-to-v10 --dry

# Apply changes
npx @videojs/codemod v9-to-v10

# Specific directory
npx @videojs/codemod v9-to-v10 ./src

### What It Transforms

| Transform | Before | After |
|-----------|--------|-------|
| `imports` | `import videojs from 'video.js'` | `import { createPlayer } from '@videojs/core'` |
| `creation` | `videojs('id', opts)` | `createPlayer(opts)` |
| `methods` | `player.currentTime()` | `player.state.currentTime` |

### Manual Review Required

The codemod marks these for manual review:

// TODO: @videojs/codemod - Review plugin registration
player.myPlugin();

// TODO: @videojs/codemod - Review tech access
player.tech();
```

---

## Checklist

When writing migration guides:

- [ ] Overview with estimated time
- [ ] Breaking changes summary table
- [ ] Codemod instructions (if available)
- [ ] Step-by-step with before/after code
- [ ] API mapping table (old → new)
- [ ] Removed APIs documented
- [ ] Behavior changes explained
- [ ] Framework-specific sections
- [ ] TypeScript changes
- [ ] CSS changes
- [ ] Troubleshooting section
- [ ] Links to help resources
