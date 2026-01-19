# Keyboard Navigation Patterns

Keyboard interaction patterns for accessible components.

---

## Activation Keys

| Element Type | Keys | Notes |
|--------------|------|-------|
| Button | `Enter`, `Space` | Both must work |
| Link | `Enter` | Space scrolls page |
| Checkbox | `Space` | Toggle checked |
| Radio | `Space`, Arrows | Space selects, arrows move |
| Menu item | `Enter`, `Space` | Activates item |

---

## Arrow Key Patterns

| Widget | Horizontal | Vertical |
|--------|------------|----------|
| Toolbar | ← → | — |
| Menu | — | ↑ ↓ |
| Menubar | ← → | ↑ ↓ (submenus) |
| Tabs | ← → | — |
| Listbox | — | ↑ ↓ |
| Grid | ← → | ↑ ↓ |
| Radio group | ← → or ↑ ↓ | Layout-dependent |
| Slider | ← → or ↑ ↓ | Orientation-dependent |
| Tree | ← → (expand) | ↑ ↓ (navigate) |

---

## Universal Keys

| Key | Action |
|-----|--------|
| `Tab` | Next focusable element |
| `Shift+Tab` | Previous focusable element |
| `Escape` | Close/dismiss current context |
| `Home` | First item in group |
| `End` | Last item in group |
| `PageUp` | Large step up/back |
| `PageDown` | Large step down/forward |

---

## Roving Tabindex

Use for composite widgets where only one item is in tab order.

**Applies to:** Toolbars, tab lists, menu bars, radio groups, listboxes, trees

**Rules:**
- Container not in tab order
- Active item: `tabindex="0"`
- Other items: `tabindex="-1"`
- Arrow keys move focus AND update tabindex

```html
<div role="toolbar" aria-label="Formatting">
  <button tabindex="0">Bold</button>
  <button tabindex="-1">Italic</button>
  <button tabindex="-1">Underline</button>
</div>
```

---

## Widget Keyboard Reference

### Menu

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate items |
| `Enter` `Space` | Activate item |
| `Escape` | Close menu |
| `Home` `End` | First/last item |
| `→` | Open submenu (LTR) |
| `←` | Close submenu (LTR) |
| Alphanumeric | Type-ahead jump |

### Tabs

| Key | Action |
|-----|--------|
| `←` `→` | Navigate tabs |
| `Tab` | Move to panel (exit tablist) |
| `Home` `End` | First/last tab |

### Slider

| Key | Action |
|-----|--------|
| `←` `↓` | Decrease by step |
| `→` `↑` | Increase by step |
| `PageDown` | Decrease by large step |
| `PageUp` | Increase by large step |
| `Home` | Set to minimum |
| `End` | Set to maximum |

### Dialog

| Key | Action |
|-----|--------|
| `Tab` | Cycle through focusable elements (trapped) |
| `Escape` | Close dialog |

### Listbox

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate options |
| `Enter` `Space` | Select option |
| `Home` `End` | First/last option |
| Alphanumeric | Type-ahead jump |

### Tree

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate items |
| `→` | Expand node / move to first child |
| `←` | Collapse node / move to parent |
| `Enter` `Space` | Activate item |
| `Home` `End` | First/last visible item |
| `*` | Expand all siblings |

---

## Non-Semantic Element Handling

When using `<div>` or `<span>` as interactive elements:

```html
<!-- ❌ Missing keyboard support -->
<div onClick={handleClick}>Click me</div>

<!-- ✅ Full keyboard support -->
<div 
  role="button"
  tabindex="0"
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  Click me
</div>

<!-- ✅ Better: use native element -->
<button onClick={handleClick}>Click me</button>
```

---

## Link Requirements

Links must have:
- `href` attribute (even if `#` for SPA routing)
- Activates on `Enter` only (not Space)

```html
<!-- ❌ Not a real link -->
<a onClick={navigate}>Go somewhere</a>

<!-- ❌ Looks like link, acts like button -->
<a href="#" onClick={handleAction}>Do something</a>

<!-- ✅ Real navigation -->
<a href="/page">Go to page</a>

<!-- ✅ Action should be button -->
<button onClick={handleAction}>Do something</button>
```
