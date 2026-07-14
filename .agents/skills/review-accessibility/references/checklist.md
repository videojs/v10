# Accessibility Review Checklist

Comprehensive checklist for reviewing components. Use for manual audits or as rules for automated linting.

---

## All Interactive Elements

### Accessible Name (WCAG 4.1.2)

- [ ] Has visible label, `aria-label`, or `aria-labelledby`
- [ ] Label accurately describes purpose
- [ ] Label is concise (1-3 words for buttons)
- [ ] Icon-only buttons have `aria-label`

**Detection:** Element with `role` or interactive tag has empty accessible name

```
❌ <button><svg>...</svg></button>
✅ <button aria-label="Close"><svg>...</svg></button>
```

### Keyboard Access (WCAG 2.1.1)

- [ ] Focusable via Tab (or arrow keys in composite widgets)
- [ ] Responds to expected keys (Enter, Space, arrows)
- [ ] No mouse-only interactions

**Detection:** `onClick` without `onKeyDown`, or non-button element with click handler

```
❌ <div onClick={handleClick}>Click me</div>
✅ <button onClick={handleClick}>Click me</button>
```

### Links (WCAG 4.1.2)

- [ ] Has `href` attribute
- [ ] Has accessible name (text content or `aria-label`)
- [ ] Uses `<button>` instead if action doesn't navigate

**Detection:** `<a>` without `href`, or `<a href="#">` with only click handler

```
❌ <a onClick={doAction}>Submit</a>
❌ <a href="#">Submit</a>  <!-- if not navigating -->
✅ <a href="/page">Go to page</a>
✅ <button onClick={doAction}>Submit</button>
```

### Focus Indicator (WCAG 2.4.7)

- [ ] Visible focus style when focused via keyboard
- [ ] Focus indicator has 3:1 contrast minimum
- [ ] Not removed via `outline: none` without replacement

**Detection:** CSS contains `outline: none` or `outline: 0` without `:focus-visible` rule

```
❌ :focus { outline: none; }
✅ :focus-visible { outline: 2px solid #005fcc; }
```

### Proper Role (WCAG 4.1.2)

- [ ] Native element used when possible (`<button>`, `<a>`)
- [ ] Custom element has appropriate `role`
- [ ] Role matches interaction pattern
- [ ] Role has all required attributes

**Detection:** Click handler on `<div>` or `<span>` without `role="button"`

**Detection:** Role present but missing required attributes

