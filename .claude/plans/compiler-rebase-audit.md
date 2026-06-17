# Compiler Branch — Rebase onto origin/main: Audit & Reconciliation Plan

Working notes for rebasing the `@videojs/compiler` work (branch `t3code/2b2bbfad`,
19 commits) onto the current `origin/main` (88 commits ahead of the old merge-base
`587c302fe`). Backup of the pre-rebase tip: tag `backup/pre-rebase-2b2bbfad`.

## Strategy (decided)

1. **Reset onto main, recommit in 2 groups** — base the branch on `origin/main`,
   re-apply our work as (1) the additive `@videojs/compiler` package and
   (2) freshly regenerated skins + build wiring. Generated artifacts are rebuilt,
   not merge-patched.
2. **Carry main's legacy skin files into `__old__`** — take `origin/main`'s current
   legacy skin sources as content, then relocate them to `__old__` per the branch's
   staging strategy.
3. **Audit + reconcile build wiring only** — land a building, typechecking branch;
   do NOT author constrained-JSX for the new upstream components in this pass.
   Porting them is deferred (see "Deferred porting backlog").

## New upstream functionality (not covered by our compiler skins)

Main has no `@videojs/compiler` package — the compiler is entirely our branch's work.
Since the old merge-base, main added substantial UI the compiler skins predate.

### New core UI components (`packages/core/src/core/ui/`)
- `airplay-button` (#1531, #1614)
- `live-button` (#1473)
- `menu` (settings menu; #1615, #1503 core + keyboard nav)
- `playback-rate-radio-group` (#1527 playback-rate menu)
- `captions-radio-group`
- `input-feedback`

Our branch has manifests (`*-component.ts`) only for the 25 components that existed
at the old base. The 6 new ones have no manifests, so `vjs generate` will not include
them in `__generated__/components.ts`. Acceptable for "build wiring only" — they're
simply absent from the constrained-JSX component set.

### New React presets (`packages/react/src/presets/`)
- `live-video`, `live-audio` (#1399) — full skin set (`skin.tsx`, `skin.tailwind.tsx`,
  `minimal-skin.*`, `.css`, `index.ts`). Our compiler pipeline does not generate these.

### New React UI (`packages/react/src/ui/`)
- `airplay-button`, `live-button`, `menu`, `playback-rate`, `captions-radio-group`,
  `input-indicators`, `seek-indicator`, `status-announcer`, `status-indicator`,
  `volume-indicator`, plus `gesture/index.ts`, `hotkey/index.ts` barrels.

### Other feature work touching skins
- Media tracks & renditions (#1664), Google Cast default for HLS/DASH (#1661),
  fullscreen orientation lock (#1656), scrubber preview timestamps (#1652),
  menu group labels (#1643), scoped menu data-attrs (#1628), gestures/hotkeys UI (#1388).

## Conflict surface (30 files both sides changed)

Build/config (take main as base, layer our additions):
- `biome.json` (main +13/-1, ours +22) — merge both rule sets.
- `tsconfig.json` (main +9/-1, ours +2) — add `packages/compiler` project ref.
- `pnpm-lock.yaml` — regenerate via `pnpm install`.
- `package.json` (root) — our `check:components`, compiler scripts.
- `packages/core/tsdown.config.ts` (main +11/-24, ours +9/-9) — re-add generate hook.
- `packages/react/tsdown.config.ts` (main +4/-17, ours +114/-2) — re-apply compileSkins.
- `packages/skins/tsdown.config.ts` (main +4/-17, ours +6/-8).
- `packages/icons/scripts/build.ts` (main +145/-77, ours +29) — main rewrote heavily;
  re-apply our compiler-config generate step onto main's version.
- `packages/{core,react,icons,skins}/package.json` — exports + scripts.

Skins tokens (both edited):
- `packages/skins/src/{default,minimal}/tailwind/*.tailwind.ts`,
  `components/{root,seek,slider}.ts`, `shared/tailwind/icon-state.ts`
  (still present on main; our branch inlined/flattened it).

Unrelated (drop from our set — belongs to main or a separate change):
- `packages/spf/src/dom/features/track-playback-initiated.ts` — was wrongly folded into
  a compiler commit; main owns this. Take main's version, drop ours.

## Legacy files to relocate into `__old__` (carry main's content)
- React: `presets/{video,audio}/skin.tsx|css`, `minimal-skin.tsx|css`,
  `presets/background/skin.tsx|css` (main's latest, incl. ejected-skin slider fix #1660,
  scrubber preview #1652, audio overflow #1623).
- HTML: `cdn/*`, `define/{audio,video}/{skin,minimal-skin}.{ts,css}`.
- Skins: `{default,minimal}/css/**`, `shared/tailwind/icon-state.css`.

## Compiler `vanilla-css` correctness — DONE (commit `fix(compiler): vanilla-css correctness`)
- ✅ Marker-class drop (`group`/`peer`) — preserved on the element.
- ✅ Class-name collisions — `DiagnosticError` thrown on same-name/different-styles.
- ✅ Undefined theme vars — `emitCss` emits a resolved theme block via `resolveThemeVar`.
- ⬜ Follow-up: `@property`-registered `--tw-*` slots (e.g. `--tw-content`) still
  resolve to `undefined`; emit their `@property` initial values or inline them.

## Deferred porting backlog (NOT this pass)
- Constrained-JSX for airplay/live/menu/playback-rate components + manifests.
- `live-video` / `live-audio` compiler presets.
- Regenerate skins to include the above; wire `resolveThemeVar`/`themeSelector`
  into `packages/react`'s `compileSkins` `emitCss` call when it's re-enabled.
- Resolve the real collisions the new diagnostic surfaces (`time-value`,
  `seek-icon`, `spinner-icon`) via `overrides` or distinct tokens.

## Verification gates
`pnpm install` → `pnpm -F @videojs/compiler build` → `pnpm typecheck` →
`pnpm -F @videojs/core generate` (drift) → `pnpm build:packages` → `pnpm check:workspace`.
