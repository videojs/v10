# `@videojs/spf` source layout

Guidance for AI agents and contributors working in `packages/spf/src/`.

## Top-level layout

```
src/
  core/        SPF runtime primitives — signals, effects, tasks, actors, reactors, composition
  media/       CML-like media building blocks — types, parsers, ABR, buffer logic, MSE/VTT primitives
  network/     HTTP fetch utilities, chunked-stream iterables
  playback/    Playback domain — composes core+media+network into engines
    behaviors/ Compositional behaviors that drive playback (use signals/effects)
    actors/    Actor factories used inside behaviors
    engines/   Assembled playback engines (currently just hls/)
```

`media/`, `network/`, and `playback/behaviors/` each have a `dom/` subdirectory for DOM-bound code (browser APIs like `HTMLMediaElement`, `MediaSource`, `VTTCue`). DOM-free code lives outside those subdirs.

## Dependency rules

| From → To | Allowed? | Enforced by |
|---|---|---|
| `media/` → `core/` | ❌ | `media/tsconfig.json` does not reference `core` |
| `media/` → `network/` | ❌ | `media/tsconfig.json` does not reference `network` |
| `media/` → `playback/` | ❌ | `playback/` not referenced |
| `network/` → `core/` | ❌ | `network/tsconfig.json` has empty `references` |
| `network/` → `media/` | ❌ | same |
| `network/` → `playback/` | ❌ | same |
| `core/` → `media/`, `network/`, `playback/` | ❌ | `core/tsconfig.json` does not reference downstream subtrees |
| `core/` → DOM | ❌ | `core/tsconfig.json` `lib` excludes `DOM` |
| `media/` (non-dom) → DOM | ❌ | `media/tsconfig.json` `lib` excludes `DOM` |
| `network/` → DOM | ❌ | `network/tsconfig.json` `lib` excludes `DOM` |
| `playback/behaviors/` (non-dom) → DOM | ❌ | tsconfig `lib` excludes `DOM` |
| `playback/actors/` (non-dom) → DOM | ❌ | tsconfig `lib` excludes `DOM` |
| `playback/` → `core/`, `network/`, `media/` | ✅ | references in playback tsconfigs |
| `playback/engines/hls/` → `playback/behaviors/`, `playback/actors/` | ✅ | references |
| `playback/engines/hls/` → `core/`, `media/` | ✅ — engines compose primitives directly | references |

The substance: `core/`, `media/`, `network/` are framework-agnostic foundations. `playback/` is the SPF-integrated layer that composes them. Engines live at the top of the dependency tree and may reach into any foundation.

## Where to put new code

- **Pure media/streaming logic** (parsers, types, selection algorithms, MSE/VTT helpers without signals): `media/` or `media/dom/`. Must not import from `core/`.
- **Compositional behavior driving state** (uses `effect`/`computed`/`update` against owners or state signals): `playback/behaviors/` or `playback/behaviors/dom/`.
- **Actor factories** (long-lived stateful units that receive messages): `playback/actors/` or `playback/actors/dom/`.
- **Engine compositions** (wiring behaviors+actors+config into a `createComposition` call): `playback/engines/<name>/`.
- **Generic, framework-agnostic utilities** that aren't media-specific: prefer `@videojs/utils` over creating new homes inside spf.

If a module looks like a primitive but reaches into `core/`, that's a smell — consider whether the signal binding can move to the call site (see `onMediaSourceReadyStateChange` for a callback-shaped primitive that lets the consumer create the signal).

Conversely: if a function inside `playback/behaviors/` (or `playback/actors/`) has no `core/` dependency — no signals, effects, or reactors — it probably belongs in a layer below (`media/`, `network/`, or `@videojs/utils`). Same layering principle, opposite direction. When reviewing a behavior or actor file, scan its top-level helpers; any pure data-manipulation / lookup / format-handling code with no reactive concerns is a candidate to extract.

## DOM-vs-not enforcement

The DOM/no-DOM split is enforced by `lib` settings on each subtree's `tsconfig.json`:
- DOM-free subtrees use `lib: ["ES2022", "WebWorker"]` — referencing `HTMLMediaElement`, `document`, etc. fails typecheck.
- DOM subtrees use `lib: ["ES2022", "DOM", "DOM.Iterable"]`.

This is structural — you cannot accidentally import DOM types into a non-DOM module without surfacing a typecheck error.

## Public exports

External consumers go through three entry points (defined in `packages/spf/package.json`):
- `@videojs/spf` — main entry (`src/index.ts`): runtime-agnostic primitives + media/network helpers.
- `@videojs/spf/dom` — DOM-bound exports (`src/dom.ts`): re-exports from `playback/behaviors/dom/` and `media/dom/`.
- `@videojs/spf/hls` — HLS engine (`src/playback/engines/hls/index.ts`).

Internal paths are not part of the public API. Don't import from `@videojs/spf/playback/...` or similar deep paths in other workspace packages.

## Vitest projects

`packages/spf/vitest.config.ts` shards tests by area:
- `core`, `media`, `network`, `behaviors` — Node, no browser
- `dom` — Chromium via Playwright, covers all `**/dom/**/*.test.ts` across subtrees
- `playback-engines` — Chromium, covers engines/
- `types` — type-only tests via tsgo

When adding a test in a new location, check the project globs match.

## Code style

SPF-specific style preferences. These extend the workspace-wide rules in the root `CLAUDE.md` — they apply across `packages/spf/src/`, not just behaviors. (Style guidance specific to a single domain — behavior naming, reactor state names, signal access patterns — lives in `internal/design/spf/conventions/` instead.)

### Prefer `const` + ternary over `let` + conditional reassignment

For single-branch derivations of one value, use a `const` with a ternary rather than a `let` that gets conditionally overwritten:

```ts
// Good
const duration = maxBufferedEnd > target ? maxBufferedEnd : target;

// Avoid
let duration = target;
if (maxBufferedEnd > duration) {
  duration = maxBufferedEnd;
}
```

The `const`-ternary form makes the value's identity immutable from its first binding — readers don't have to scan ahead for reassignment, and the dependency on each branch's inputs is structurally clear. `let` is appropriate when the variable is genuinely mutable across multiple statements (accumulators, loop indices, state that flips on conditions other than a single-shot derivation); reserve it for those cases.