| Role | Required Attributes |
|------|---------------------|
| `checkbox` | `aria-checked` |
| `combobox` | `aria-expanded`, `aria-controls` |
| `option` | `aria-selected` |
| `radio` | `aria-checked` |
| `slider` | `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| `switch` | `aria-checked` |
| `tab` | `aria-selected` |

```
❌ <div role="checkbox">Accept terms</div>
✅ <div role="checkbox" aria-checked="false">Accept terms</div>
```

---

## Buttons

### Standard Buttons

- [ ] Uses `<button>` element or `role="button"`
- [ ] Has accessible name
- [ ] Responds to Enter and Space
- [ ] Has `type="button"` if not submitting form

### Toggle Buttons

- [ ] Has `aria-pressed` attribute
- [ ] `aria-pressed` reflects current state
- [ ] Label remains constant (doesn't change with state)
- [ ] State change announced to screen readers

**Detection:** Button with dynamic `aria-label` based on state

```
❌ aria-label={isActive ? 'Deactivate' : 'Activate'}
✅ aria-label="Toggle" aria-pressed={isActive}
```

### Menu Buttons

- [ ] Has `aria-haspopup="menu"` or `"true"`
- [ ] Has `aria-expanded` reflecting menu state
- [ ] Has `aria-controls` pointing to menu ID
- [ ] Opens on Enter, Space, ArrowDown

---

## Menus

### Menu Container

- [ ] Has `role="menu"`
- [ ] Has `aria-label` or `aria-labelledby`
- [ ] Focus moves into menu when opened

### Menu Items

- [ ] Each item has appropriate role:
  - `menuitem` for actions
  - `menuitemcheckbox` for toggles
  - `menuitemradio` for exclusive options
- [ ] Checkbox/radio items have `aria-checked`
- [ ] Disabled items have `aria-disabled="true"`

### Menu Keyboard

- [ ] Arrow keys navigate between items
- [ ] Enter/Space activates item
- [ ] Escape closes menu
- [ ] Home/End go to first/last item
- [ ] Type-ahead jumps to matching item
- [ ] Tab closes menu (doesn't trap)

### Menu Focus

- [ ] Focus trapped within open menu
- [ ] Focus returns to trigger on close
- [ ] Implements roving tabindex

---

## Dialogs

### Dialog Container

- [ ] Has `role="dialog"` or `role="alertdialog"`
- [ ] Has `aria-modal="true"`
- [ ] Has `aria-labelledby` pointing to title
- [ ] Has `aria-describedby` if description exists

### Dialog Behavior

- [ ] Focus moves into dialog on open
- [ ] Focus trapped within dialog
- [ ] Escape closes dialog (unless alert)
- [ ] Focus returns to trigger on close
- [ ] Background content is inert (`aria-hidden` or `inert`)

---

## Sliders

### Slider Attributes

- [ ] Has `role="slider"`
- [ ] Has `aria-valuemin`
- [ ] Has `aria-valuemax`
- [ ] Has `aria-valuenow`
- [ ] Has `aria-valuetext` with human-readable value
- [ ] Has `aria-label` or `aria-labelledby`
- [ ] Has `aria-orientation` if vertical

**Detection:** Slider without `aria-valuetext`

```
❌ aria-valuenow={50}
✅ aria-valuenow={50} aria-valuetext="50 percent"
```

### Slider Keyboard

- [ ] Arrow keys change value by step
- [ ] PageUp/PageDown change by large step
- [ ] Home sets to minimum
- [ ] End sets to maximum

---

## Tabs

### Tab List

- [ ] Container has `role="tablist"`
- [ ] Has `aria-label` describing purpose
- [ ] Implements roving tabindex

### Individual Tabs

- [ ] Each tab has `role="tab"`
- [ ] Has `aria-selected` (true/false)
- [ ] Has `aria-controls` pointing to panel ID
- [ ] Disabled tabs have `aria-disabled`

### Tab Panels

- [ ] Each panel has `role="tabpanel"`
- [ ] Has `aria-labelledby` pointing to tab ID
- [ ] Hidden panels have `hidden` or `display: none`

### Tab Keyboard

- [ ] Arrow keys move between tabs
- [ ] Tab moves to panel content (single stop in tablist)
- [ ] Home/End go to first/last tab

---

## Listboxes

### Listbox Container

- [ ] Has `role="listbox"`
- [ ] Has `aria-label` or `aria-labelledby`
- [ ] Has `aria-multiselectable` if multi-select

### Options

- [ ] Each option has `role="option"`
- [ ] Has `aria-selected` (true/false)
- [ ] Disabled options have `aria-disabled`

### Listbox Keyboard

- [ ] Arrow keys navigate options
- [ ] Enter/Space selects option
- [ ] Type-ahead jumps to matching option
- [ ] Home/End go to first/last option

---

## Forms

### Form Labels

- [ ] All inputs have associated label
- [ ] `<label for>` or `aria-labelledby`
- [ ] Required fields have `aria-required`
- [ ] Invalid fields have `aria-invalid`

### Form Errors

- [ ] Error messages linked via `aria-describedby`
- [ ] Errors announced via live region
- [ ] Focus moves to first error on submit

### Form Groups

- [ ] Related inputs grouped with `<fieldset>`
- [ ] Group has `<legend>` or `aria-label`
- [ ] Radio groups use `role="radiogroup"`

---

## Live Regions

### Configuration

- [ ] Region exists in DOM before content updates
- [ ] Has `role="status"`, `"alert"`, or `"log"`
- [ ] Has `aria-live="polite"` or `"assertive"`
- [ ] Has `aria-atomic="true"` if announcing entire region

### Usage

- [ ] Status updates use `polite`
- [ ] Errors/urgent messages use `assertive`
- [ ] Not overused (causes noise)

---

## Images

### Decorative Images

- [ ] Has `aria-hidden="true"` or `role="presentation"`
- [ ] Or empty `alt=""`

### Informative Images

- [ ] Has descriptive `alt` text
- [ ] `alt` conveys equivalent information
- [ ] Not overly verbose

### Functional Images (links, buttons)

- [ ] `alt` describes action, not image
- [ ] e.g., `alt="Search"` not `alt="Magnifying glass"`

---

## Color and Contrast

### Text Contrast (WCAG 1.4.3)

- [ ] Normal text: 4.5:1 minimum
- [ ] Large text (18pt+, or 14pt bold): 3:1 minimum

### UI Component Contrast (WCAG 1.4.11)

- [ ] Interactive component boundaries: 3:1
- [ ] Focus indicators: 3:1
- [ ] Icons conveying information: 3:1

### Color Independence (WCAG 1.4.1)

- [ ] Information not conveyed by color alone
- [ ] Additional indicator (icon, text, pattern)

---

## Touch and Pointer

### Target Size (WCAG 2.5.5 / 2.5.8)

- [ ] Touch targets minimum 44×44 CSS pixels (Level AAA: 44px, Level AA: 24px)
- [ ] Adequate spacing between targets
- [ ] Inline links exempt if text-sized

**Detection:** Interactive elements with width or height < 44px

```css
/* ❌ Too small */
button { width: 32px; height: 32px; }

