# README Template

Use this template for package README files.

---

## Decision: Light vs Comprehensive

| Condition                        | Use           |
| -------------------------------- | ------------- |
| Site docs exist for this package | Light         |
| No site docs yet                 | Comprehensive |
| Internal/utility package         | Light         |
| Primary entry point for users    | Comprehensive |

**Current state:**

- `@videojs/store` — Comprehensive (exemplar)
- `@videojs/core`, `@videojs/html`, `@videojs/react` — Need upgrade

---

## Light Template

```markdown
# @videojs/{package}

[![package-badge]][package]

> **⚠️ Alpha - SUBJECT TO CHANGE** Not recommended for production use.

One-sentence description of what this package provides.

## Install

npm install @videojs/{package}

## Quick Start

import { mainExport } from '@videojs/{package}';

// 3-5 lines showing core usage

[Full documentation →](https://videojs.com/docs/{package})

## Community

- [Discord][discord]
- [GitHub Discussions][discussions]

## License

[Apache-2.0](./LICENSE)

[package]: https://www.npmjs.com/package/@videojs/{package}
[package-badge]: https://img.shields.io/npm/v/@videojs/{package}/next
[discord]: https://discord.gg/JBqHh485uF
[discussions]: https://github.com/videojs/v10/discussions
```

---

## Comprehensive Template

Follow `@videojs/store` README structure:

### Required Sections (in order)

1. **Title + Badge**
2. **Alpha Warning**
3. **Overview** (2-3 sentences + install + minimal example)
4. **Why?** (problem statement, what makes this different)
5. **Core Concepts** (h3 per concept with code examples)
6. **Advanced** (optional, for power users)
7. **How It's Different** (comparison table if applicable)
8. **Community**
9. **License**

### Structure

```markdown
# @videojs/{package}

[![package-badge]][package]

> **⚠️ Alpha - SUBJECT TO CHANGE** Not recommended for production use.

Brief description (2-3 sentences).

npm install @videojs/{package}

import { mainExport } from '@videojs/{package}';

// Minimal working example (5-10 lines)

## Why?

[Problem statement]

Traditional approach assumes X. But when working with Y, you need Z.

`@videojs/{package}` embraces this model:

- **Point one**: Description
- **Point two**: Description

## Core Concepts

### Concept One

Explanation.

// Code example

### Concept Two

Explanation.

// Code example

## Advanced

[Optional section for power users]

## How It's Different

|            | Alternative A | Alternative B | @videojs/{package} |
| ---------- | ------------- | ------------- | ------------------ |
| **Aspect** | ...           | ...           | ...                |

## Community

- [Discord][discord]
- [GitHub Discussions][discussions]

## License

[Apache-2.0](./LICENSE)

[package]: https://www.npmjs.com/package/@videojs/{package}
[package-badge]: https://img.shields.io/npm/v/@videojs/{package}/next
[discord]: https://discord.gg/JBqHh485uF
[discussions]: https://github.com/videojs/v10/discussions
```

---

## Package-Specific Sections

### @videojs/store

Core concepts:

- Target
- Slices
- Slice Type Inference
- Requests
- Request Metadata
- Store
- Request Configuration (Keys, Cancels, Guards)
- Error Handling
- Queue

### @videojs/store/lit

Core concepts:

- Controllers (SelectorController, RequestController, TasksController)
- Mixins (StoreMixin, StoreProviderMixin, StoreAttachMixin)
- createStore factory pattern
- Context API

### @videojs/core/dom

Core concepts:

- Media slices: volumeSlice, playbackSlice, timeSlice, sourceSlice, bufferSlice
- `media.all` array
- Type exports (VolumeState, PlaybackRequests, etc.)

### @videojs/html

Core concepts:

- FrostedSkinElement
- `define()` pattern
- Slot-based composition
- Extending with custom slices

### @videojs/react

Core concepts:

- Components
- Hooks
- Context Providers

---

## Patterns

### Alpha Warning

Always include at top:

```markdown
> **⚠️ Alpha - SUBJECT TO CHANGE** Not recommended for production use.
```

### Install → Example Progression

1. Install command
2. Imports
3. Minimal working code (5-10 lines)
4. [More complex examples in later sections]

```markdown
npm install @videojs/store

import { createSlice, createStore } from '@videojs/store';

const store = createStore({
slices: [playbackSlice, volumeSlice],
});

store.attach(videoElement);
await store.request.play();
```

### "How It's Different" Table

Use when comparing to alternatives:

```markdown
|               | Redux/Zustand | React Query           | @videojs/store             |
| ------------- | ------------- | --------------------- | -------------------------- |
| **Authority** | You own state | Server owns state     | External system owns state |
| **Mutations** | Sync reducers | Async server requests | Async requests to target   |
```

### Type Inference Export Pattern

Always show type inference for TypeScript users:

```ts
import type { InferSliceRequests, InferSliceState } from '@videojs/store';

type VolumeState = InferSliceState<typeof volumeSlice>;
type VolumeRequests = InferSliceRequests<typeof volumeSlice>;
```

### Links Footer

```markdown
[package]: https://www.npmjs.com/package/@videojs/{name}
[package-badge]: https://img.shields.io/npm/v/@videojs/{name}/next
[discord]: https://discord.gg/JBqHh485uF
[discussions]: https://github.com/videojs/v10/discussions
```

---

## Checklist

When writing READMEs:

- [ ] Badge links to npm @next tag
- [ ] Alpha warning present
- [ ] Install command shown first
- [ ] Working example within 30 seconds of reading
- [ ] All code examples self-contained (include imports)
- [ ] Type inference patterns shown for TS users
- [ ] Community links (Discord, Discussions)
- [ ] License stated
- [ ] Follows package-specific section guidance
