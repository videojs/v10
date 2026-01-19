# AI/Agent Readiness Pattern

How to make documentation consumable by AI assistants and coding agents.

## llms.txt

Provide documentation in a single, AI-optimized file.

### Structure

```markdown
# Video.js 10

> A framework-agnostic media player library.

## Quick Start

npm install @videojs/core

import { createPlayer } from '@videojs/core';
const player = createPlayer({ src: 'video.mp4' });

## Core Concepts

- [State Management](/docs/concepts/state.md)
- [Requests](/docs/concepts/requests.md)
- [Events](/docs/concepts/events.md)

## API Reference

- [createPlayer](/docs/api/create-player.md)
- [Player](/docs/api/player.md)

## Adapters

- [React](/docs/adapters/react.md)
- [Vue](/docs/adapters/vue.md)
- [Svelte](/docs/adapters/svelte.md)
```

### Sizes

Provide multiple versions for different context windows:

| File | Size | Content |
|------|------|---------|
| `llms.txt` | ~10k tokens | Overview + links |
| `llms-small.txt` | ~5k tokens | Quick ref only |
| `llms-full.txt` | ~50k tokens | Complete docs |

### URL Pattern

```
https://videojs.com/llms.txt
https://videojs.com/llms-small.txt
https://videojs.com/llms-full.txt
https://videojs.com/docs/api/player.md  # Direct markdown
```

## AGENTS.md

Include in package root for AI coding agents.

```markdown
# AGENTS.md

## Project

Video.js 10 - Framework-agnostic media player.

## Structure

packages/
├── core/          # Framework-agnostic logic
├── dom/           # Vanilla JS components
├── react/         # React adapter
├── vue/           # Vue adapter
├── svelte/        # Svelte adapter
└── solid/         # Solid adapter

## Commands

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint

# Type check
pnpm typecheck

## Code Style

- TypeScript strict mode
- Prefer `const` over `let`
- Use named exports
- Document public APIs with TSDoc
- Test files: `*.test.ts`

## Key Files

- `packages/core/src/player.ts` — Main player class
- `packages/core/src/state.ts` — State management
- `packages/core/src/request.ts` — Request system

## Testing

# Run all tests
pnpm test

# Run specific package
pnpm --filter @videojs/core test

# Watch mode
pnpm test --watch
```

## TSDoc/JSDoc

Document all public exports:

```ts
/**
 * Creates a new player instance.
 *
 * @param options - Configuration options
 * @returns A new Player instance
 *
 * @example
 * ```ts
 * import { createPlayer } from '@videojs/core';
 *
 * const player = createPlayer({
 *   src: 'video.mp4',
 *   autoplay: true,
 * });
 * ```
 *
 * @remarks
 * The player must be attached to a media element before playback.
 * Use {@link Player.attach} to connect to an element.
 *
 * @see {@link PlayerOptions} for all configuration options
 * @see {@link Player} for the returned instance type
 */
export function createPlayer(options: PlayerOptions): Player {
  // ...
}
```

### Required Tags

| Tag | Usage |
|-----|-------|
| `@param` | Every parameter |
| `@returns` | Non-void return |
| `@example` | At least one |
| `@throws` | If can throw |
| `@see` | Related items |

### Optional Tags

| Tag | Usage |
|-----|-------|
| `@remarks` | Implementation details |
| `@defaultValue` | Default values |
| `@deprecated` | Deprecation notice |
| `@since` | Version introduced |
| `@beta` / `@alpha` | Stability |

## Self-Contained Examples

AI agents need examples that work without external context:

```ts
// ❌ Bad — requires context
player.play();

// ✅ Good — self-contained
import { createPlayer } from '@videojs/core';

const video = document.querySelector('video');
const player = createPlayer({ src: 'video.mp4' });

await player.attach(video);
await player.play();
```

### Include All Imports

```ts
// ❌ Assumes imports exist
const player = createPlayer(options);

// ✅ Shows exactly what to import
import { createPlayer } from '@videojs/core';
import type { PlayerOptions } from '@videojs/core';

const options: PlayerOptions = { src: 'video.mp4' };
const player = createPlayer(options);
```

### Show Expected Output

```ts
console.log(player.state);
// Output:
// {
//   currentTime: 0,
//   duration: 120,
//   paused: true,
//   volume: 1,
//   muted: false,
// }
```

### Include Error Cases

```ts
try {
  await player.play();
} catch (error) {
  // Error: NotAllowedError - Autoplay blocked by browser
}
```

## Markdown Export

Every documentation page should be available as raw markdown:

```markdown
## Viewing as Markdown

This page is available in markdown format:
[View as Markdown](/docs/api/player.md)
```

Or automatic via URL suffix:

```
/docs/api/player       → HTML page
/docs/api/player.md    → Raw markdown
```

## Context Window Optimization

Write docs that work within token limits:

### Chunk by Concept

```markdown
<!-- Good: One concept per section -->
## State

The player state is a readonly object...

## Requests

Requests are used to change state...
```

### Avoid Redundancy

```markdown
<!-- Bad: Repeats information -->
The `play()` method plays the video. When you call `play()`,
the video will start playing.

<!-- Good: Concise -->
`play()` starts playback.
```

### Front-Load Important Info

```markdown
<!-- Good: Key info first -->
## createPlayer

Creates a player instance. Returns `Player`.

const player = createPlayer({ src: 'video.mp4' });

### Options
...
```

## MCP Server

For advanced integration, provide an MCP server:

```json
{
  "name": "videojs-docs",
  "version": "1.0.0",
  "tools": [
    {
      "name": "search_docs",
      "description": "Search Video.js documentation",
      "parameters": {
        "query": { "type": "string" }
      }
    },
    {
      "name": "get_api",
      "description": "Get API reference for a symbol",
      "parameters": {
        "symbol": { "type": "string" }
      }
    }
  ]
}
```

## Testing AI Readability

Checklist for AI-friendly docs:

- [ ] llms.txt at docs root
- [ ] AGENTS.md in package root
- [ ] All exports have TSDoc
- [ ] Examples include imports
- [ ] Examples are runnable
- [ ] Pages available as markdown
- [ ] No broken internal links
- [ ] Code blocks have language tags
- [ ] Types are documented or inferrable
