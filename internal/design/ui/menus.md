---
status: draft
date: 2026-04-13
---

# Menu

Compound, headless menu components for media controls — settings, option selection, and context actions.

## Problem

Video players need menus for three core interactions:

1. **Settings** — quality, playback speed, captions, audio tracks
2. **Option selection** — single-choice (radio) and multi-choice (checkbox) groups
3. **Context actions** — copy link, report, stats

The dominant pattern for settings menus in video players is in-place navigation: clicking a settings category slides the view to a submenu, and clicking back returns to the root. This is what YouTube, Plyr, and most native player UIs do. Flyout (side-opening) submenus are a valid extension point but not the starting design.

Requirements:

- Compound and composable — users assemble parts, omit what they don't need
- Headless — no baked-in styles; CSS custom properties for animation values
- Accessible — `role="menu"`, full keyboard support, roving tabindex, type-ahead
- Cascading submenus — in-place slide transitions with animated container resize
- Treeshakeable — parts only imported when used
- Cross-platform — same core logic drives React components and HTML custom elements

## API

### React

Submenus are expressed by nesting `Menu.Root` inside `Menu.Content`. There are no separate `SubMenu*` parts — the same three structural parts (`Root`, `Trigger`, `Content`) compose at every level. A nested `Root` detects its parent context and behaves as a submenu automatically.

For the in-place settings-menu pattern, the root list is wrapped in `Menu.View`. `Menu.View` is not a generic submenu requirement; it marks the root logical view inside a shared viewport so CSS can animate between the root view and nested `Menu.Content` views. Traditional flyout submenus would use positioned nested content instead and would not require `Menu.View`.

```tsx
import { Menu } from '@videojs/react';

<Menu.Root>
  <Menu.Trigger>Settings</Menu.Trigger>
  <Menu.Content>

    <Menu.View>
      <Menu.Root>
        <Menu.Trigger>Quality</Menu.Trigger>
        <Menu.Content>
          <Menu.Back />
          <Menu.RadioGroup value={quality} onValueChange={setQuality}>
            <Menu.RadioItem value="auto">Auto</Menu.RadioItem>
            <Menu.RadioItem value="1080p">1080p</Menu.RadioItem>
            <Menu.RadioItem value="720p">720p</Menu.RadioItem>
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Root>

      <Menu.Root>
        <Menu.Trigger>Speed</Menu.Trigger>
        <Menu.Content>
          <Menu.Back />
          <Menu.RadioGroup value={speed} onValueChange={setSpeed}>
            <Menu.RadioItem value="0.5">0.5×</Menu.RadioItem>
            <Menu.RadioItem value="1">Normal</Menu.RadioItem>
            <Menu.RadioItem value="2">2×</Menu.RadioItem>
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Root>

      <Menu.Separator />
      <Menu.Item onSelect={copyLink}>Copy Link</Menu.Item>
    </Menu.View>

  </Menu.Content>
</Menu.Root>
```

### HTML

Submenus are nested `<media-menu>` elements. A `<media-menu-item>` with `commandfor` links to its target submenu by ID — consistent with how other floating components use the invoker API.

For the in-place settings-menu pattern, the root list is wrapped in `<media-menu-view>`. Like `Menu.View`, it is a shared-viewport view-navigation boundary, not a requirement for future flyout submenu rendering.

```ts
import '@videojs/html/ui/menu';
```

```html
<button commandfor="settings-menu">Settings</button>
<media-menu id="settings-menu" side="top" align="end">

  <media-menu-view>
    <media-menu-item commandfor="quality-menu">Quality</media-menu-item>
    <media-menu-item commandfor="speed-menu">Speed</media-menu-item>
    <media-menu-separator></media-menu-separator>
    <media-menu-item>Copy Link</media-menu-item>
  </media-menu-view>

  <media-menu id="quality-menu">
    <media-menu-back></media-menu-back>
    <media-menu-radio-group value="auto">
      <media-menu-radio-item value="auto">Auto</media-menu-radio-item>
      <media-menu-radio-item value="1080p">1080p</media-menu-radio-item>
      <media-menu-radio-item value="720p">720p</media-menu-radio-item>
    </media-menu-radio-group>
  </media-menu>

  <media-menu id="speed-menu">
    <media-menu-back></media-menu-back>
    <media-menu-radio-group value="1">
      <media-menu-radio-item value="0.5">0.5×</media-menu-radio-item>
      <media-menu-radio-item value="1">Normal</media-menu-radio-item>
      <media-menu-radio-item value="2">2×</media-menu-radio-item>
    </media-menu-radio-group>
  </media-menu>

</media-menu>
```

