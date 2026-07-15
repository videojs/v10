# @videojs/spf source guide

Treat source and colocated tests as implementation truth. Use internal/design/spf only for durable rationale and conventions.

## Layers

- core: framework-neutral composition, signals, tasks, actors, and reactors. It must not depend on media, network, or playback.
- media: media models, algorithms, and format parsing; browser media helpers live under media/dom.
- network: fetch and bandwidth primitives.
- playback: playback actors, behaviors, and engines; browser-bound playback code lives in nested dom directories.
- index.ts and dom.ts are the primary entry points. Package exports also expose HLS and background-video compositions.

Place code in the lowest layer that satisfies its dependencies. Keep browser APIs out of core and review public entry-point changes deliberately.

## Working rules

- Read only the relevant file under internal/design/spf/conventions.
- Follow nearby ownership, lifecycle, cleanup, and test patterns.
- Add public exports intentionally and check their bundle impact when relevant.
- Prefer clear expressions over mutable intermediate state when both remain readable.

## Verification

Use the narrowest relevant test while iterating, then run as appropriate:

```bash
pnpm -F @videojs/spf test
pnpm -F @videojs/spf build
pnpm -F @videojs/spf size
```

Load one specialized SPF skill only when the requested workflow needs it.
