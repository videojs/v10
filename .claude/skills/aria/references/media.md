# Media Player Accessibility

Accessibility patterns specific to video and audio players. Covers controls, keyboard shortcuts, captions, and screen reader support.

---

## Player Container

The root player element needs proper identification:

```html
<div 
  role="region" 
  aria-label="Video Player: {title}"
  tabindex="-1"
>
  <!-- Player contents -->
</div>
```

**Attributes:**
- `role="region"` or `role="application"` (if fully keyboard-managed)
- `aria-label` includes media type and title
- `tabindex="-1"` allows programmatic focus

---

## Keyboard Shortcuts

### Standard Media Keys

| Key | Action | Configurable |
|-----|--------|--------------|
| `Space` / `k` | Toggle play/pause | Yes |
| `m` | Toggle mute | Yes |
| `f` | Toggle fullscreen | Yes |
| `c` | Toggle captions | Yes |
| `i` | Toggle picture-in-picture | Yes |
| `←` / `j` | Seek backward | Yes (default: 5-10s) |
| `→` / `l` | Seek forward | Yes (default: 5-10s) |
| `↑` | Volume up | Yes (default: 5-10%) |
| `↓` | Volume down | Yes (default: 5-10%) |
| `Home` | Seek to start | — |
| `End` | Seek to end | — |
| `0-9` | Seek to percentage | — |

### Key Scope

Configure whether shortcuts work:
- **Document-wide**: Work anywhere on page (YouTube-style)
- **Player-scoped**: Only when player has focus

```html
<!-- Document shortcuts via aria-keyshortcuts -->
<button aria-keyshortcuts="k Space" aria-label="Play">
```

---

## Control Bar

Use toolbar pattern with roving tabindex:

```html
<div role="toolbar" aria-label="Video controls" aria-orientation="horizontal">
  <button tabindex="0" aria-label="Play" aria-pressed="false">▶</button>
  <button tabindex="-1" aria-label="Mute" aria-pressed="false">🔊</button>
  <div role="slider" tabindex="-1" aria-label="Seek">...</div>
  <div role="slider" tabindex="-1" aria-label="Volume">...</div>
  <button tabindex="-1" aria-label="Fullscreen">⛶</button>
</div>
```

**Navigation:**
- `Tab` enters/exits toolbar (single stop)
- `←` `→` moves between controls
- `Enter`/`Space` activates control

---

## Control Components

### Play/Pause Button

```
role="button"
aria-pressed="{isPlaying}"
aria-label="Play"
aria-keyshortcuts="k Space"
```

**Important:** Use `aria-pressed` for toggle state. Don't change `aria-label` between "Play"/"Pause".

### Mute Button

```
role="button"
aria-pressed="{isMuted}"
aria-label="Mute"
aria-keyshortcuts="m"
```

### Time Slider (Seek/Scrubber)

```
role="slider"
aria-label="Seek"
aria-valuemin="0"
aria-valuemax="{duration}"
aria-valuenow="{currentTime}"
aria-valuetext="2 minutes 30 seconds of 10 minutes"
aria-orientation="horizontal"
```

**Key behavior:**
- `←` `→`: Seek by step (5 seconds)
- `PageUp` `PageDown`: Seek by large step (10%)
- `Home` `End`: Start/end of video
- `Shift+Arrow`: Larger increment

### Volume Slider

```
role="slider"
aria-label="Volume"
aria-valuemin="0"
aria-valuemax="100"
aria-valuenow="{volume}"
aria-valuetext="{volume} percent"
aria-orientation="horizontal"
```

### Fullscreen Button

```
role="button"
aria-label="Enter fullscreen" | "Exit fullscreen"
aria-keyshortcuts="f"
```

**Note:** Label change is acceptable here (not a toggle state).

### Captions Button

```
role="button"
aria-pressed="{captionsEnabled}"
aria-label="Closed captions"
aria-keyshortcuts="c"
```

---

## Settings Menu

### Menu Structure

```html
<button 
  aria-haspopup="menu" 
  aria-expanded="{isOpen}"
  aria-controls="settings-menu"
  aria-label="Settings"
>
  ⚙
</button>

<div role="menu" id="settings-menu" aria-label="Settings">
  <div role="group" aria-label="Quality">
    <div role="menuitemradio" aria-checked="false">480p</div>
    <div role="menuitemradio" aria-checked="true">720p</div>
    <div role="menuitemradio" aria-checked="false">1080p</div>
  </div>
  <div role="group" aria-label="Playback speed">
    <div role="menuitemradio" aria-checked="false">0.5x</div>
    <div role="menuitemradio" aria-checked="true">1x</div>
    <div role="menuitemradio" aria-checked="false">2x</div>
  </div>
</div>
```

### Menu Keyboard Navigation

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate items |
| `Enter` `Space` | Select item |
| `Escape` | Close menu |
| `Home` `End` | First/last item |
| Alphanumeric | Type-ahead |