### Parts

All parts are exported under `Menu.*` (React) or as `<media-menu-*>` elements (HTML). One import gives access to everything:

```ts
import { Menu } from '@videojs/react';
// Menu.Root, Menu.Trigger, Menu.Content, Menu.Back,
// Menu.Item, Menu.Label, Menu.Separator, Menu.Group,
// Menu.RadioGroup, Menu.RadioItem, Menu.CheckboxItem, Menu.ItemIndicator
```

---

#### Root

Context provider. Owns menu state and creates the underlying `createMenu()` instance. When nested inside another `Menu.Content`, it automatically behaves as a submenu — its `Trigger` registers as a navigable item in the parent menu, and its `Content` renders as an in-place submenu view.

Does not render a DOM element in React. In HTML, `<media-menu>` serves as both Root and Content.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | — | Controlled open state. |
| `defaultOpen` | `boolean` | `false` | Initial open state (uncontrolled). |
| `side` | `PopoverSide` | `'bottom'` | Which side of the trigger the menu appears on. Root menus only — submenus inherit the parent viewport. |
| `align` | `PopoverAlign` | `'start'` | Alignment along the trigger's edge. Root menus only. |
| `closeOnEscape` | `boolean` | `true` | Close the menu when Escape is pressed at root level. |
| `closeOnOutsideClick` | `boolean` | `true` | Close the menu when clicking outside. Root menus only. |
| `onOpenChange` | `(open: boolean) => void` | — | Fired when the menu opens or closes. |

---

#### Trigger

Opens and closes the menu. At the root level, renders as a standalone button outside `Content`. When inside a parent `Menu.Content` (i.e., the `Root` is a submenu), renders as a `menuitem` within the parent's navigation — pushing the submenu on activate and registering with the parent's roving tabindex.

**ARIA (automatic):**

| Attribute | Value |
|-----------|-------|
| `aria-haspopup` | `"menu"` |
| `aria-expanded` | `"true"` when open, `"false"` when closed |
| `aria-controls` | ID of the associated Content element |

When acting as a submenu trigger inside a parent menu: `role="menuitem"`, roving `tabIndex`, `aria-disabled`. Also receives `data-item` and `data-highlighted` (see items below).

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `disabled` | `boolean` | Disables the trigger. Only meaningful when used as a submenu trigger inside a parent menu. |
| `render` | `RenderProp<MenuState>` | Custom render element. |

---

#### Content

Popup container. At the root level, handles popover positioning and dismiss behavior. When paired with `Menu.View` / `<media-menu-view>`, it also acts as the shared **viewport** for in-place menu view navigation — only one logical view is active at a time.

When nested in the current in-place navigation mode, it does not use popover positioning. Instead it renders in-place as a generic menu view inside the parent Content's viewport. Gets `data-submenu` to distinguish it from the root Content. Future flyout submenu support would use positioned nested content and would not require the root `Menu.View` boundary.

**ARIA (automatic):**

| Attribute | Value |
|-----------|-------|
| `role` | `"menu"` |
| `tabIndex` | `-1` |
| `popover` | `"manual"` (root only) |

**Data attributes** — set on Content and inherited by all children:

| Attribute | Values | When |
|-----------|--------|------|
| `data-open` | present/absent | Menu is open |
| `data-starting-style` | present/absent | Open transition in progress |
| `data-ending-style` | present/absent | Close transition in progress |
| `data-side` | `top` / `bottom` / `left` / `right` | Popover side (root only) |
| `data-align` | `start` / `center` / `end` | Popover alignment (root only) |
| `data-submenu` | present/absent | This Content belongs to a nested submenu |
| `data-menu-viewport` | present | Root Content is the viewport for menu view transitions |

**CSS custom properties** (set by JS on the root Content during submenu transitions):

| Property | Description |
|----------|-------------|
| `--media-menu-width` | Width of the incoming view |
| `--media-menu-height` | Height of the incoming view |
| `--media-menu-available-height` | Viewport-constrained max height |

**HTML events** (`<media-menu>` dispatches, all bubble):

| Event | Detail | Fires when |
|-------|--------|------------|
| `open-change` | `{ open: boolean }` | Menu opens or closes |

