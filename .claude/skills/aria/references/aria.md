# ARIA Patterns

Roles, states, properties, labeling strategies, and live regions.

---

## First Rule of ARIA

**Use native HTML elements when possible.**

```html
<!-- ❌ ARIA recreation -->
<div role="button" tabindex="0">Submit</div>

<!-- ✅ Native element -->
<button>Submit</button>
```

ARIA adds semantics but not behavior. Native elements include keyboard handling, form integration, and browser defaults.

---

## Roles by Component

### Buttons

| Type | Role | Key Attributes |
|------|------|----------------|
| Action | `button` | — |
| Toggle | `button` | `aria-pressed` |
| Menu trigger | `button` | `aria-haspopup`, `aria-expanded` |

### Menus

| Element | Role | Required Attributes |
|---------|------|---------------------|
| Container | `menu` | — |
| Action item | `menuitem` | — |
| Toggle item | `menuitemcheckbox` | `aria-checked` |
| Radio item | `menuitemradio` | `aria-checked` |
| Submenu trigger | `menuitem` | `aria-haspopup`, `aria-expanded` |
| Separator | `separator` | — |

### Dialogs

| Type | Role | Required Attributes |
|------|------|---------------------|
| Dialog | `dialog` | `aria-labelledby`, `aria-modal` |
| Alert dialog | `alertdialog` | `aria-labelledby`, `aria-describedby`, `aria-modal` |

### Lists

| Element | Role | Required Attributes |
|---------|------|---------------------|
| Listbox | `listbox` | `aria-label` or `aria-labelledby` |
| Option | `option` | `aria-selected` |
| Combobox | `combobox` | `aria-expanded`, `aria-controls` |

### Tabs

| Element | Role | Required Attributes |
|---------|------|---------------------|
| Tab list | `tablist` | `aria-label` |
| Tab | `tab` | `aria-selected`, `aria-controls` |
| Tab panel | `tabpanel` | `aria-labelledby` |

### Sliders

| Attribute | Required |
|-----------|----------|
| `role="slider"` | ✅ |
| `aria-valuemin` | ✅ |
| `aria-valuemax` | ✅ |
| `aria-valuenow` | ✅ |
| `aria-valuetext` | ✅ (human-readable) |
| `aria-label` | ✅ |
| `aria-orientation` | If not horizontal |

---

## Required Attributes by Role

Roles have required attributes. Missing them is a **moderate** violation.

| Role | Required Attributes |
|------|---------------------|
| `checkbox` | `aria-checked` |
| `combobox` | `aria-expanded`, `aria-controls` |
| `heading` | `aria-level` |
| `listbox` | — |
| `option` | `aria-selected` |
| `radio` | `aria-checked` |
| `scrollbar` | `aria-controls`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| `slider` | `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| `spinbutton` | `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| `switch` | `aria-checked` |
| `tab` | `aria-selected` |
| `tabpanel` | — |
| `tree` | — |
| `treeitem` | — |

---

## State Attributes

### Toggle State (`aria-pressed`)

For buttons that toggle between two states:

```html
<!-- Mute button -->
<button aria-pressed="false" aria-label="Mute">🔊</button>
<button aria-pressed="true" aria-label="Mute">🔇</button>
```

**Keep label constant.** State conveyed by `aria-pressed`, not by changing the label.

### Expanded State (`aria-expanded`)

For elements that show/hide content:

```html
<button aria-expanded="false" aria-controls="menu">Options</button>
<div id="menu" hidden>...</div>
```

### Selected State (`aria-selected`)

Within selection widgets:

```html
<div role="listbox">
  <div role="option" aria-selected="true">Option 1</div>
  <div role="option" aria-selected="false">Option 2</div>
</div>
```

### Checked State (`aria-checked`)

For checkboxes and radio items:

| Value | Meaning |
|-------|---------|
| `true` | Checked |
| `false` | Unchecked |
| `mixed` | Indeterminate (checkbox only) |

### Current State (`aria-current`)

Indicates current item in a set:

| Value | Use Case |
|-------|----------|
| `page` | Current page in navigation |
| `step` | Current step in wizard |
| `location` | Current location in breadcrumb |
| `date` | Current date in calendar |
| `time` | Current time in timeline |
| `true` | Generic current item |