/* ✅ Adequate size */
button { min-width: 44px; min-height: 44px; }
```

---

## Motion and Animation

### Reduced Motion (WCAG 2.3.3)

- [ ] Respects `prefers-reduced-motion`
- [ ] No essential information only in animation
- [ ] Animations can be paused

### Auto-Playing (WCAG 2.2.2)

- [ ] No auto-playing content > 5 seconds
- [ ] Or mechanism to pause/stop

### Flashing (WCAG 2.3.1)

- [ ] No content flashes > 3 times per second

---

## Document Structure

### Headings

- [ ] Logical heading hierarchy (h1 → h2 → h3)
- [ ] No skipped levels
- [ ] Single h1 per page

### Landmarks

- [ ] `<main>` for primary content
- [ ] `<nav>` for navigation
- [ ] `<header>` and `<footer>`
- [ ] `<aside>` for complementary content

### Skip Links

- [ ] "Skip to main content" link as first focusable
- [ ] Visible on focus

---

## Review Severity Guide

### Critical (Blocks access)

| Issue | WCAG |
|-------|------|
| Images without alt text | 1.1.1 |
| Icon-only buttons missing aria-label | 4.1.2 |
| Form inputs without labels | 1.3.1, 4.1.2 |
| Non-semantic click handlers (div onClick) | 2.1.1, 4.1.2 |
| Links without href | 4.1.2 |
| Keyboard trap | 2.1.2 |
| No accessible name | 4.1.2 |

### Serious (Major barrier)

| Issue | WCAG |
|-------|------|
| Focus outline removed without replacement | 2.4.7 |
| Missing keyboard handlers | 2.1.1 |
| Color-only information | 1.4.1 |
| Touch targets under 44×44px | 2.5.5 |
| Missing live region for dynamic content | 4.1.3 |
| Poor focus indicator contrast | 2.4.7 |

### Moderate (Minor barrier)

| Issue | WCAG |
|-------|------|
| Skipped heading levels | 1.3.1 |
| Positive tabindex values | 2.4.3 |
| Role without required attributes | 4.1.2 |
| Verbose or unclear labels | 2.4.6 |
| Missing aria-describedby | 1.3.1 |

### Deduction Scoring

| Severity | Points |
|----------|--------|
| Critical | -15 |
| Serious | -8 |
| Moderate | -3 |
| Minor | -1 |

Start at 100. Scores below 70 indicate significant issues.
