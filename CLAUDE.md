# CLAUDE.md

Guidance for **Claude Code** (claude.ai/code) and other AI agents working with this repository.

## Overview

**Video.js 10** is a **Turborepo‑managed monorepo**, organized by runtime and platform.
Refer to **[`CONTRIBUTING.md`](./CONTRIBUTING.md)** for setup, development, and lint/test instructions.

## Package Layout

| Package Path            | Purpose                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `packages/utils`        | Shared utilities (`/dom` subpath for DOM‑specific helpers).        |
| `packages/core`         | Core runtime‑agnostic logic (`/dom` subpath for DOM bindings).     |
| `packages/store`        | State management (`/dom` and `/react` subpaths for platform APIs). |
| `packages/html`         | Web player—DOM/Browser‑specific implementation.                    |
| `packages/react`        | React player—adapts core state to React components.                |
| `packages/react-native` | React Native player integration layer.                             |
| `examples/*`            | Demo apps for various runtimes.                                    |
| `site/`                 | Astro‑based docs and website.                                      |

### Dependency Hierarchy

```text
utils           ← shared utilities
utils/dom       ← DOM-specific helpers

store           ← state management
store/dom       ← DOM platform APIs
store/react     ← React bindings

core            ← runtime-agnostic logic
core/dom        ← DOM bindings

html            ← Web player (DOM/Browser)
react           ← React player
react-native    ← React Native player
```

```text
utils ← store ← core ← html / react / react-native
```

## Workspace

Uses **PNPM workspaces** + **Turbo** for task orchestration.
Internal deps are linked with `workspace:*`.

### Common Root Commands

```bash
pnpm install        # Install workspace deps
pnpm build          # Build all packages/apps
pnpm build:packages # Build library packages (no app)
pnpm dev            # Run all demos/sites in parallel
pnpm test           # Run tests across all packages
pnpm lint           # Lint all workspace packages
pnpm clean          # Remove all dist outputs
```

To build or test a specific package:

```bash
pnpm -F core build
pnpm -F react test
```

## TypeScript

- Uses **project references** for incremental builds.
- Strict mode enabled (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- Common base config: `tsconfig.base.json`.
- `@videojs/*` path mappings resolve to each package’s `src` directory.

## Git & Commits

Follow **Conventional Commits** for automation compatibility:

```bash
<type>(<scope>): <description>
```

Examples:

- `chore(root): update typescript to 5.9.2`
- `feat(core): add pause state management`
- `fix(html): correct fullscreen API handling`

Breaking changes use `!`:

```text
feat(core)!: remove deprecated playback API
```

## Guidelines

When generating or editing code in this repository, follow these rules to ensure safe, high‑quality contributions:

1. **Edit Precisely**
   - Modify only the relevant lines or files.
   - Never overwrite large sections or regenerate entire files.
   - Preserve comments, type signatures, and existing code style.

2. **Match Existing Conventions**
   - Follow the repo’s Prettier, ESLint, and TypeScript settings automatically.
   - Use consistent naming (camelCase for variables, PascalCase for components).
   - Prefer imports ordered and sorted as per `@antfu/eslint-config`.

3. **Type Safety First**
   - Never remove or bypass TypeScript types.
   - Avoid `any`; use `unknown` and proper narrowing if needed.
   - Always ensure edits pass `pnpm typecheck`.

4. **Framework‑Agnostic Mindset**
   - Core modules must remain DOM‑ and framework‑independent.
   - Place platform‑specific logic in the appropriate adapter (HTML, React, RN).

5. **A11y, Styling & Performance**
   - Maintain accessibility: ARIA roles, keyboard interactions, focus management.
   - Use data‑attributes and CSS variables for style hooks—no inline animation JS.
   - Ensure logic runs at 60 FPS; prefer CSS transitions over manual DOM mutations.

6. **Testing Discipline**
   - Write or update matching tests for each new or modified behavior.
   - Follow the pattern: `act → assert`.
   - Use Vitest and Testing Library idioms.

7. **Commit Scope**
   - Use semantic commit messages (enforced by `commitlint`).
   - One focused change per commit—no mixed updates.

8. **Before You Push**

   ```bash
   pnpm lint
   pnpm test
   pnpm typecheck
   pnpm build:packages
   ```

   All must pass cleanly before creating a PR.

## Notes

- The Astro‑based docs site is standalone but integrated via Turborepo pipelines.
- For contribution, testing, and PR flow details, see [`CONTRIBUTING.md`](./CONTRIBUTING.md).