---

#### View

Root menu view inside `Content` for in-place view navigation. This is the root panel in the shared menu viewport; CSS decides whether it slides, fades, crossfades, scales, or remains static while child views enter.

`Menu.View` / `<media-menu-view>` is only needed when the root menu and nested `Content` views share one viewport and transition in-place. It is not part of the flat menu API, and it should not be needed for a traditional side-opening flyout submenu pattern.

**Data attributes:**

| Attribute | Values | When |
|-----------|--------|------|
| `data-menu-root-view` | present | Marks the root list view |
| `data-menu-view` | present | Marks this element as a menu view |
| `data-menu-view-state` | `active` / `inactive` | Root view state within the viewport |

---

#### Back

Button that navigates back to the parent view. Placed at the top of a submenu `Content`. Not rendered (or disabled) when already at root depth.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | `'Back'` | Accessible label (`aria-label`). |
| `render` | `RenderProp<MenuState>` | — | Custom render element. |

**ARIA (automatic):** `aria-label` from `label` prop.

**Behavior:**
- Click pops the navigation stack.
- `ArrowLeft` anywhere in the submenu also pops (handled by Content).
- After pop, focus returns to the `Trigger` that navigated forward.

---

#### Item

Standard menu item for actions. Activating fires `onSelect` and closes the menu.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `disabled` | `boolean` | `false` | Disables the item. |
| `onSelect` | `() => void` | — | Fired on click, Enter, or Space. |
| `render` | `RenderProp<MenuItemState>` | — | Custom render element. |

**ARIA (automatic):** `role="menuitem"`, roving `tabIndex`, `aria-disabled`.

**Data attributes:** `data-item`, `data-highlighted`. Use `[aria-disabled="true"]` in CSS for disabled styling.

---

#### Label

Non-interactive heading within a group. Not keyboard-navigable.

**Props:** `render`.

**ARIA (automatic):** `role="presentation"`.

---

#### Separator

Visual divider between groups or items. Not focusable.

**ARIA (automatic):** `role="separator"`.

---

#### Group

Groups related items for assistive technology.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Accessible label (`aria-label`). |
| `render` | `RenderProp<MenuState>` | Custom render element. |

**ARIA (automatic):** `role="group"`, `aria-label`.

---

#### RadioGroup

Single-selection group. Manages value state — controlled or uncontrolled. In a submenu, selecting a RadioItem automatically navigates back to the parent view (matches YouTube/Plyr behavior).

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Controlled selected value. |
| `defaultValue` | `string` | — | Initial value (uncontrolled). |
| `onValueChange` | `(value: string) => void` | — | Fired when selection changes. |
| `label` | `string` | — | Accessible group label. |
| `render` | `RenderProp<MenuState>` | — | Custom render element. |

**ARIA (automatic):** `role="group"`, `aria-label`.

---

#### RadioItem

Item within a RadioGroup. Represents one selectable option.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Value this item represents. |
| `disabled` | `boolean` | `false` | Disables the item. |
| `render` | `RenderProp<MenuRadioItemState>` | — | Custom render element. |

**ARIA (automatic):** `role="menuitemradio"`, `aria-checked`, roving `tabIndex`, `aria-disabled`.

**Data attributes:** `data-item`, `data-highlighted`. Use `[aria-checked="true"]` and `[aria-disabled="true"]` in CSS for checked and disabled styling.

**Behavior:** In a submenu, selecting a RadioItem auto-pops back to the parent view after calling `onValueChange`.

---

#### CheckboxItem

Toggle item with independent checked/unchecked state.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `checked` | `boolean` | — | Controlled checked state. |
| `defaultChecked` | `boolean` | `false` | Initial checked state (uncontrolled). |
| `onCheckedChange` | `(checked: boolean) => void` | — | Fired when state toggles. |
| `disabled` | `boolean` | `false` | Disables the item. |
| `render` | `RenderProp<MenuCheckboxItemState>` | — | Custom render element. |

**ARIA (automatic):** `role="menuitemcheckbox"`, `aria-checked`, roving `tabIndex`, `aria-disabled`.

**Data attributes:** `data-item`, `data-highlighted`. Use `[aria-checked="true"]` and `[aria-disabled="true"]` in CSS for checked and disabled styling.

---

#### ItemIndicator

Visual indicator that renders when the parent RadioItem or CheckboxItem is checked. Use for checkmarks, dots, or icons.

