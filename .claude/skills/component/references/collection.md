# Collection and Portal Patterns

Patterns for lists, rendering outside DOM hierarchy, and virtualization.

---

## Collection Components

For lists, menus, selects, and other item-based components.

### When to Use

- Listbox, Menu, Select, Combobox
- Any component with selectable/navigable items
- Large lists requiring virtualization

### Context Responsibilities

| Concern   | What to Track                          |
| --------- | -------------------------------------- |
| Items     | Array of item data or refs             |
| Selection | Selected keys (single or multi)        |
| Disabled  | Keys that can't be selected            |
| Focus     | Currently focused key for keyboard nav |

### Render Prop Pattern

Allow flexible item rendering while maintaining collection behavior:

```tsx
<ListBox items={items}>{(item) => <Item key={item.id}>{item.name}</Item>}</ListBox>
```

**Why render props:** Component controls iteration, caller controls rendering. Enables virtualization, keyboard nav, ARIA without caller knowing internals.

### Type-Ahead Search

Allow users to jump to items by typing.

**Logic flow:**

1. Buffer printable keystrokes
2. On each keystroke, search items for prefix match (case-insensitive)
3. Focus first matching item
4. Clear buffer after ~500ms of no input

**Implementation notes:**

- Only handle single printable characters (`event.key.length === 1`)
- Concatenate to buffer, don't replace
- Use timeout to reset buffer

> **Reference:** [React Aria useTypeAhead](https://react-spectrum.adobe.com/react-aria/useListBox.html)

---

## Portal Pattern

Render content outside its DOM parent for proper layering.

### When to Use

- Dialogs, modals, sheets
- Dropdown menus, popovers, tooltips
- Any overlay that needs to escape parent CSS context

### Why Portals

| Problem                       | Portal Solution             |
| ----------------------------- | --------------------------- |
| Parent has `overflow: hidden` | Render at body, no clipping |
| Parent has low z-index        | Control stacking at root    |
| Parent has `transform`        | Escape stacking context     |

### Implementation Considerations

**SSR safety:**

- Don't access `document.body` at module scope
- Render inline on server, portal after hydration
- Check `typeof document !== 'undefined'`

**Context preservation:**

- Framework context must flow through portal
- Provider wraps portal _source_, not target
- Most frameworks handle this automatically

**Custom container:**

```tsx
<Portal container={document.getElementById('modal-root')}>
  <DialogContent />
</Portal>
```

### Z-Index Management

**Approach:** Increment z-index for each nested portal layer.

- Track nesting depth via context
- Each portal reads parent depth, adds 1
- Apply `z-index: depth * 100` (or similar scale)

> **Reference:** [Radix Portal](https://www.radix-ui.com/primitives/docs/utilities/portal)

---

## Virtualization

Render only visible items for large lists.

### When to Use

- Lists > 100 items
- Complex item rendering
- Mobile/low-power devices

### Core Concept

**Calculate visible window:**

```
startIndex = floor(scrollTop / itemHeight) - overscan
endIndex = ceil((scrollTop + containerHeight) / itemHeight) + overscan
```

**Render only `items.slice(startIndex, endIndex)`**

### Implementation Requirements

| Requirement                   | Purpose                       |
| ----------------------------- | ----------------------------- |
| Fixed or measured item height | Calculate positions           |
| Container with fixed height   | Define viewport               |
| Scroll listener               | Update visible range          |
| Absolute positioning          | Place items at correct offset |

### Positioning

```css
.list-container {
  height: calc(var(--item-count) * var(--item-height));
  position: relative;
}

.list-item {
  position: absolute;
  top: calc(var(--index) * var(--item-height));
  height: var(--item-height);
}
```

### Variable Height Items

For variable heights, measure items and cache heights. More complex — consider using a library.

> **Reference:** [TanStack Virtual](https://tanstack.com/virtual/latest)

---

## See Also

- [Focus Management](../../aria/references/focus.md) — keyboard navigation in collections
- [Animation](animation.md) — exit animations for items
