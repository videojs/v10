# Component RFC Guidance

General guidance for writing component RFCs.

## When to Use

- New UI components
- Component API changes
- Interaction patterns (keyboard, touch, focus)
- Accessibility requirements

## Templates

| Template                          | Use For                                         |
| --------------------------------- | ----------------------------------------------- |
| `templates/simple-component.md`   | Single-element components (Button, Icon, Badge) |
| `templates/compound-component.md` | Multi-part components (Slider, Menu, Dialog)    |

## Structure

**Simple component:** Usage → Examples → API → Accessibility

**Compound component:** Anatomy → Examples → Parts → Styling → Accessibility

## Tips

1. **Anatomy first** — Show component structure before API details
2. **Named examples** — Real scenarios: "Range Slider", "Vertical Orientation"
3. **Minimal examples** — Only show what's different, use `{/* ... */}` for the rest
4. **Full types** — Show union types, callback signatures
5. **`render` prop** — Document on every part for composition
6. **Data attributes** — Essential for styling component states

## Reference

Components follow patterns from:

- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Base UI](https://base-ui.com/) component APIs
- [Radix UI](https://www.radix-ui.com/) as fallback

## Related Skills

- `aria` skill — Accessibility implementation details
- `component` skill — Component architecture patterns