**Props:** `render`.

**Behavior:** Reads checked state from the nearest parent item context. Hidden from assistive technology — the parent item's `aria-checked` provides the semantic.

---

### HTML element tags

| Part | Tag |
|------|-----|
| Root / Content | `<media-menu>` |
| View | `<media-menu-view>` |
| Back | `<media-menu-back>` |
| Item | `<media-menu-item>` |
| Label | `<media-menu-label>` |
| Separator | `<media-menu-separator>` |
| Group | `<media-menu-group>` |
| RadioGroup | `<media-menu-radio-group>` |
| RadioItem | `<media-menu-radio-item>` |
| CheckboxItem | `<media-menu-checkbox-item>` |
| ItemIndicator | `<media-menu-item-indicator>` |

In-place submenus are expressed by nesting sibling `<media-menu>` elements in the parent `<media-menu>` and linking triggers via `commandfor`. The root list lives in `<media-menu-view>` so it can participate in the same view lifecycle as child submenu content.

## Navigation model

For in-place navigation, Content acts as a fixed-size **viewport**. Only one logical view is active at a time: the root list or one submenu's content. Navigation is modelled as a **stack**:

```ts
type StackEntry = {
  /** ID of the nested Menu.Root (submenu) that was pushed. */
  menuId: string;
  /** ID of the Trigger element that initiated the push, for focus restoration. */
  triggerId: string;
};

type NavigationState = {
  stack: StackEntry[];
  direction: 'forward' | 'back' | null;
  exitingMenuId: string | null;
  transitioning: boolean;
};
```

### Push (forward)

1. User clicks/activates a submenu `Trigger` (or presses `ArrowRight` on it).
2. `{ menuId, triggerId }` is pushed onto the stack.
3. Both the outgoing view and the incoming submenu `Content` are in the DOM simultaneously.
4. First RAF: incoming Content is measured. `--media-menu-width` and `--media-menu-height` are set on the root Content.
5. Second RAF: browser has painted the "from" state. CSS transitions animate the container resize; CSS animations slide the views.
6. `getAnimations()` on root Content settles — transition complete.
7. `exitingMenuId` is cleared. Only the active view remains.
8. Focus moves to the first item in the new submenu Content.

### Pop (back)

1. User clicks `Back`, presses `ArrowLeft`, or presses `Escape` while in a submenu.
2. `stack.pop()`. Direction set to `'back'`.
3. Same double-RAF + animation settle lifecycle as push, views slide in reverse.
4. Focus returns to the `Trigger` identified by the popped entry's `triggerId`.

### Reset

On menu close, the stack resets to `[]` immediately — no animation plays. The popover's own close animation covers the visual exit. When the menu re-opens, it starts at the root view.

### Auto-back on RadioItem selection

When a `RadioItem` inside a submenu `Content` is activated, the menu automatically pops back after calling `onValueChange`. This matches the expected YouTube/Plyr behavior — select an option, return to settings root.

### Rapid navigation

If the user navigates while a transition is in progress, the current transition is cancelled (skip to end state) and the new transition starts immediately. Same cancel pattern as `createTransition()`.

### Nesting depth

The stack supports arbitrary depth. A submenu `Content` can contain another nested `Menu.Root`, creating multi-level paths (Settings → Quality → Advanced). The stack grows and shrinks accordingly.

## CSS animation

Animation is driven by data attributes and CSS custom properties. Core may set sizing CSS variables and temporary measurement styles internally; sandbox/user-authored motion styling stays in CSS.

### Data attributes

**On root Content** (and inherited by all children):

| Attribute | Values | When |
|-----------|--------|------|
| `data-open` | present/absent | Menu is open |
| `data-starting-style` | present/absent | Open transition in progress |
| `data-ending-style` | present/absent | Close transition in progress |
| `data-side` | `top` / `bottom` / `left` / `right` | Popover side |
| `data-align` | `start` / `center` / `end` | Popover alignment |

**On submenu Content:**

| Attribute | Values | When |
|-----------|--------|------|
| `data-submenu` | present | Always — identifies this as a submenu view |
| `data-menu-view` | present | Marks this element as a menu view |
| `data-menu-view-state` | `active` / `inactive` | This view is entering/current or exiting/hidden |
| `data-open` | present/absent | This view is mounted for transition or active |
| `data-starting-style` | present/absent | View is entering |
| `data-ending-style` | present/absent | View is exiting |
| `data-direction` | `forward` / `back` | Direction of the transition |

