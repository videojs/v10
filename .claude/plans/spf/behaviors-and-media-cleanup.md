---
status: in-progress
branch: fix/spf-behaviors-and-media-cleanup
parent: refactor/spf-discrete-signals-and-behavior-objects
---

# SPF: behaviors + media/network cleanup

Iterative cleanup pass on `packages/spf/src/playback/behaviors/`, `packages/spf/src/media/`, and `packages/spf/src/network/`, now that the discrete-signals + behavior-as-object architecture has stabilized.

Driven by codebase evaluations rather than a pre-planned target list — findings accumulate here as they're identified.

## Branch context

- Branched off `refactor/spf-discrete-signals-and-behavior-objects` (not yet merged to `main`).
- The parent will **squash-merge**. Once it lands, rebase this branch onto `main` directly (do **not** merge the squashed commit back in — that produces duplicate-ish history).

## Scope

In bounds:

- `packages/spf/src/playback/behaviors/**`
- `packages/spf/src/media/**`
- `packages/spf/src/network/**`

Adjacent code is fair game when a cleanup pulls on it (e.g. an engine consumer of a behavior, a shared util), but we shouldn't expand into unrelated SPF areas without a separate branch.

Out of bounds (own branches if they come up):

- Stage-D-style architecture changes — that effort is closed.
- Doc refreshes for `hls-engine.md` / `fundamentals.md` — those have their own follow-up.
- Stale items called out in `discrete-signals-and-behavior-objects.md` `### Resuming` (writer-audit lint rule, `selectedVideoTrackId` decomposition, code-reuse follow-up across `select-tracks`/`resolve-track`/`load-segments`) — surface them if they overlap, otherwise leave for their own branches.

## Findings

_(populated as evaluations land)_

## Decisions

### `setupTrackResolution` reshaped to behavior-setup signature

**Commit**: `54707e59`
**File**: `packages/spf/src/playback/behaviors/resolve-track.ts`

Changed from positional `(state, selectedKey, findTrackToResolve)` to single deps-object `({ state, config })` matching `Behavior.setup`. Per-type config flows through `config`; per-type exports (`resolveVideoTrack` / `resolveAudioTrack` / `resolveTextTrack`) adapt the call inline.

**Axes**: C ↑ (Patternability) — helper signature now matches setup signature; readers don't context-switch on shape. E ≈ (Size) — call sites grow ~3 lines each. D ≈ (Simplicity) — net wash.

**Convention invoked**: [`conventions/behaviors.md`](../../../internal/design/spf/conventions/behaviors.md) "Helpers and behavior factories." Surfaced a third option not previously named in the doc — **setup-shape helper** — distinct from both inline helpers (no signal access) and behavior factories (wrap `defineBehavior`). Conventions doc updated in the same follow-up commit to add the category, the decision-table row, and a `setup*` naming convention.

**Considered and ruled out**: behavior factory (B). The factory would have hidden `defineBehavior` inside `makeResolveTrack(opts)`, giving lighter call sites. Rejected because the setup-shape helper is reproducible across many shared helpers as a uniform shape rule, while the factory pattern is more bespoke; the user explicitly preferred the lighter touch and reproducibility for **C** + **E** even at a small **E** cost at call sites.

**Follow-ups in same area** (status updated post-iteration):
- ~~AbortController vs. manual cleanup composition~~ — **dissolved** as a side effect of the reactor migration (state-exit cleanup replaces the manual `() => { runner.abortAll(); cleanup(); }` composition). Remains a candidate cleanup for other behaviors.
- Two inline TODOs in body about `createTaskRunner` / `createResolveTrackTask` — no-good-fit-yet sniffs, **still held visibly**.
- The `findTrack` helper's `switchingSets[0]` access — part of the cross-cutting "single switching-set" assumption cluster, **still untouched**.

### `setupTrackResolution` iteration — cumulative arc

Building on the entry above, the full iteration on `setupTrackResolution` produced both architectural changes to the behavior and three new core/signals helpers. The arc, with commit references:

1. **Setup-shape signature** (`54707e59`) — see entry above.
2. **Config destructuring** (`3956646d` / `2f193397`) — fold `const { ... } = config;` into the parameter list. Applied symmetrically to `setupTrackSelection` to validate the "reproducible pattern" claim.
3. **ID-equality computed** (`2bd3cf0f` → `4f280e4c` → `2ee69cbf`) — collapse presentation churn into id-level changes via `computed` with custom equality. Surfaced `equalsById` as a candidate library helper.
4. **`update()` for atomic commit** (`cc0657d1`) — replace read-check-set with `update(signal, updater)`. Surfaced the `T extends object` constraint as a candidate relaxation.
5. **Reactor migration** (`4d0ab17f`) — convert hand-rolled FSM (effect + closure-state `lastPresentationId`) to `createMachineReactor` with `'unresolved'` / `'resolving'` states; abort-on-state-exit binds source-change cancellation to the state machine.
6. **Library evolution** (`51b0d9db`, `abe38a48`, `d8e97753`) — `equalsById` + `update` overload (function form / partial form), then `peek(signal)` followed by `peek(signal, transform?)`.
7. **Library consumption + simplification** (`ccc0404b`, `8f430484`, `a080beb6`, `5456d9db`) — drop the `update` cast; replace `presentationById` with `peek(state.presentation)` since the reactor's monitor already handles the relevance filter; remove the commit-time id check (defense-in-depth that was no longer needed).
8. **Worked-example documentation** (`f707b0e9`) — comment the `entry: () => () => runner.abortAll()` idiom inline.
9. **Conventions docs updated** (`a52aba67`, `57b46de1`, `3481eb1c`, this commit) — `reactors.md` added (when-to-use Reactors, deriveState+monitor convention, entry-returns-state-exit-cleanup idiom, source-identity states); `behaviors.md` adds Source-reset handling section + defense-in-depth anti-pattern; `signals.md` documents `peek` / `equalsById` / `update` overload pair.

**Generalizable lessons** (now documented):

- Setup-shape helpers as a third decomposition option (`behaviors.md` "Helpers and behavior factories").
- `peek` inside reactor effects (`signals.md` + `reactors.md` cross-references).
- `equalsById` for filtering id-preserving updates (`signals.md` "Helper functions").
- `update` overload pair (function form + partial form) (`signals.md`).
- Reactor-with-source-identity-states + abort-on-state-exit (`reactors.md` + `behaviors.md` "Source-reset handling").
- Defense-in-depth checks need an articulated failure mode (`behaviors.md` anti-patterns).
- Multi-step library-evolution rhythm: feat (add helper) → refactor (consume helper) (`signals.md` "Extending the SPF signals library").

**Re-assessment of original assessment findings for resolve-track**:

- "fight-the-shape sniff: closure-state FSM" — **addressed** by reactor migration.
- "Manual cleanup composition" — **dissolved** as a side effect of the reactor refactor.
- "Inline TODOs about `createTaskRunner` / `createResolveTrackTask`" — **still pending** (no-good-fit-yet held visibly).
- "`switchingSets[0]` in `findTrack`" — **still untouched** (cross-cutting cluster).