---

## Live Announcements

### Announcer Component

Create a dedicated live region for status messages:

```html
<div 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
  class="visually-hidden"
>
  <!-- Updated programmatically -->
</div>
```

### Events to Announce

| Event | Message | Priority |
|-------|---------|----------|
| Play | "Playing" | polite |
| Pause | "Paused" | polite |
| Volume change | "Volume {n} percent" | polite |
| Mute | "Muted" | polite |
| Unmute | "Unmuted" | polite |
| Seek | "Seeking to {time}" | polite |
| Captions on | "Captions on" | polite |
| Captions off | "Captions off" | polite |
| Fullscreen enter | "Entered fullscreen" | polite |
| Fullscreen exit | "Exited fullscreen" | polite |
| Quality change | "Quality: {level}" | polite |
| Playback rate | "Speed: {rate}x" | polite |
| Buffering | "Buffering" | polite |
| Error | "Error: {message}" | **assertive** |

---

## Captions

### CVAA Compliance Requirements

Users must be able to customize:
- Font family
- Font size
- Font color
- Background color
- Background opacity
- Edge/outline style
- Window color

### Caption Settings UI

```html
<div role="menu" aria-label="Caption settings">
  <div role="menuitem" aria-haspopup="dialog">Font size</div>
  <div role="menuitem" aria-haspopup="dialog">Font color</div>
  <div role="menuitem" aria-haspopup="dialog">Background</div>
  <!-- etc. -->
</div>
```

### Caption Display Considerations

- Captions must not overlap controls
- Position should adapt when controls show/hide
- User preferences must persist across sessions
- Support VTT, SRT at minimum

---

## Audio Tracks

### Track Selection UI

```html
<div role="listbox" aria-label="Audio track">
  <div role="option" aria-selected="true">English</div>
  <div role="option" aria-selected="false">Spanish</div>
  <div role="option" aria-selected="false">English (Audio Description)</div>
</div>
```

Audio description tracks should be clearly labeled.

---

## Chapter Navigation

```html
<div role="listbox" aria-label="Chapters">
  <div role="option" aria-selected="true" aria-current="true">
    Introduction (0:00)
  </div>
  <div role="option" aria-selected="false">
    Getting Started (2:30)
  </div>
  <div role="option" aria-selected="false">
    Advanced Topics (15:00)
  </div>
</div>
```

`aria-current="true"` indicates the currently playing chapter.

---

## Live/Streaming Indicator

```html
<button 
  aria-label="Go to live"
  aria-hidden="{!isLive}"
>
  <span aria-hidden="true">●</span> LIVE
</button>
```

For live streams, indicate:
- Whether currently at live edge
- Option to jump to live edge

---

## Focus Management

### After Fullscreen

When exiting fullscreen, return focus to:
1. The fullscreen button
2. Or the last focused control

### Menu Close

When closing settings menu:
1. Return focus to settings button
2. Keep user in control bar context

### Control Bar Hide/Show

When controls auto-hide:
- Keep focus on last active control
- Don't trap focus on hidden elements
- Re-show controls on `Tab` key

---

## Reduced Motion

Respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .player-animation {
    animation: none;
    transition: none;
  }
}
```

Consider:
- Disable auto-playing animations
- Reduce or remove control transitions
- Pause decorative motion

---

## Color Contrast

| Element | Minimum Ratio |
|---------|---------------|
| Control icons/text | 4.5:1 |
| UI components | 3:1 |
| Focus indicators | 3:1 |
| Caption text | 4.5:1 |

Test against video content backgrounds, not just static backgrounds.

---

## Data Attributes for Styling

Expose player state for CSS without ARIA pollution:

| Attribute | Values |
|-----------|--------|
| `data-state` | playing, paused, waiting, ended |
| `data-fullscreen` | present when fullscreen |
| `data-captions` | present when captions visible |
| `data-user-idle` | present when controls should hide |
| `data-muted` | present when muted |
| `data-live` | present for live streams |
| `data-at-live-edge` | present when at live edge |

```css
[data-state="playing"] .play-icon { display: none; }
[data-state="paused"] .pause-icon { display: none; }
[data-user-idle] .controls { opacity: 0; pointer-events: none; }
```

---

## WCAG Criteria for Media

| Criterion | Level | Requirement |
|-----------|-------|-------------|
| 1.2.1 | A | Provide text alternative or audio track |
| 1.2.2 | A | Synchronized captions for prerecorded |
| 1.2.3 | A | Audio description for prerecorded |
| 1.2.5 | AA | Audio description for prerecorded |
| 1.4.2 | A | Audio control (pause, stop, or mute) |
| 2.1.1 | A | All functionality keyboard accessible |
| 2.1.2 | A | No keyboard trap |
| 2.2.2 | A | Pause, stop, hide for moving content |
| 2.3.1 | A | No content flashes more than 3x/second |
| 4.1.2 | A | Name, role, value for all UI components |