**On items** (Item, RadioItem, CheckboxItem, and Trigger when used as a submenu trigger):

| Attribute | Values | When |
|-----------|--------|------|
| `data-item` | present | Always — shared marker across all navigable item types |
| `data-highlighted` | present/absent | Item has keyboard or pointer focus |

`aria-checked` and `aria-disabled` are set by the component and should be used directly as CSS selectors — no redundant data attributes.

### CSS custom properties

Set by JS on the root Content before each submenu transition:

| Property | Example | Description |
|----------|---------|-------------|
| `--media-menu-width` | `240px` | Width of the incoming view |
| `--media-menu-height` | `320px` | Height of the incoming view |
| `--media-menu-available-height` | `480px` | Viewport-constrained max height |

### Example CSS

```css
/* Container resizes to match the incoming submenu view */
media-menu {
  width: var(--media-menu-width);
  height: var(--media-menu-height);
  max-height: var(--media-menu-available-height, none);
  overflow: hidden;
  transition:
    width 200ms ease,
    height 200ms ease;
}

/* Menu open/close — fade + slight scale */
@starting-style {
  media-menu[data-open] {
    opacity: 0;
    transform: scale(0.97);
  }
}
media-menu[data-ending-style] {
  opacity: 0;
  transform: scale(0.97);
}
media-menu {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}

/* Hide when closed */
media-menu:not([data-open]) {
  display: none;
}

/* Submenu slides — forward: in from right, out to left */
media-menu[data-submenu][data-starting-style][data-direction="forward"] {
  transform: translateX(100%);
}
media-menu[data-submenu][data-ending-style][data-direction="forward"] {
  transform: translateX(-100%);
}

/* Submenu slides — back: in from left, out to right */
media-menu[data-submenu][data-starting-style][data-direction="back"] {
  transform: translateX(-100%);
}
media-menu[data-submenu][data-ending-style][data-direction="back"] {
  transform: translateX(100%);
}

media-menu[data-submenu] {
  transition: transform 200ms ease;
}

/* RTL — flip slide direction */
[dir="rtl"] media-menu[data-submenu][data-starting-style][data-direction="forward"] {
  transform: translateX(-100%);
}
[dir="rtl"] media-menu[data-submenu][data-ending-style][data-direction="forward"] {
  transform: translateX(100%);
}
[dir="rtl"] media-menu[data-submenu][data-starting-style][data-direction="back"] {
  transform: translateX(100%);
}
[dir="rtl"] media-menu[data-submenu][data-ending-style][data-direction="back"] {
  transform: translateX(-100%);
}

/* Item highlight — target all item types with the shared data-item marker */
[data-item][data-highlighted] {
  background: rgba(255, 255, 255, 0.1);
}

/* Checked and disabled — use ARIA attributes directly */
[aria-checked="true"]::before {
  content: '✓';
}

[data-item][aria-disabled="true"] {
  opacity: 0.4;
  pointer-events: none;
}
```

**Transition completion detection:** JS uses `el.getAnimations()` on the root Content element to wait for all CSS transitions and animations to settle before updating state (clearing `exitingMenuId`, moving focus). Same pattern as `createTransition()`.

**RTL:** `ArrowRight` always pushes (opens submenu), `ArrowLeft` always pops — these are logical operations independent of text direction. The physical slide direction is flipped in CSS via `[dir="rtl"]`.

## Keyboard

Keyboard events are handled by the currently active view's container (root Content or submenu Content). Focus uses **roving tabindex** — only the highlighted item has `tabindex="0"`, all others have `tabindex="-1"`.

| Key | Behavior |
|-----|---------|
| `ArrowDown` | Next item in current view (wraps) |
| `ArrowUp` | Previous item in current view (wraps) |
| `ArrowRight` | Push submenu (if focused item is a submenu Trigger) |
| `ArrowLeft` | Pop submenu (if in a submenu); no-op at root |
| `Home` | First item in current view |
| `End` | Last item in current view |
| `Enter` / `Space` | Activate focused item |
| `Escape` | Pop submenu if in one; close menu at root |
| `a-z`, `0-9` | Type-ahead search in current view |

**Type-ahead:** Printable characters accumulate into a buffer. Search starts from the item after the current highlight and wraps. Buffer resets after 500ms of inactivity.

## Accessibility

The menu follows the [WAI-ARIA Menu Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu/) and [Menu Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/).

