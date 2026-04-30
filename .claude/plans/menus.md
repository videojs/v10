# Menus Implementation

Design doc: `internal/design/ui/menus.md`
Branch: `feat/menu-ui-component` (PR #1078)

## Overview

Three PRs along the dependency chain:

```
PR 1 (Core + DOM) → PR 2 (UI flat) → PR 3 (Submenus)
```

---

## PR 1 — Core + DOM layer

**Status:** DONE — `feat/menu-core-dom` (PR #1503)

### Files

**New:**
- `packages/core/src/core/ui/menu/menu-core.ts`
- `packages/core/src/core/ui/menu/menu-data-attrs.ts`
- `packages/core/src/core/ui/menu/menu-item-data-attrs.ts`
- `packages/core/src/core/ui/menu/menu-css-vars.ts`
- `packages/core/src/core/ui/menu/tests/menu-core.test.ts`
- `packages/core/src/dom/ui/menu/create-menu.ts`
- `packages/core/src/dom/ui/menu/tests/create-menu.test.ts`
- `packages/core/src/dom/ui/menu/tests/create-menu-helpers.ts`

**Modified:**
- `packages/core/src/core/index.ts` — add menu exports
- `packages/core/src/dom/index.ts` — add menu exports
- `packages/core/src/core/ui/transition.ts` — extract `TransitionDataAttrs`
- `packages/core/src/core/ui/popover/popover-data-attrs.ts` — spread `TransitionDataAttrs`
- `packages/core/src/core/ui/tooltip/tooltip-data-attrs.ts` — spread `TransitionDataAttrs`
- `packages/core/src/core/ui/alert-dialog/alert-dialog-data-attrs.ts` — spread `TransitionDataAttrs`

### Key decisions
- `MenuCore` follows `PopoverCore` pattern: `setProps` + `setInput(TransitionState)` + `getState()`
- `isSubmenu` prop on `MenuCore` — suppresses `popover="manual"` in `getContentAttrs` and disables positioning props for nested menus
- `MenuItemDataAttrs` is not constrained by `StateAttrMap` since items have their own state, not `MenuState`
- `data-direction` belongs in DOM layer alongside `NavigationState`, not in core constants
- `createMenu()` composes `createPopover()` internally; items stored as ordered array (registration order matches DOM order for standard React list rendering)
- `destroy()` cancels the open RAF and typeahead timer before delegating to `popover.destroy()`
- Open RAF guards against `status === 'ending'` to prevent highlight firing during a rapid open/close

---

## PR 2 — UI layer: flat menu (React + HTML)

**Status:** PENDING — branch off `feat/menu-core-dom`

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

## PR 3 — Submenu navigation

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

**Status:** PENDING — branch off `feat/menu-react-html`

### Scope
- `NavigationState`: stack of `{ menuId, triggerId }`, direction, exitingMenuId, transitioning
- `createSubMenuTransition()`: double-RAF lifecycle, `--media-menu-width/height` measurement, `getAnimations()` settle
- Nested `Menu.Root` detection via parent `MenuContext` → `isSubmenu: true` prop, Trigger registers as parent item
- `Menu.Back` / `<media-menu-back>`: pops stack, focus restoration to trigger
- Auto-back on `RadioItem` selection in submenu
- RTL: direction-agnostic JS, CSS handles `translateX` flip via `[dir="rtl"]`
