# Practitioner Voices

Quick-reference heuristics from DX practitioners. Use as lightweight lenses — don't imitate tone, apply the thinking.

## Summary Heuristics

| Voice               | Key Question                                                   |
| ------------------- | -------------------------------------------------------------- |
| Tanner Linsley      | Could this work across frameworks with the same core?          |
| Kent C. Dodds       | Does the API match how users think?                            |
| Ryan Carniato       | Does state change cause minimal re-work?                       |
| Adam Wathan         | Do constraints guide users to success?                         |
| Lee Robinson        | How fast is first success?                                     |
| Josh Comeau         | Does the README build intuition?                               |
| Evan You            | Does it feel like one cohesive product?                        |
| Base UI (preferred) | Is a11y in the architecture? Does `render` enable composition? |
| Radix               | Is a11y in the architecture?                                   |
| Devon Govett        | Can behaviors compose via hooks?                               |

---

## Detailed Perspectives

### Tanner Linsley (TanStack)

**Focus:** Composable primitives, core/adapter split, consistent patterns across ecosystems

- Build framework-agnostic cores with thin framework adapters
- Same mental model whether you're in React, Vue, Solid, or Svelte
- Primitives that compose into larger patterns
- Type inference should flow naturally from usage

**Applied:** When reviewing, check if the library could support multiple frameworks with the same core logic.

---

### Kent C. Dodds

**Focus:** User-centered APIs, confidence-driven testing

> "The more your tests resemble the way your software is used, the more confidence they can give you."

- APIs should match how users think about the problem
- Testing Library philosophy: test behavior, not implementation
- Colocation — keep related things together

**Applied:** Does the API match the user's mental model? Can you test it the way it's actually used?

---

### Ryan Carniato (Solid)

**Focus:** Locality, fine-grained reactivity, avoid unnecessary work

- Reactivity at the value level, not the component level
- Don't re-run code that doesn't need to re-run
- Locality of behavior — effects close to their triggers
- Explicit over implicit dependencies

**Applied:** Does state update cause minimal re-computation? Is the dependency graph clear?

---

### Adam Wathan (Tailwind)

**Focus:** Constraints + consistency, documentation as product

> "Documentation is the most important thing for the success of basically any open source project."

- Constraints enable creativity and consistency
- Utility-first: small composable pieces over large abstractions
- Docs are the product's front door
- Sensible defaults with escape hatches

**Applied:** Are defaults sensible? Is the API constrained enough to guide users toward success?

---

### Lee Robinson (Vercel)

**Focus:** DX as product, docs + examples are the funnel

> "DX is about building products developers love to use."

- Time-to-first-success is a key metric
- Examples are documentation
- Error messages are UI
- Developer experience is user experience

**Applied:** How fast can someone go from install to working code? Are errors helpful?

---

### Josh Comeau

**Focus:** Teach via mental models, clarity > completeness early

- Build intuition before details
- Visual explanations where possible
- Progressive disclosure of complexity
- Joy and delight matter

**Applied:** Does the README build intuition? Can beginners succeed before learning advanced features?

---

### Evan You (Vue)

**Focus:** Cohesive defaults, stable mental model across ecosystem

- Single cohesive vision over committee design
- Progressive enhancement — start simple, add complexity as needed
- Stability and predictability for long-term projects
- The ecosystem should feel like one product

**Applied:** Does the library feel cohesive? Can users predict behavior from patterns they've already learned?

---

### Base UI / Radix Teams

**Focus:** Accessibility-first primitives, composition + styling hooks

- Accessibility is architecture, not a feature
- Headless: ship behavior, not styles
- Compound components over prop explosion
- Data attributes as the styling contract

**Applied:** Is a11y built into the component model? Can users style without fighting the library?

---

### Devon Govett (React Aria)

**Focus:** Behavior/state separation, platform-aware accessibility

- Separate state logic (portable) from DOM behavior (platform-specific)
- ARIA patterns encoded into the architecture
- `mergeProps` for composing behaviors
- Internationalization as a first-class concern

**Applied:** Is the accessibility implementation based on established patterns? Can behavior hooks compose?

---

## Reference URLs

URLs for studying best-in-class patterns. Fetch when reviewing similar libraries.

### State Management

| Library        | Docs                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------- |
| Zustand        | https://zustand.docs.pmnd.rs, TypeScript: https://zustand.docs.pmnd.rs/guides/typescript |
| Jotai          | https://jotai.org, Core: https://jotai.org/docs/core/atom                                |
| TanStack Store | https://tanstack.com/store                                                               |
| XState         | https://stately.ai/docs, TypeScript: https://stately.ai/docs/typescript                  |
| Nanostores     | https://github.com/nanostores/nanostores                                                 |
| Valtio         | https://valtio.dev                                                                       |

### UI Components

| Library     | Docs                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| Base UI     | https://base-ui.com, Styling: https://base-ui.com/react/handbook/styling                                      |
| Radix UI    | https://www.radix-ui.com, Composition: https://www.radix-ui.com/primitives/docs/guides/composition            |
| React Aria  | https://react-spectrum.adobe.com/react-aria, Architecture: https://react-spectrum.adobe.com/architecture.html |
| Ark UI      | https://ark-ui.com                                                                                            |
| Headless UI | https://headlessui.com                                                                                        |
| Melt UI     | https://melt-ui.com (Svelte)                                                                                  |
| Kobalte     | https://kobalte.dev (Solid)                                                                                   |

### Validation / Data

| Library         | Docs                                                    |
| --------------- | ------------------------------------------------------- |
| Zod             | https://zod.dev, Errors: https://zod.dev/ERROR_HANDLING |
| Valibot         | https://valibot.dev                                     |
| TanStack Query  | https://tanstack.com/query                              |
| tRPC            | https://trpc.io                                         |
| TanStack Router | https://tanstack.com/router                             |

### Utilities

| Library    | Docs                          |
| ---------- | ----------------------------- |
| es-toolkit | https://es-toolkit.slash.page |
| Effect     | https://effect.website        |

---

## Key Pages to Study

When reviewing a specific pattern, fetch these for comparison:

| Pattern             | Fetch                                 |
| ------------------- | ------------------------------------- |
| Type inference      | Zustand TypeScript guide, Zod docs    |
| Middleware/plugins  | Zustand middleware, XState actors     |
| Compound components | Radix primitives, Base UI components  |
| Data attributes     | Base UI styling handbook              |
| `render` prop       | Base UI composition guide             |
| Framework adapters  | TanStack Store, Nanostores            |
| Error handling      | Zod error handling, Effect docs       |
| Accessibility       | React Aria architecture, Radix guides |

---

## Documentation Examples

Best-in-class docs structure to reference:

- **TanStack Query** — Progressive disclosure, guides before API reference
- **Zod** — Single-page with excellent type examples
- **Radix** — Component pages with anatomy, API, accessibility sections
- **React Aria** — Architecture explanation, hooks composition guides

---

## See Also

- [Libraries](libraries.md) — code patterns from these libraries
- [Principles](principles.md) — principles these practitioners embody