```html
<!-- Root level -->
<button
  aria-haspopup="menu"
  aria-expanded="true"
  aria-controls="settings-menu">
  Settings
</button>
<div id="settings-menu" role="menu" tabindex="-1">
  <!-- Submenu trigger acts as a menuitem in the parent -->
  <div data-menu-root-view>
    <div role="menuitem" aria-haspopup="menu" aria-expanded="false" tabindex="0">Quality</div>
    <div role="menuitem" aria-haspopup="menu" aria-expanded="false" tabindex="-1">Speed</div>
    <div role="separator"></div>
    <div role="menuitem" tabindex="-1">Copy Link</div>
  </div>
</div>

<!-- Quality submenu (when active — replaces root view in the viewport) -->
<div role="menu" tabindex="-1" data-submenu data-open>
  <button aria-label="Back"></button>
  <div role="group" aria-label="Quality">
    <div role="menuitemradio" aria-checked="false" tabindex="0">Auto</div>
    <div role="menuitemradio" aria-checked="true" tabindex="-1">1080p</div>
  </div>
</div>
```

**Roles:**

| Part | Role |
|------|------|
| Content (root or submenu) | `menu` |
| Item | `menuitem` |
| Trigger (when submenu trigger in parent) | `menuitem` |
| RadioItem | `menuitemradio` |
| CheckboxItem | `menuitemcheckbox` |
| Group / RadioGroup | `group` |
| Label | `presentation` |
| Separator | `separator` |

**Focus management:**

| Event | Focus behavior |
|-------|----------------|
| Menu opens | Focus Content, then first item |
| Menu closes | Focus returns to Trigger |
| Submenu push | After transition: focus moves to first item in submenu Content |
| Submenu pop | After transition: focus returns to the Trigger that initiated the push |

**Screen reader announcements:**

- `aria-checked` changes on RadioItem and CheckboxItem are announced natively.
- Submenu title changes on push/pop use `aria-live="polite"` on a visually hidden region inside root Content, announcing the active view name to users who cannot see the slide animation.

**Roving tabindex:** Items receive real DOM focus, so `:focus-visible` works naturally for keyboard-only styling. Recommended by WAI-ARIA; used by Radix and Base UI.

## Architecture

Three layers, each independently useful:

| Layer | Package | Purpose |
|-------|---------|---------|
| Core | `@videojs/core` | State computation, ARIA attributes, navigation stack. No DOM. |
| DOM | `@videojs/core/dom` | Keyboard navigation, type-ahead, submenu transitions, focus management. |
| UI | `@videojs/react`, `@videojs/html` | Compound components and custom elements. |

### Core layer

`MenuCore` follows the `PopoverCore` pattern — a framework-agnostic class that computes state and ARIA attributes from props and input.

```ts
interface MenuProps {
  side?: PopoverSide;
  align?: PopoverAlign;
  open?: boolean;
  defaultOpen?: boolean;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
}

interface MenuState extends TransitionFlags {
  open: boolean;
  status: TransitionStatus;
  side: PopoverSide;
  align: PopoverAlign;
  highlightedIndex: number;
  /** True when this menu instance is nested inside a parent menu. */
  isSubmenu: boolean;
}

type NavigationState = {
  stack: Array<{ menuId: string; triggerId: string }>;
  direction: 'forward' | 'back' | null;
  exitingMenuId: string | null;
  transitioning: boolean;
};
```

Constants follow the `*-data-attrs.ts` / `*-css-vars.ts` pattern from the slider:

```ts
// menu-data-attrs.ts
export const MenuDataAttrs = {
  open: 'data-open',
  side: 'data-side',
  align: 'data-align',
  submenu: 'data-submenu',
  startingStyle: 'data-starting-style',
  endingStyle: 'data-ending-style',
  direction: 'data-direction',
} as const;

// menu-item-data-attrs.ts
export const MenuItemDataAttrs = {
  item: 'data-item',
  highlighted: 'data-highlighted',
} as const;

// menu-css-vars.ts
export const MenuCSSVars = {
  width: '--media-menu-width',
  height: '--media-menu-height',
  availableHeight: '--media-menu-available-height',
} as const;
```

### DOM layer

`createMenu()` composes `createPopover()` internally for open/close, positioning, and dismiss behavior (root menus only), then layers menu-specific keyboard navigation and focus management on top. When a parent `MenuContext` is provided, the instance operates as a submenu — no popover positioning, registers its Trigger as a parent item.

