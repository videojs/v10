# Core DX Principles

What makes a library feel great to use.

## 1. TypeScript-First (Inference-First)

Users write less, get more. Types flow from usage.

```ts
// Great DX: types just work
const store = createStore({ count: 0 });
// State type is inferred as { count: number }

// Poor DX: requires explicit annotation
const store = createStore<{ count: number }>({ count: 0 });
```

**What to look for:**

- Can you use the API without explicit generics?
- Do return types narrow based on input?
- Are helper types exported for extracting types when needed?
- Do type guards enable proper narrowing?

---

## 2. Config Objects Over Positional Args

Config objects scale and self-document. Positional args don't.

```ts
// Great DX: clear what each value means
createSlider({ min: 0, max: 100, vertical: true });

// Poor DX: what does `true` mean?
createSlider(0, 100, true);
```

**What to look for:**

- Does the API use objects for multiple options?
- Are options self-documenting via property names?
- Can you add options without breaking existing calls?

---

## 3. Smart Defaults + Explicit Escape Hatches

Simplest call "just works"; power is opt-in.

```ts
// Works out of box
useQuery({ queryKey: ['todos'], queryFn: fetchTodos });

// Explicit escape hatch when needed
useQuery({ queryKey: ['todos'], queryFn: fetchTodos, staleTime: Infinity });
```

**What to look for:**

- Does the minimal API do something useful?
- Are advanced options optional, not required?
- Can you customize without losing defaults?

---

## 4. Composition Over Monolith

Small pieces that combine > mega-objects and prop explosions.

```ts
// Great DX: compose what you need
const store = createMediaStore({
  slices: [playbackSlice, volumeSlice, fullscreenSlice],
});

// Poor DX: everything-in-one, can't tree-shake
const store = createMediaStore({ features: 'all' });
```

**What to look for:**

- Can you import only what you need?
- Are features composable via combination?
- Does the bundle reflect what you use?

---

## 5. Minimal API Surface (One Way)

Fewer concepts. Fewer ways to do the same thing.

```ts
// Great DX: one obvious way
store.setState({ volume: 0.5 });

// Poor DX: multiple ways (which to use?)
store.setState({ volume: 0.5 });
store.set('volume', 0.5);
store.volume = 0.5;
```

**What to look for:**

- Is there one clear way to do each task?
- Are similar operations consistent?
- Does the API avoid aliases that do the same thing?

---

## 6. Errors That Help

Errors explain: what happened, why, and how to fix.

```ts
// Great DX: actionable error
throw new AttachError('already-attached', {
  hint: 'Call store.detach() before attach(), or create a new store.',
});

// Poor DX: cryptic error
throw new Error('Invalid state');
```

**What to look for:**

- Do errors include context (what operation, what state)?
- Do errors suggest fixes?
- Are error types typed and catchable?

---

## 7. Progressive Disclosure

Happy path tiny; advanced power available.

```ts
// Level 1: just works
const store = createMediaStore()
store.attach(video)

// Level 2: customize
const store = createMediaStore({ slices: [volumeSlice, playbackSlice] })

// Level 3: full control
const store = createMediaStore({ slices: [...], middleware: [logger] })
```

**What to look for:**

- Can beginners succeed with minimal code?
- Is complexity revealed progressively?
- Can experts reach lower-level APIs when needed?

---

## 8. Borrow Platform Patterns

Don't invent paradigms. Use familiar names and behaviors:

- DOM events: `addEventListener`, `removeEventListener`
- Fetch-style options objects
- Abort/cancellation: `AbortController` and `signal`
- Async iteration for streams
- `subscribe/unsubscribe` patterns

**What to look for:**

- Does the API feel familiar?
- Are conventions from the platform respected?
- Do naming patterns match web standards?

---

## 9. Controlled + Uncontrolled Support

Support both patterns with consistent naming:

```tsx
// Uncontrolled - library manages state
<Dialog defaultOpen>...</Dialog>

// Controlled - consumer manages state
<Dialog open={isOpen} onOpenChange={setIsOpen}>...</Dialog>
```

**Convention:** `defaultValue`/`value`, `defaultOpen`/`open`, with `onXxxChange` callbacks.
