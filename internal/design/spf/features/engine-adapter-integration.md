---
status: implemented
date: 2026-05-20
definition: sketched
---

# Engine-adapter integration

The engine's external-driving contract: `shareSignals` exposes the
composition's writable + readonly signal refs to a consumer callback at
setup time, and `SimpleHlsMediaMixin` is the canonical adapter that
maps a WHATWG HTMLMediaElement-shaped API onto those refs. The
*audience* for this feature is adapter authors and contributors who
need to drive the engine from outside — not end users, who see the
adapter's API only through whatever wraps it (e.g.,
`packages/core`'s `SimpleHlsMedia` class).

The feature ships as a *pair*: the framework-level `shareSignals`
mechanism + the canonical mixin. New adapter shapes (React hooks, RN
bridges, etc.) would compose on top of `shareSignals` independently of
the mixin.

## Status

- **Composition:** `createSimpleHlsEngine` (HLS VoD); `shareSignals`
  composed last so other behaviors' setups have run by the time the
  callback fires
- **Definition depth:** sketched — capability surface and the
  adapter-rationale open question both documented

## Phases of complexity

| Phase | What | Notes |
|---|---|---|
| Writable signal refs via `onSignalsReady` | `shareSignals` captures `Signal<T>` / `ReadonlySignal<T>` refs into a consumer-supplied callback at setup time. Generic over composition shape (`makeShareSignals<S, C>()`) | Per-slot read/write intent is expressed at the use site (callers type captured refs as `Signal<T>` or `ReadonlySignal<T>`). Composed last in the engine so initial state writes are visible to the consumer |
| Mixin adapter pattern | `SimpleHlsMediaMixin` is the canonical consumer: function-of-base-class structure (mix into any base), captures refs once in `onSignalsReady`, exposes a WHATWG HTMLMediaElement-shaped API mapping each setter/method to engine writes | Downstream use: `class SimpleHlsMedia extends SimpleHlsMediaMixin(HTMLVideoElementHost) {}` in `packages/core/src/dom/media/simple-hls/` |
| Media element binding | `attach(el)` writes `context.mediaElement`; `detach()` clears it. **Engine persists across attach/detach cycles** — only `src` reassignment or explicit `destroy()` tears it down | Re-attach to a different element is supported. The engine is the durable state holder; `mediaElement` is a context slot |
| Source assignment via destroy + recreate | Adapter's `set src` destroys the current engine and creates a fresh one, re-applies any explicit preload, re-attaches `mediaElement` to the new engine, and writes the new `{ url }` | Bypasses the in-place source-replacement path. Rationale not documented in code — see Open questions and [source-replacement.md](./source-replacement.md) |
| Preload reflection | `set preload(value)` writes W3C values to `state.preload`; clearing (`preload = ''`) doesn't patch the current engine but is re-applied on the next src change. Pre-attach src + preload combinations are supported | Extended preload values flow through state but don't reach the DOM (per [`preload-modes`](./preload-modes.md)'s sticky-extended-values semantics) |
| Programmatic `play()` with retry | `play()` writes `state.loadActivated = true` (co-writer with `trackLoadTriggers`'s DOM listener path) before invoking native play. **Defensive retry:** if native play rejects with "no supported sources" while src is pending, wait for `loadstart` (MSE attaches blob URL) and retry once | The retry handles MSE pipeline timing — adapter doesn't know exactly when MSE setup attaches the blob URL. Listener canceled on src change |

## What's not implemented

- **Reactive change-notification surface** — `onSignalsReady` fires
  once at setup. Consumers wanting to react to state changes from
  outside the engine must keep refs and subscribe via SPF primitives
  (`effect()`, signal `subscribe()`). The adapter doesn't expose
  curated `onPlay` / `onSrcChange` / `onError` callbacks.
- **Multiple engine instances per adapter** — one engine per adapter
  instance. No built-in pattern for multi-engine scenarios
  (picture-in-picture with two streams, A/B testing).
- **Non-HTMLMediaElement adapter shapes** — React-friendly hooks,
  React Native bridges, etc. would compose on top of `shareSignals`
  independently. Today the canonical adapter is HTMLMediaElement-
  shaped via the mixin. No bracketed candidate features tracked yet;
  add when concrete need surfaces.
- **Curated state / error introspection** — consumers can read
  `signals.state.*.get()` directly, but there's no adapter-level
  "current playback state" / "current error" shape that doesn't
  require knowing the engine's signal map.

## Implementation surface

**Composition:** `packages/spf/src/playback/engines/hls/engine.ts` —
`shareSignals` is the last behavior in the composition. Instantiated
once at module load:

```ts
const shareSignals = makeShareSignals<SimpleHlsEngineState, SimpleHlsEngineContext>();

// ...

return createComposition(
  [
    // ... all other behaviors ...
    shareSignals,
  ],
  { config, initialState }
);
```

**Behavior factory:**

| Export | File | Role |
|---|---|---|
| `makeShareSignals<S, C>()` | `packages/spf/src/core/composition/share-signals.ts` | Generic behavior factory. Returns a `Behavior<StateSignals<S>, ContextSignals<C>, ShareSignalsConfig<S, C>>` whose setup invokes `config.onSignalsReady?.({ state, context })` |
| `ShareSignalsConfig<S, C>` | same | Config interface carrying the `onSignalsReady` callback |

**Canonical adapter:**

| Export | File | Role |
|---|---|---|
| `SimpleHlsMediaMixin<Base>` | `packages/spf/src/playback/engines/hls/adapter.ts` | Function-of-base-class mixin. Captures refs in `onSignalsReady`, exposes WHATWG HTMLMediaElement-shaped API |
| `SimpleHlsMediaElement` | same | Standalone subclass: `SimpleHlsMediaMixin(class {})`. Bare-bones reference instance |
| `SimpleHlsMediaProps` / `SimpleHlsMediaAPI` | same | The adapter's public-facing shape |

**Adapter ↔ engine state/context map:**

| Adapter call | Engine write |
|---|---|
| `attach(el)` | `context.mediaElement.set(el)` |
| `detach()` | `context.mediaElement.set(undefined)` |
| `destroy()` | `engine.destroy()` |
| `set src(value)` | `engine.destroy()` → new engine → `state.presentation.set({ url: value })` |
| `set preload(value)` | `state.preload.set(value)` (W3C values only; pre-empties stay engine-local) |
| `play()` | `state.loadActivated.set(true)` → native `play()` with `loadstart` retry on "no supported sources" |

**Downstream consumer:** `packages/core/src/dom/media/simple-hls/index.ts`:

```ts
export class SimpleHlsMedia extends SimpleHlsMediaMixin(HTMLVideoElementHost) {}
```

This is the canonical end consumer — used wherever the HTML player
expects an HTMLMediaElement-shaped object backed by SPF.

## Config surface

```ts
// ShareSignalsConfig<S, C>
{
  onSignalsReady?: (signals: {
    state: StateSignals<S>;
    context: ContextSignals<C>;
  }) => void;
}
```

The HLS engine config (`SimpleHlsEngineConfig`) extends
`ShareSignalsConfig<SimpleHlsEngineState, SimpleHlsEngineContext>`, so
`onSignalsReady` is part of the engine's config surface.

`SimpleHlsMediaMixin`'s constructor takes optional `config` and threads
it through to every engine instance (including the ones created on
each `set src`).

## Verification

- **Unit tests:**
  - `packages/spf/src/playback/engines/hls/tests/adapter.test.ts` —
    extensive coverage: src assignment / re-assignment / clear,
    engine recreation on src change, mediaElement preservation across
    src changes, play retry on `loadstart`, preload propagation,
    attach/detach lifecycle
  - `packages/spf/src/playback/engines/hls/tests/engine.test.ts`
    → "allows patching state and owners from outside" — direct
    engine-level write surface (bypasses the mixin)
  - `packages/spf/src/core/composition/tests/share-signals.test.ts`
    — the behavior itself
- **Downstream usage:**
  - `packages/core/src/dom/media/simple-hls/index.ts` —
    `SimpleHlsMedia` consumer
- **Walkthrough:**
  - `packages/spf/docs/hls-engine.md` Stage 10 — high-level coverage
    of the pattern

## Open questions

- **Destroy-recreate vs in-place source replacement.** The canonical
  adapter destroys + recreates the engine on every `src` change, even
  though the engine's behaviors support in-place
  `state.presentation` overwrite (validated by
  [`source-replacement`](./source-replacement.md)'s test). The
  rationale isn't documented in the code or commit history. Possible
  motivations: stricter isolation between sources; simpler reasoning
  per-engine; guarding against latent cleanup-cascade bugs. Worth
  resolving when the cost of either choice surfaces.
- **Callback timing semantics.** `shareSignals`'s JSDoc explicitly
  notes the callback fires while other behaviors are still in setup;
  reads inside the callback may yield only initial-seed values. The
  documented use is "capture refs, use later." Is read-at-setup-time
  ever a supported case, or always discouraged?
- **Mixin base-class genericity.** `SimpleHlsMediaMixin<Base extends Constructor<any>>`
  accepts any base; today's only documented consumer is
  `HTMLVideoElementHost`. Other bases are structurally allowed but
  not exercised — if usage broadens, the contract may need
  tightening.

## Related features

- **preload-modes** — adapter `set preload(value)` and `play()` are
  external writers on `state.preload` and `state.loadActivated`
  respectively. The adapter's preload-clearing semantics (clear
  `#preload` but don't patch the current engine) interact with
  `preload-modes`'s sticky-extended-values rule.
- **source-replacement** — adapter `set src` is the canonical
  user-facing entry into source replacement. The adapter's
  destroy-recreate path bypasses the in-place reactor cascade — see
  [`source-replacement.md`](./source-replacement.md) for the in-place
  contract and the same open question.
- **mse-mms-pipeline** — adapter `attach(el)` binds the element MS
  attaches to. The engine handles the rest of the MS lifecycle via
  the resolved/unresolved cascade.
- **audio-playback** / **subtitles** / **video-abr** /
  **buffer-management** — all driven by engine state the adapter
  writes through. The adapter doesn't expose these features' surfaces
  directly; consumers read engine state via the captured signal refs.

## See also

- [clusters.md § Engine lifecycle](./clusters.md#engine-lifecycle)
- [packages/spf/docs/hls-engine.md § Stage 10](../../../../packages/spf/docs/hls-engine.md)
  — `shareSignals` and the adapter pattern walkthrough
- [conventions/signals.md](../conventions/signals.md) — per-slot
  `Signal<T>` / `ReadonlySignal<T>` intent (relevant for how consumers
  type captured refs at the use site)
- `packages/core/src/dom/media/simple-hls/index.ts` — canonical
  downstream consumer