---

## Labeling

### Priority Order

1. **Visible label** — `<label>` or text content
2. **`aria-labelledby`** — Reference visible text
3. **`aria-label`** — When no visible label possible
4. **`title`** — Last resort

### aria-label vs aria-labelledby

| Attribute | Source | Use When |
|-----------|--------|----------|
| `aria-label` | String value | No visible label exists |
| `aria-labelledby` | ID reference | Visible text exists elsewhere |

```html
<!-- aria-label: invisible label -->
<button aria-label="Close">×</button>

<!-- aria-labelledby: reuse visible text -->
<h2 id="section-title">Settings</h2>
<div role="region" aria-labelledby="section-title">...</div>
```

### Describing vs Labeling

| Attribute | Purpose | Announced |
|-----------|---------|-----------|
| `aria-label` | Name | First |
| `aria-labelledby` | Name (from visible) | First |
| `aria-describedby` | Additional info | After name/role |

```html
<button 
  aria-label="Delete"
  aria-describedby="delete-warning"
>
  🗑
</button>
<span id="delete-warning" hidden>This action cannot be undone</span>
```

### Combining Labels

Multiple IDs create combined label:

```html
<button aria-labelledby="action-label item-name">
  <span id="action-label">Delete</span>
</button>
<span id="item-name">Project Alpha</span>
<!-- Announced: "Delete Project Alpha" -->
```

---

## Images

### Decorative

```html
<img src="decoration.png" alt="" />
<!-- or -->
<img src="decoration.png" aria-hidden="true" />
<!-- or -->
<svg aria-hidden="true">...</svg>
```

### Informative

```html
<img src="chart.png" alt="Sales increased 25% in Q3" />
```

### Functional (in buttons/links)

```html
<button aria-label="Search">
  <svg aria-hidden="true">...</svg>
</button>
```

Label goes on interactive element, icon is hidden from AT.

---

## Live Regions

Announce dynamic content changes to screen readers.

### Roles

| Role | Behavior | Use For |
|------|----------|---------|
| `status` | Polite | Status messages, success |
| `alert` | Assertive | Errors, warnings |
| `log` | Polite | Chat, activity feed |
| `timer` | — | Countdown (typically polite) |
| `marquee` | Off | Stock ticker (user polls) |

### Politeness

| Value | Behavior |
|-------|----------|
| `off` | Not announced |
| `polite` | Wait for pause in speech |
| `assertive` | Interrupt immediately |

### Setup Pattern

```html
<!-- Create empty on page load -->
<div role="status" aria-live="polite" aria-atomic="true"></div>

<!-- Update content to trigger announcement -->
<script>
  region.textContent = 'File saved successfully';
</script>
```

### Key Attributes

| Attribute | Purpose |
|-----------|---------|
| `aria-live` | Politeness level |
| `aria-atomic` | Announce entire region vs changes |
| `aria-relevant` | What changes to announce |

### aria-atomic

| Value | Behavior |
|-------|----------|
| `true` | Announce entire region content |
| `false` | Announce only changed nodes |

### aria-relevant

| Value | Announces |
|-------|-----------|
| `additions` | New nodes |
| `removals` | Removed nodes |
| `text` | Text changes |
| `all` | Everything |

Default: `additions text`

---

## Hiding Content

### From Everyone

```css
display: none;
visibility: hidden;
```

Element not rendered, not focusable, not announced.

### From Screen Readers Only

```html
<div aria-hidden="true">Decorative content</div>
```

Visible but not announced. **Never use on focusable elements.**

### Visually Hidden (Screen Reader Only)

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

Not visible but announced. Use for screen-reader-only text.

---

## Data Attributes for Styling

Expose state for CSS without ARIA pollution:

| Data Attribute | Instead Of |
|----------------|------------|
| `data-state="open"` | `aria-expanded` selector |
| `data-disabled` | `aria-disabled` selector |
| `data-selected` | `aria-selected` selector |
| `data-focus-visible` | `:focus` when keyboard |

```css
/* ✅ Use data attributes */
[data-state="open"] { display: block; }

/* ❌ Don't style based on ARIA */
[aria-expanded="true"] { display: block; }
```

ARIA conveys semantics to AT. Data attributes drive styling.