```ts
interface MenuApi {
  input: State<MenuInput>;
  navigationState: State<NavigationState>;
  triggerProps: MenuTriggerProps;
  contentProps: MenuContentProps;
  setTriggerElement: (el: HTMLElement | null) => void;
  setContentElement: (el: HTMLElement | null) => void;
  open: (reason?: PopoverOpenChangeReason) => void;
  close: (reason?: PopoverOpenChangeReason) => void;
  registerItem: (el: HTMLElement, options?: { disabled?: boolean }) => () => void;
  highlight: (index: number) => void;
  push: (menuId: string, triggerId: string) => void;
  pop: () => void;
  destroy: () => void;
}
```

`createMenuViewTransition()` handles the double-RAF lifecycle for menu view enter/exit hooks (same pattern as `createTransition()`).
`menu-viewport-transition.ts` handles shared menu viewport measurement, width/height variables, and root/child view state coordination.

**Item collection:** Items self-register via `registerItem(el)` returning a cleanup function. Sorted by `compareDocumentPosition`. Works across Shadow DOM boundaries without coupling to ARIA role strings.

### File structure

**Core** (`packages/core/src/core/ui/menu/`):

```text
menu-core.ts
menu-data-attrs.ts
menu-item-data-attrs.ts
menu-css-vars.ts
```

**DOM** (`packages/core/src/dom/ui/menu/`):

```text
create-menu.ts
create-menu-view-transition.ts
menu-viewport-transition.ts
```

**React** (`packages/react/src/ui/menu/`):

```text
context.tsx
index.parts.ts
index.ts
menu-root.tsx
menu-trigger.tsx
menu-content.tsx
menu-view.tsx
menu-back.tsx
menu-item.tsx
menu-label.tsx
menu-separator.tsx
menu-group.tsx
menu-radio-group.tsx
menu-radio-item.tsx
menu-checkbox-item.tsx
menu-item-indicator.tsx
```

**HTML** (`packages/html/src/ui/menu/`):

```text
menu-element.ts
menu-view-element.ts
menu-back-element.ts
menu-item-element.ts
menu-label-element.ts
menu-separator-element.ts
menu-group-element.ts
menu-radio-group-element.ts
menu-radio-item-element.ts
menu-checkbox-item-element.ts
menu-item-indicator-element.ts
```

Importing `@videojs/html/ui/menu` registers all elements.

### Popover integration

`createMenu()` creates a `createPopover()` instance internally for open/close, Escape handling, outside-click dismissal, CSS Anchor Positioning (with JS fallback), and hover intent. The popover is an implementation detail, not exposed in the menu API. Menu adds what's unique: `role="menu"`, roving tabindex, arrow key navigation, type-ahead, and the navigation stack.

For submenu instances, `createPopover()` is not used — the parent menu's Content already provides the constrained viewport, and open/close is driven by the navigation stack.

## Prior art

**YouTube / Plyr** — The in-place panel navigation model this design is based on. Click a category, slide to a radio list, select, auto-slide back. Both reset to root on close.

**Vidstack** — Uses nested menu composition (same approach as this design) rather than separate sub-parts. `Menu` + nested `Menu` with `data-submenu` state. Direct inspiration for the flattened API.

**Base UI Menu** — Compound `Menu.Root` / `Menu.Trigger` / `Menu.Positioner` / `Menu.Popup` / `Menu.Item` pattern. Uses `data-open`, `data-starting-style`, `data-ending-style` on Popup for CSS-driven transitions. CSS custom properties (`--available-height`) for viewport constraints. Strongly influenced this doc's animation API.

**Radix Dropdown Menu** — Separate `DropdownMenu.Sub` / `DropdownMenu.SubTrigger` / `DropdownMenu.SubContent` for submenus. Flyout rendering (not in-place). Roving tabindex. `data-state="open|closed"` (we use `data-open` to align with Base UI).

**Shadcn** — Wraps Radix with default styling. Demonstrates compound namespace familiarity.

## Descoped

| Feature | Reason |
|---------|---------|
| Flyout (side-opening) submenus | Wrong starting point for video player settings menus. Add later via Portal-based Content if needed. |
| Context menus (right-click) | Different trigger model and positioning concerns. Separate design. |
| Hover-to-open submenus | Deferred. Desktop flyout behavior — not applicable to the in-place cascading model. |
