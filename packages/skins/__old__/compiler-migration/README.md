# Parked: constrained-JSX skin migration

This directory holds the **in-flight `@videojs/compiler` skin migration** —
the constrained-JSX skin sources (`*/skin.tsx`) and their refactored Tailwind
token layer (`*/tailwind/**`, `tailwind.css`). It is **excluded from build,
typecheck, and lint** (sibling of `src/`, outside the skins tsconfig `include`
and tsdown globs).

## Why it's parked

The migration's token refactor rewrote the shared token modules from the
**function API** that ships on `main` (`root = (isShadowDOM) => cn(...)`, flat
exports) into a **string-aggregate API** (`video`/`audio` nested objects) that
the constrained-JSX skins consume. `main` has since built 16 runtime skin files
on the function API — including the new `live-video` / `live-audio` presets —
which the new token shape cannot satisfy without porting. That port was
deferred, so this work is parked rather than wired live.

## What's NOT here (preserved elsewhere)

The full migration snapshot — build wiring, generated React skins/CSS, core
component manifests, icons generate config, html/react skin edits — lives in the
git tag **`backup/pre-rebase-2b2bbfad`**. See `.claude/plans/compiler-rebase-audit.md`
for the audit and the port backlog.

## To resume

Port `main`'s new components/presets (airplay, live button, settings menu,
playback-rate menu, `live-*` presets) onto the aggregate token shape, then
re-wire `packages/react`'s `compileSkins` step. The `@videojs/compiler` package
itself is already landed and tested on the branch.
