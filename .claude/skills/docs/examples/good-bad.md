# Do/Don't Examples

Collection of good/bad patterns for Video.js documentation.

## Tone & Voice

### Wordy vs Direct

```markdown
// ❌ Wordy
In order to create a new player instance, you will first need to
import the createPlayer function from the core package, and then
you can call it with a configuration object that contains your options.

// ✅ Direct
Create a player:

import { createPlayer } from '@videojs/core';

const player = createPlayer({ src: 'video.mp4' });
```

### Hedging vs Confident

```markdown
// ❌ Hedging
You might want to consider using the request API, which could
potentially help with handling async operations.

// ✅ Confident
Use the request API for async operations.
```

### Passive vs Active

```markdown
// ❌ Passive
The player can be created by calling createPlayer.

// ✅ Active
Call createPlayer to create a player.
```

### Explaining vs Showing

```markdown
// ❌ Over-explaining
The subscribe function returns an unsubscribe function that you should
call when you want to stop receiving updates. This is important for
preventing memory leaks in your application.

// ✅ Code speaks
const unsubscribe = player.subscribe(callback);

// Later, cleanup:
unsubscribe();
```

## Code Examples

### Missing Imports

```markdown
// ❌ Assumes imports exist
const player = createPlayer({ src: 'video.mp4' });

// ✅ Self-contained
import { createPlayer } from '@videojs/core';

const player = createPlayer({ src: 'video.mp4' });
```

### Unrealistic Values

```markdown
// ❌ Meaningless
const foo = createBar({ baz: 'qux' });

// ✅ Realistic
const player = createPlayer({ src: 'video.mp4' });
```

### No Output Shown

```markdown
// ❌ What does this return?
player.state.currentTime;

// ✅ Shows expected value
player.state.currentTime;
// => 45.2
```

### Complex Without Progression

```markdown
// ❌ Throws everything at once
const player = createPlayer({
  src: 'video.mp4',
  autoplay: true,
  muted: true,
  loop: false,
  preload: 'metadata',
  crossOrigin: 'anonymous',
  poster: 'poster.jpg',
  playbackRate: 1,
  tracks: [
    { kind: 'subtitles', src: 'en.vtt', label: 'English', default: true },
  ],
  plugins: [analyticsPlugin()],
});

// ✅ Progressive disclosure

// Basic:
const player = createPlayer({ src: 'video.mp4' });

// With autoplay:
const player = createPlayer({
  src: 'video.mp4',
  autoplay: true,
  muted: true, // Required for autoplay
});

// Full configuration — see [Options Reference](/api/options)
```

## State & Requests

### Mutating State

```markdown
// ❌ Don't — state is readonly
player.state.volume = 0.5;
player.state.currentTime = 30;

// ✅ Do — use requests
await player.request.setVolume(0.5);
await player.request.seek(30);
```

### Ignoring Async

```markdown
// ❌ Don't — ignores result
player.request.play();

// ✅ Do — handle result
const result = await player.request.play();
if (!result.success) {
  console.error(result.error);
}
```

### Sync vs Async Access

```markdown
// ❌ Don't — wrong API for reading
const time = await player.request.getCurrentTime();

// ✅ Do — state is synchronous
const time = player.state.currentTime;
```

## Event Handling

### Memory Leaks

```markdown
// ❌ Don't — no cleanup
useEffect(() => {
  player.on('play', handlePlay);
}, []);

// ✅ Do — cleanup on unmount
useEffect(() => {
  player.on('play', handlePlay);
  return () => player.off('play', handlePlay);
}, []);
```

### Recreating Handlers

```markdown
// ❌ Don't — new function every render
<Player onTimeUpdate={(t) => setTime(t)} />

// ✅ Do — stable reference
const handleTimeUpdate = useCallback((t) => setTime(t), []);
<Player onTimeUpdate={handleTimeUpdate} />
```

## Component Patterns

### Inline Logic

```markdown
// ❌ Don't — logic in JSX
<div className={player.state.playing ? 'playing' : 'paused'}>
  {player.state.currentTime > 0 && player.state.currentTime < player.state.duration && (
    <span>{formatTime(player.state.currentTime)}</span>
  )}
</div>

// ✅ Do — extract logic
const { playing, currentTime, duration } = player.state;
const showTime = currentTime > 0 && currentTime < duration;

<div className={playing ? 'playing' : 'paused'}>
  {showTime && <span>{formatTime(currentTime)}</span>}
</div>
```

### Missing Compound Parts

```markdown
// ❌ Don't — incomplete anatomy
<Slider value={volume}>
  <SliderThumb />
</Slider>

// ✅ Do — complete structure
<Slider.Root value={volume}>
  <Slider.Track>
    <Slider.Range />
  </Slider.Track>
  <Slider.Thumb />
</Slider.Root>
```

## Styling

### Inline Styles

```markdown
// ❌ Don't — hard to maintain
<div style={{ color: playing ? 'green' : 'red' }}>

// ✅ Do — use data attributes
<div data-playing={playing}>

[data-playing="true"] { color: green; }
[data-playing="false"] { color: red; }
```

### Magic Numbers

```markdown
// ❌ Don't — unexplained values
.slider-thumb {
  left: calc(50% - 8px);
}

// ✅ Do — use CSS variables
.slider-thumb {
  --thumb-size: 16px;
  left: calc(var(--percent) - var(--thumb-size) / 2);
}
```

## Documentation Structure

### Wall of Text

```markdown
// ❌ Don't — overwhelming
The player state object contains all the current values of the player
including the current time, duration, volume, muted state, playing state,
paused state, ended state, and many other properties that you can access
synchronously at any time to get the current state of the player.

// ✅ Do — scannable
### State Properties

| Property | Type | Description |
|----------|------|-------------|
| `currentTime` | `number` | Current playback time |
| `duration` | `number` | Total duration |
| `volume` | `number` | Volume (0-1) |
| `muted` | `boolean` | Muted state |
| `playing` | `boolean` | Playing state |
```

### Missing Context

```markdown
// ❌ Don't — where does this go?
player.use(myPlugin);

// ✅ Do — show full context
import { createPlayer } from '@videojs/core';
import { myPlugin } from './plugins/my-plugin';

const player = createPlayer({ src: 'video.mp4' });
player.use(myPlugin, { option: 'value' });
```

### No See Also

```markdown
// ❌ Don't — dead end
That's how events work.

// ✅ Do — guide further reading
## See Also

- [State Management](/handbook/state) — Reading player state
- [Event Reference](/api/events) — All available events
- [Custom Events Guide](/guides/custom-events) — Creating your own
```
