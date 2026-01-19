# Handbook Template

Use this template for bite-sized reference pages. One concept, quickly scannable.

---

## Template

```markdown
## Concept Name

One-sentence description of the concept.

### Quick Example

// Minimal example showing the concept
player.on('statechange', (state) => {
  console.log(state);
});

### How It Works

2-3 paragraphs explaining the concept. Keep it brief — users are
referencing this while building, not learning from scratch.

Key points:
- Point one
- Point two
- Point three

### Patterns

#### Pattern A

Description of when to use this pattern.

// Code example
const unsubscribe = player.subscribe((state) => {
  updateUI(state);
});

// Cleanup
unsubscribe();

#### Pattern B

Description of alternative pattern.

// Code example
player.on('volumechange', ({ volume }) => {
  volumeDisplay.textContent = `${volume * 100}%`;
});

### Common Pitfalls

#### Pitfall 1

// ❌ Don't
player.state.volume = 0.5; // Won't work

// ✅ Do
player.request.setVolume(0.5);

#### Pitfall 2

// ❌ Don't — memory leak
useEffect(() => {
  player.on('play', handler);
}, []);

// ✅ Do — cleanup
useEffect(() => {
  player.on('play', handler);
  return () => player.off('play', handler);
}, []);

### Reference

| Item | Description |
|------|-------------|
| `method1()` | Does X |
| `method2()` | Does Y |
| `property1` | Current X value |

### See Also

- [Related Concept](/handbook/related)
- [API Reference](/api/relevant-api)
- [Full Guide](/guides/detailed-guide)
```

---

## Handbook vs Guide

| Handbook | Guide |
|----------|-------|
| Reference while working | Learning from scratch |
| One concept per page | Multi-step narrative |
| Scannable, minimal prose | Explains "why" |
| ~500 words | ~1500 words |
| No prerequisites | Has prerequisites |
| Jump-in anywhere | Sequential steps |

---

## Good Handbook Examples

### Events (Short)

```markdown
## Events

Subscribe to player events.

player.on('play', () => console.log('Playing'));
player.on('pause', () => console.log('Paused'));

### Event List

| Event | Payload | Description |
|-------|---------|-------------|
| `play` | — | Playback started |
| `pause` | — | Playback paused |
| `ended` | — | Video ended |
| `timeupdate` | `{ time }` | Time changed |
| `volumechange` | `{ volume, muted }` | Volume changed |

### Removing Listeners

const handler = () => {};
player.on('play', handler);
player.off('play', handler);

### See Also

- [State](/handbook/state)
- [Event API](/api/events)
```

### Styling (Medium)

```markdown
## Styling

Style components with CSS using data attributes.

.player[data-playing] .play-icon { display: none; }
.player[data-paused] .pause-icon { display: none; }

### Data Attributes

Components expose state via `data-*` attributes:

| Attribute | Component | Values |
|-----------|-----------|--------|
| `data-playing` | Player | boolean |
| `data-paused` | Player | boolean |
| `data-muted` | Player | boolean |
| `data-fullscreen` | Player | boolean |
| `data-dragging` | Slider | boolean |

### CSS Variables

Customize with CSS custom properties:

.player {
  --player-accent: #3b82f6;
  --player-bg: #000;
  --slider-height: 4px;
}

| Variable | Default | Description |
|----------|---------|-------------|
| `--player-accent` | `#fff` | Accent color |
| `--player-bg` | `#000` | Background |
| `--slider-height` | `4px` | Track height |

### Tailwind

<Slider.Root className="relative h-1 bg-gray-700">
  <Slider.Fill className="absolute h-full bg-white" />
  <Slider.Thumb className="absolute w-3 h-3 bg-white rounded-full" />
</Slider.Root>

### See Also

- [Components](/components)
- [Theming Guide](/guides/theming)
```

---

## Section Patterns

### Quick Reference Table

```markdown
### Quick Reference

| Task | Code |
|------|------|
| Play | `player.play()` |
| Pause | `player.pause()` |
| Seek | `player.seek(30)` |
| Volume | `player.setVolume(0.5)` |
| Mute | `player.setMuted(true)` |
```

### Comparison Table

```markdown
### State vs Requests

| State | Requests |
|-------|----------|
| Readonly | Async methods |
| Current values | Change values |
| `player.state.volume` | `player.request.setVolume()` |
| Synchronous read | Returns Promise |
```

### Decision Tree

```markdown
### Which API to Use?

**Reading current value?**
→ Use `player.state.propertyName`

**Changing a value?**
→ Use `player.request.methodName()`

**Listening for changes?**
→ Use `player.on('eventname', handler)`
```

---

## Checklist

When writing handbook pages:

- [ ] Single concept per page
- [ ] Quick example at top (under 5 lines)
- [ ] Brief explanation (2-3 paragraphs max)
- [ ] Code patterns with labels
- [ ] Common pitfalls as do/don't
- [ ] Reference table if applicable
- [ ] See Also with 2-4 links
- [ ] Scannable in under 2 minutes
