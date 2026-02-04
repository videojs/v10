# Anti-Patterns & Severity

Quick reference for common issues and their severity.

---

## Anti-Pattern Summary

| Anti-Pattern        | Detection                             | Fix                           |
| ------------------- | ------------------------------------- | ----------------------------- |
| Prop explosion      | >10 props on one component            | Use compound components       |
| Inline state styles | `style={{ opacity: disabled ? ... }}` | Use data attributes           |
| Shipped CSS         | `import 'styles.css'` in component    | Headless, user brings styles  |
| `as` prop           | `<Button as="a">`                     | Use `render` or `asChild`     |
| Missing controlled  | Only `defaultValue`                   | Add `value` + `onValueChange` |
| Context collision   | Nested instances share state          | Scope contexts per Root       |
| No exit animation   | `{open && ...}` without `keepMounted` | Add animation support         |
| SSR unsafe          | `document.body` at module scope       | Guard with mount check        |
| No ref forwarding   | Missing `forwardRef`                  | Forward ref to DOM            |

---

## Severity Guide

### Critical

| Issue                        | Why                                 |
| ---------------------------- | ----------------------------------- |
| Missing controlled support   | Can't integrate with external state |
| Context collision in nesting | Breaks composition                  |
| SSR crash                    | Breaks server rendering             |
| Memory leak (no cleanup)     | Production issue                    |

### Major

| Issue                     | Why                  |
| ------------------------- | -------------------- |
| Prop explosion            | Poor DX, inflexible  |
| Missing data attributes   | Can't style with CSS |
| No exit animation support | Poor UX              |
| Boolean trap              | Confusing API        |
| Missing ref forwarding    | Can't access DOM     |

### Minor

| Issue                 | Why                 |
| --------------------- | ------------------- |
| Inconsistent naming   | API inconsistency   |
| Missing CSS variables | Harder to customize |
| Verbose handler names | Minor DX issue      |
