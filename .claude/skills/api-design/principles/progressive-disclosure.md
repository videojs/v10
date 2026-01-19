# Progressive Disclosure Principles

How to layer complexity and provide escape hatches.

## Complexity Should Grow with Use Case

> "The complexity of the call site should grow with the complexity of the use case." — Apple SwiftUI team

**The layering:**

| Level                   | Complexity | What Users See |
| ----------------------- | ---------- | -------------- |
| Zero config             | None       | It just works  |
| Options                 | Low        | Tweak behavior |
| Composition             | Medium     | Combine pieces |
| Headless/hooks          | High       | Full control   |
| Framework-agnostic core | Expert     | Build adapters |

**Why this layering works:** Most users never need levels 4-5. But those who do aren't trapped—they can reach lower levels without abandoning the library.

**The 80/20 test:** 80% of users should succeed at level 1-2. The remaining 20% have a path to level 3-5.

---

## Escape Hatches Compose, Don't Replace

> "Good defaults appeal to maybe 80% of users... but there will be power users who want to do advanced things. The plugin API decides the ceiling of user experience." — Evan You

**The three-layer pattern:**

1. **Convention layer:** Works without configuration
2. **Configuration layer:** Explicit but simple overrides
3. **Escape hatch layer:** Full programmatic control

**Critical:** Each layer composes with the ones above. Using an escape hatch shouldn't require reimplementing default behavior.

**Why this matters:** If using `useMedia` (escape hatch) requires abandoning everything from `usePlayer` (primary API), the abstraction is wrong. Escape hatches should be additive.

---

## Explicit Contracts Over Implicit Requirements

Base UI's evolution shows why explicit beats implicit:

| Generation      | Pattern           | Problem                              |
| --------------- | ----------------- | ------------------------------------ |
| slots/slotProps | Implicit mapping  | TypeScript couldn't maintain types   |
| asChild (Radix) | Clone element     | Silent breakage if ref not forwarded |
| Render props    | Explicit function | Contract is clear, typed             |

**Why asChild fails:**

- Relies on `cloneElement` (React docs warn it's fragile)
- Child must forward refs AND spread props correctly
- If it doesn't, breakage is silent—no error, just doesn't work

**Why render props win:**

- Explicit state access via `state` parameter
- No hidden ref forwarding requirements
- TypeScript fully types props and state
- Failure is compile-time, not runtime

```typescript
// Explicit: you see exactly what's required and available
<Switch.Thumb render={(props, state) => (
  <span {...props}>{state.checked ? '✓' : '✗'}</span>
)} />
```

---

## Make Wrong Things Possible But Obvious

**Pit of success principle:** Short names for correct usage, long names for dangerous operations.

| Correct Path | Dangerous Path            |
| ------------ | ------------------------- |
| `render`     | `dangerouslySetInnerHTML` |
| `set`        | `shamefullySendNext`      |
| `usePlayer`  | `preventBaseUIHandler()`  |

**Why this works:** The API guides toward correctness through naming. Dangerous operations are possible but require explicit acknowledgment—you can't accidentally use them.

**The naming signal:** If you're naming something `unsafe`, `dangerous`, `internal`, or `__private`—good. That's the escape hatch being honest about what it is.

---

## See Also

- [Polymorphism Patterns](../../component/references/polymorphism.md) — asChild, render props, slots
- [API Surface](api-surface.md) — naming and structure
