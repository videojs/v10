# Vendored Shaka Player build

`shaka-player.vjs.js` (+ matching `.d.ts`) is a custom Closure build of Shaka
Player that `@videojs/media/dom/shaka` imports through the `#shaka` package
import. It exists because the published shaka-player package is one
Closure-compiled IIFE — bundlers cannot tree-shake it, so the only lever on
size is which build you ship. This build is `@complete` minus the groups
Video.js never reaches:

| Excluded group | Why it is safe to drop |
| --- | --- |
| `ui`, `polyfillForUI` | Video.js renders its own UI. |
| `cast` | `<google-cast>` drives the CAF sender directly; Shaka's CastProxy/sender/receiver are unused. |
| `ads` | No ad-manager integration. This also drops Shaka's HLS/DASH interstitials handling, which lives in the ads code. |
| `offline`, `queue` | The Shaka media exposes no download-for-offline or playlist surface. |
| `optionalText` | In-manifest SRT/LRC parsers; sideloaded text goes through native `<track>`s. |
| `msf`, `dashJson` | Experimental; Shaka's own published non-experimental bundles exclude them too. |

DASH, HLS, the MPEG-TS transmuxer, DRM (Widevine/PlayReady/FairPlay), in-manifest
WebVTT/TTML, CEA-608/708, thumbnails, chapters, and CMCD/CMSD are all kept.
Measured against the alternatives (raw / gzip):

| Bundle | raw | gzip |
| --- | --- | --- |
| `shaka-player.compiled.js` (npm default, ES5) | 825 kB | 271 kB |
| `shaka-player.compiled-es2021.js` (npm) | 712 kB | 240 kB |
| **this build** | **587 kB** | **202 kB** |

## Rebuilding

```bash
pnpm -F @videojs/media build:shaka          # no-op if vendor matches the installed shaka-player
pnpm -F @videojs/media build:shaka --force  # rebuild regardless
```

The script rebuilds only when the installed `shaka-player` devDependency version
(or the build recipe itself) no longer matches `build-info.json`, so the usual
flow after a Shaka upgrade is: bump `shaka-player` in `devDependencies`,
`pnpm install`, run the script, and commit `vendor/shaka/*` with the bump.

### Environment

The Shaka build toolchain is intentionally not part of the contributor
workflow — nothing in `pnpm install`, `pnpm build`, or tests runs it. To run
this script you need:

- `git` and network access — the npm tarball does not ship Shaka's `build/`
  tooling, so the script shallow-clones `shaka-project/shaka-player` at the
  installed version's tag (cached under `node_modules/.cache/shaka-build`).
- `python3` — Shaka's build scripts, standard library only (no pip packages).
- **Java 21+** — Shaka's pinned Closure Compiler jar refuses older JVMs
  (`UnsupportedClassVersionError`). Any Temurin 21+ works; point
  `JAVA_HOME`/`PATH` at it if it is not your default.
- The checkout's own `npm ci` runs automatically on first build (this is what
  pins the Closure Compiler and .d.ts generator versions, keeping the output
  reproducible).

macOS and Linux are exercised; Windows is untested (Shaka's build scripts have
cygwin handling, but no promises).

## Roadmap

1. **Now**: vendored artifact + this script, rebuilt manually on Shaka bumps.
2. **Next**: a CI job that runs the script on ubuntu-latest whenever the
   shaka-player version changes and fails if `vendor/shaka` was not updated to
   match (the build is reproducible — `npm ci` pins the compiler).
3. **Eventually**: upstream feature request for a published "player-only"
   bundle (compiled minus ui/cast/ads/offline/queue) so this directory can be
   deleted.

The script converts the bundle into a real ES module (shadowed
`module`/`exports` capture the UMD's namespace, an appended `export default`
hands it out) and shims the browser global `self` for the duration of the
evaluation — Shaka's wrapper reads it at module scope, which server runtimes
do not define. This is what lets `@videojs/media/dom/shaka` be imported the
same way by Node during SSR, Vite's dev server, and production bundlers.

`LICENSE` is Shaka Player's Apache-2.0 license; the bundle also retains its
`@license` header comment.
