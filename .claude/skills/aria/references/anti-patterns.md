# Accessibility Anti-Patterns

Common mistakes that harm accessibility. For correct patterns, see linked references.

---

## Focus

### Removing Focus Indicators

Never remove focus outlines without a visible replacement.

See [focus.md](focus.md) for focus indicator requirements.

### Focus Traps Without Escape

Modal contexts must allow `Escape` to exit. A focus trap with no exit is a keyboard trap (WCAG 2.1.2 violation).

### Positive Tabindex

```html
<!-- Never: disrupts natural tab order -->
<button tabindex="5">First</button>
<button tabindex="1">Second</button>
```

Use DOM order or `tabindex="0"`. Positive values create unpredictable navigation.

---

## ARIA

### ARIA on Native Elements

```html
<!-- Redundant -->
<button role="button">Click</button>

<!-- Unnecessary -->
<div role="button" tabindex="0">Click</div>
```

Native elements have implicit roles and built-in keyboard handling. See [aria.md](aria.md) First Rule of ARIA.

### Invalid ARIA Usage

```html
<!-- aria-expanded on non-expandable -->
<input type="text" aria-expanded="false" />

<!-- aria-pressed on navigation link -->
<a href="/home" aria-pressed="false">Home</a>

<!-- aria-hidden on focusable element -->
<button aria-hidden="true">Hidden but focusable</button>
```

ARIA attributes must match the element's actual behavior.

### Missing Required Attributes

```html
<!-- Incomplete slider -->
<div role="slider" tabindex="0"></div>

<!-- Complete slider -->
<div role="slider" tabindex="0" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div>
```

See [aria.md](aria.md) for required attributes by role.

### Duplicate IDs

```html
<label id="name">Name</label>
<input aria-labelledby="name" />

<label id="name">Email</label>
<!-- Duplicate! -->
<input aria-labelledby="name" />
<!-- Points to wrong label -->
```

IDs must be unique. Duplicate IDs break ARIA relationships.

---

## Keyboard

### Click-Only Handlers

Interactive elements must respond to keyboard. Use native `<button>` or `<a href>` which include keyboard handling.

See [keyboard.md](keyboard.md) for non-semantic element handling.

### Missing Roving Tabindex

```html
<!-- Wrong: all items in tab order -->
<div role="toolbar">
  <button tabindex="0">Bold</button>
  <button tabindex="0">Italic</button>
</div>

<!-- Correct: one tab stop, arrows navigate -->
<div role="toolbar">
  <button tabindex="0">Bold</button>
  <button tabindex="-1">Italic</button>
</div>
```

Composite widgets (toolbars, menus, tabs) need roving tabindex. See [keyboard.md](keyboard.md).

### Conflicting Shortcuts

Avoid keys used by assistive technology:

- `Insert` — NVDA/JAWS modifier
- `Caps Lock` — VoiceOver modifier
- Single letters without focus — interfere with browse mode

Use standard keys: `Enter`, `Space`, `Escape`, `Arrow keys`.

---

## Live Regions

### Assertive for Non-Critical Updates

```html
<!-- Wrong: interrupts user -->
<div aria-live="assertive">Items loaded</div>

<!-- Correct: waits for pause -->
<div aria-live="polite">Items loaded</div>
```

Reserve `assertive` for errors and urgent alerts only.

### Region Not in DOM on Load

```html
<!-- Wrong: region added dynamically -->
<!-- (Screen readers may miss first announcement) -->

<!-- Correct: always in DOM, content changes -->
<div role="alert" aria-live="assertive"></div>
```

Live regions must exist in DOM before content updates.

### Too Many Regions

```html
<!-- Wrong: competing announcements -->
<div aria-live="polite">Status 1</div>
<div aria-live="polite">Status 2</div>
<div aria-live="polite">Status 3</div>

<!-- Correct: single region -->
<div aria-live="polite" aria-atomic="true"></div>
```

Use one live region per announcement type. Combine messages if needed.

---

## Content

### Images Without Alt Text

```html
<!-- Missing -->
<img src="logo.png" />

<!-- Useless -->
<img src="logo.png" alt="image" />

<!-- Descriptive -->
<img src="logo.png" alt="Video.js logo" />

<!-- Decorative -->
<img src="decorative.png" alt="" />
```

See [aria.md](aria.md) images section.

### Empty Interactive Elements

```html
<!-- No accessible name -->
<button><svg>...</svg></button>

<!-- Has accessible name -->
<button aria-label="Close"><svg aria-hidden="true">...</svg></button>
```

Every interactive element needs an accessible name.

### Color as Only Indicator

```html
<!-- Color only -->
<span style="color: red">Error</span>

<!-- Color plus text/icon -->
<span style="color: red">Error: Invalid input</span>
```

Information must not rely on color alone (WCAG 1.4.1).

---

## Motion

### No Reduced Motion Support

```css
.element {
  animation: bounce 1s infinite;
}

@media (prefers-reduced-motion: reduce) {
  .element {
    animation: none;
  }
}
```

Always respect `prefers-reduced-motion`.

### Auto-Playing Media

```html
<!-- Problematic -->
<video autoplay>...</video>

<!-- Acceptable -->
<video autoplay muted>...</video>
<video controls>...</video>
```

Auto-playing audio disrupts screen reader users. Mute by default or require user initiation.

---

## See Also

- [focus.md](focus.md) — correct focus patterns
- [keyboard.md](keyboard.md) — keyboard navigation
- [aria.md](aria.md) — roles, states, properties
- [checklist.md](../review/checklist.md) — comprehensive review checklist
