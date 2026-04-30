# Menus Implementation

Design doc: `internal/design/ui/menus.md`
Branch: `feat/menu-ui-component` (PR #1078)

## Overview

Four PRs along the dependency chain:

```
PR 1 (Core) → PR 2 (DOM flat) → PR 3 (UI flat) → PR 4 (Submenus)
```

---

## PR 1 — Core layer

**Status:** IN PROGRESS

### Files

**New:**
- `packages/core/src/core/ui/menu/menu-core.ts`
- `packages/core/src/core/ui/menu/menu-data-attrs.ts`
- `packages/core/src/core/ui/menu/menu-item-data-attrs.ts`
- `packages/core/src/core/ui/menu/menu-css-vars.ts`
- `packages/core/src/core/ui/menu/tests/menu-core.test.ts`

**Modified:**
- `packages/core/src/core/index.ts` — add menu exports

### Key decisions
- `MenuCore` follows `PopoverCore` pattern: `setProps` + `setInput(TransitionState)` + `getState()`
- `isSubmenu` prop on `MenuCore` — suppresses `popover="manual"` in `getContentAttrs` and disables positioning props for nested menus
- `MenuItemDataAttrs` is not constrained by `StateAttrMap` since items have their own state, not `MenuState`
- `data-direction` belongs in DOM layer alongside `NavigationState`, not in core constants

---

## PR 2 — DOM layer: flat menu

**Status:** PENDING

### Files

**New:**
- `packages/core/src/dom/ui/menu/create-menu.ts`
- `packages/core/src/dom/ui/menu/tests/create-menu.test.ts`

**Modified:**
- `packages/core/src/dom/index.ts` — add menu exports

### Scope
- `createMenu()` factory: keyboard nav (`ArrowUp/Down/Home/End/Enter/Space/Escape`), roving tabindex, item self-registration via `registerItem(el) → cleanup`, type-ahead (500ms debounce), focus management on open/close
- Composes `createPopover()` internally for open/close, positioning, dismiss (root only)
- Submenu `push`/`pop` NOT included — that comes in PR 4

---

## PR 3 — UI layer: flat menu (React + HTML)

**Status:** PENDING

### React files (`packages/react/src/ui/menu/`)
- `context.tsx`, `index.parts.ts`, `index.ts`
- `menu-root.tsx`, `menu-trigger.tsx`, `menu-content.tsx`
- `menu-item.tsx`, `menu-label.tsx`, `menu-separator.tsx`, `menu-group.tsx`
- `menu-radio-group.tsx`, `menu-radio-item.tsx`, `menu-checkbox-item.tsx`, `menu-item-indicator.tsx`

### HTML files (`packages/html/src/ui/menu/`)
- `menu-element.ts`, `menu-item-element.ts`, `menu-label-element.ts`, `menu-separator-element.ts`
- `menu-group-element.ts`, `menu-radio-group-element.ts`, `menu-radio-item-element.ts`
- `menu-checkbox-item-element.ts`, `menu-item-indicator-element.ts`

**Modified:**
- `packages/react/src/ui/index.ts` — add Menu export
- `packages/html/src/define/ui/menu.ts` — registration barrel
- `packages/html/src/ui/index.ts` — add menu exports

### Scope
- Fully functional flat single-level menu with items, radio groups, checkboxes, labels, separators
- No nested Root / Back / submenu navigation — that comes in PR 4

---

## PR 4 — Submenu navigation

**Status:** PENDING

### Files

**New DOM:**
- `packages/core/src/dom/ui/menu/create-sub-menu-transition.ts`

**New React:**
- `packages/react/src/ui/menu/menu-back.tsx`

**New HTML:**
- `packages/html/src/ui/menu/menu-back-element.ts`

**Modified:**
- `packages/core/src/dom/ui/menu/create-menu.ts` — add `push`/`pop` to `MenuApi`, `NavigationState`, wire transition
- `packages/react/src/ui/menu/menu-root.tsx` — nested Root detects parent context → submenu mode
- `packages/react/src/ui/menu/menu-content.tsx` — `data-submenu`, `data-direction`, slide transition wiring
- `packages/html/src/ui/menu/menu-element.ts` — nested `<media-menu>` + `commandfor` support
- `packages/html/src/ui/menu/menu-item-element.ts` — `commandfor` attribute handling
- `packages/core/src/dom/index.ts` — add transition export
- `packages/react/src/ui/index.ts` — add Back to Menu exports
- `packages/html/src/define/ui/menu.ts` — register `<media-menu-back>`

### Scope
- `NavigationState`: stack of `{ menuId, triggerId }`, direction, exitingMenuId, transitioning
- `createSubMenuTransition()`: double-RAF lifecycle, `--media-menu-width/height` measurement, `getAnimations()` settle
- Nested `Menu.Root` detection via parent `MenuContext` → `isSubmenu: true` prop, Trigger registers as parent item
- `Menu.Back` / `<media-menu-back>`: pops stack, focus restoration to trigger
- Auto-back on `RadioItem` selection in submenu
- RTL: direction-agnostic JS, CSS handles `translateX` flip via `[dir="rtl"]`
