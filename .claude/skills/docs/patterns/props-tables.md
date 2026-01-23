# Props Tables Pattern

Consistent formats for documenting props, data attributes, CSS variables, and events.

## Props Table Format

```markdown
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | — | Media source URL |
| `autoplay` | `boolean` | `false` | Start playing automatically |
| `muted` | `boolean` | `false` | Start muted |
| `loop` | `boolean` | `false` | Loop playback |
| `controls` | `boolean` | `true` | Show default controls |
| `onPlay` | `() => void` | — | Called when playback starts |
```

### Conventions

**Required props:** No default, use `—` or mark with `*`

```markdown
| `src`* | `string` | — | Media source URL (required) |
```

**Optional props:** Always show default

```markdown
| `volume` | `number` | `1` | Initial volume (0-1) |
```

**Callback props:** `on` prefix, show signature

```markdown
| `onTimeUpdate` | `(time: number) => void` | — | Called on time change |
```

**Enum props:** Show all options

```markdown
| `preload` | `'auto' \| 'metadata' \| 'none'` | `'metadata'` | Preload behavior |
```

**Complex types:** Link to type definition

```markdown
| `tracks` | [`TextTrack[]`](#texttrack) | `[]` | Text tracks (captions, subtitles) |
```

## Data Attributes Table Format

```markdown
| Attribute | Values | Description |
|-----------|--------|-------------|
| `data-state` | `'idle' \| 'loading' \| 'ready' \| 'error'` | Current player state |
| `data-playing` | `''` | Present during playback |
| `data-paused` | `''` | Present when paused |
| `data-muted` | `''` | Present when muted |
| `data-fullscreen` | `''` | Present in fullscreen |
| `data-orientation` | `'horizontal' \| 'vertical'` | Slider orientation |
```

### Boolean Attributes

For boolean state, document presence/absence:

```markdown
| `data-playing` | Present when playing, absent when not |
```

### State Attributes

For state machines, show all values:

```markdown
| `data-state` | `'idle'` | Initial state |
| | `'loading'` | Loading media |
| | `'ready'` | Ready to play |
| | `'playing'` | Currently playing |
| | `'paused'` | Paused |
| | `'ended'` | Playback ended |
| | `'error'` | Error occurred |
```

### Usage Examples

Always follow with CSS example:

```css
/* Style based on state */
.player[data-loading] {
  opacity: 0.5;
}

.player[data-playing] .play-icon {
  display: none;
}

.player[data-paused] .pause-icon {
  display: none;
}
```

## CSS Variables Table Format

```markdown
| Variable | Default | Description |
|----------|---------|-------------|
| `--player-accent-color` | `#3b82f6` | Primary accent color |
| `--player-bg` | `#000` | Background color |
| `--player-controls-bg` | `rgba(0,0,0,0.7)` | Controls background |
| `--player-slider-height` | `4px` | Slider track height |
| `--player-thumb-size` | `12px` | Slider thumb size |
```

### With Scoping

Document which component owns the variable:

```markdown
### Player Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `--player-bg` | `#000` | Player background |

### Slider Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `--slider-height` | `4px` | Track height |
```

### Usage Examples

```css
/* Customize theme */
.player {
  --player-accent-color: #ef4444;
  --player-bg: #1a1a1a;
}

/* Dynamic sizing */
.slider {
  --slider-height: 8px;
}
```

## Events Table Format

```markdown
| Event | Payload | Description |
|-------|---------|-------------|
| `play` | `void` | Playback started |
| `pause` | `void` | Playback paused |
| `ended` | `void` | Playback ended |
| `timeupdate` | `{ currentTime: number }` | Current time changed |
| `volumechange` | `{ volume: number, muted: boolean }` | Volume or muted changed |
| `error` | `{ code: number, message: string }` | Error occurred |
| `statechange` | `{ state: PlayerState }` | Any state changed |
```

### Event Payload Types

Link to type definitions:

```markdown
| `error` | [`PlayerError`](#playererror) | Error occurred |
```

### Event Examples

```ts
player.on('timeupdate', ({ currentTime }) => {
  console.log(`Time: ${currentTime}s`);
});

player.on('error', ({ code, message }) => {
  console.error(`Error ${code}: ${message}`);
});
```

## Methods Table Format

```markdown
| Method | Signature | Description |
|--------|-----------|-------------|
| `play()` | `() => Promise<void>` | Start playback |
| `pause()` | `() => void` | Pause playback |
| `seek()` | `(time: number) => void` | Seek to time |
| `setVolume()` | `(volume: number) => void` | Set volume (0-1) |
| `destroy()` | `() => void` | Cleanup player |
```

## Returns Table Format

For functions/hooks:

```markdown
| Property | Type | Description |
|----------|------|-------------|
| `state` | `PlayerState` | Current state (readonly) |
| `request` | `RequestAPI` | Methods to request changes |
| `subscribe` | `(cb: Callback) => Unsubscribe` | Subscribe to updates |
| `destroy` | `() => void` | Cleanup |
```

## Expandable Types

For complex types, use collapsible details:

```markdown
| `options` | [`PlayerOptions`](#playeroptions) | Configuration |

<details>
<summary>PlayerOptions</summary>

| Property | Type | Default |
|----------|------|---------|
| `src` | `string` | — |
| `autoplay` | `boolean` | `false` |
| `muted` | `boolean` | `false` |

</details>
```

## Framework Variations

### React Props

```markdown
| Prop | Type | Default |
|------|------|---------|
| `ref` | `React.Ref<PlayerRef>` | — |
| `children` | `React.ReactNode` | — |
| `className` | `string \| (state) => string` | — |
```

### Vue Props

```markdown
| Prop | Type | Default |
|------|------|---------|
| `modelValue` | `number` | — |
| `@update:modelValue` | `(value: number) => void` | — |
```

### Svelte Props

```markdown
| Prop | Type | Default |
|------|------|---------|
| `bind:value` | `number` | — |
| `$bindable` | ✓ | Can be bound |
```
