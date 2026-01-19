# Focus Management Patterns

Focus visibility, trapping, restoration, and scope management.

---

## Focus Visible

Distinguish keyboard focus from pointer focus.

### CSS Approach

```css
/* Remove default for pointer users */
:focus {
  outline: none;
}

/* Show only for keyboard users */
:focus-visible {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}
```

### Data Attribute Approach

For broader browser support or custom styling:

```css
[data-focus-visible] {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}
```

Track input modality globally:
- Set flag `true` on keyboard events
- Set flag `false` on pointer events
- Apply `data-focus-visible` on focus if flag is true

### Anti-Pattern

```css
/* ❌ Never do this */
:focus {
  outline: none;
}

/* ❌ Or this */
* {
  outline: 0 !important;
}
```

**WCAG 2.4.7**: Focus must be visible. Removing outline without replacement is a serious violation.

---

## Focus Indicators

### Minimum Requirements

| Requirement | Value |
|-------------|-------|
| Contrast ratio | 3:1 against adjacent colors |
| Visibility | Must not rely on color alone |
| Size | Perimeter ≥ 2px or area change |

### Recommended Styles

```css
/* Solid outline */
:focus-visible {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}

/* With background */
:focus-visible {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
  background-color: rgba(0, 95, 204, 0.1);
}

/* Ring style */
:focus-visible {
  box-shadow: 0 0 0 3px rgba(0, 95, 204, 0.5);
}
```

---

## Focus Trapping

Contain focus within a region (dialogs, modals).

### When to Trap

- Modal dialogs (`role="dialog"` with `aria-modal="true"`)
- Alert dialogs
- Full-screen overlays

### Implementation Rules

1. Find all focusable elements within container
2. On `Tab` at last element → focus first element
3. On `Shift+Tab` at first element → focus last element
4. On `Escape` → close and restore focus

### Focusable Elements Query

```js
const focusableSelectors = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');
```

### Inert Background

While dialog is open, background content should be inert:

```html
<body>
  <div aria-hidden="true" inert>
    <!-- Main content hidden from AT -->
  </div>
  <div role="dialog" aria-modal="true">
    <!-- Dialog receives focus -->
  </div>
</body>
```

---

## Focus Restoration

Return focus to trigger element after closing overlays.

### Pattern

1. Store `document.activeElement` before opening
2. Open overlay, move focus into it
3. On close, call `.focus()` on stored element
4. If element no longer exists, focus logical fallback

### Fallback Strategy

| Scenario | Fallback |
|----------|----------|
| Trigger removed | Parent container |
| Parent removed | Main content area |
| Delete action | Next item in list |
| Form submit | First form field or success message |

---

## Focus Scope

Manage focus within a subtree without full trapping.

### Use Cases

- Popovers (focus can leave, but has boundaries)
- Menus (focus within, Escape exits)
- Toolbar groups

### Auto-Focus on Mount

Move focus into container when it appears:

```html
<div role="menu" aria-label="Options">
  <!-- First item auto-focused -->
  <div role="menuitem" tabindex="0">Option 1</div>
  <div role="menuitem" tabindex="-1">Option 2</div>
</div>
```

---

## Focusable vs Tabbable

| State | Meaning |
|-------|---------|
| **Focusable** | Can receive focus (programmatically or via click) |
| **Tabbable** | In tab order (reachable via Tab key) |

### Default Behavior

| Element | Focusable | Tabbable |
|---------|-----------|----------|
| `<button>` | ✅ | ✅ |
| `<a href>` | ✅ | ✅ |
| `<input>` | ✅ | ✅ |
| `<div>` | ❌ | ❌ |
| `<div tabindex="0">` | ✅ | ✅ |
| `<div tabindex="-1">` | ✅ | ❌ |
| `<button disabled>` | ❌ | ❌ |
| `visibility: hidden` | ❌ | ❌ |
| `display: none` | ❌ | ❌ |

### Tabindex Values

| Value | Behavior |
|-------|----------|
| `0` | In natural tab order |
| `-1` | Focusable programmatically only |
| `> 0` | **❌ Anti-pattern** — breaks natural order |

---

## Focus Order (WCAG 2.4.3)

Focus order must be logical and predictable.

### Rules

- Follow visual/reading order
- Don't jump unexpectedly
- Group related controls
- Maintain order after DOM changes

### Common Violations

| Issue | Problem |
|-------|---------|
| Positive tabindex | Creates unpredictable order |
| CSS reordering | Visual order ≠ DOM order |
| Dynamic insertion | New content at wrong position |
| Modals without trapping | Focus escapes to background |

---

## Managing Focus with Portals

When content renders outside DOM hierarchy:

### ARIA Relationships

```html
<!-- Trigger in main DOM -->
<button 
  aria-haspopup="dialog"
  aria-expanded="true"
  aria-controls="portal-dialog"
>
  Open
</button>

<!-- Dialog in portal -->
<div id="portal-dialog" role="dialog" aria-modal="true">
  ...
</div>
```

### Focus Management

1. Move focus into portal on open
2. Trap focus within portal
3. Return focus to trigger on close
4. Use `aria-controls` to maintain relationship

---

## Skip Links

Allow keyboard users to bypass repetitive content.

### Implementation

```html
<body>
  <a href="#main-content" class="skip-link">
    Skip to main content
  </a>
  <nav>...</nav>
  <main id="main-content" tabindex="-1">
    ...
  </main>
</body>
```

### Styling

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px;
  background: #000;
  color: #fff;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

`tabindex="-1"` on target ensures it receives focus when linked to.
