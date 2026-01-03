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

IGNORE `packages/__tech-preview__/` — it's legacy code from the Demuxed demo. Don't reference or
modify it when working in other packages.

### Dependency Hierarchy

```text
utils/*         ← shared utilities
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

- Uses **PNPM workspaces** + **Turbo** for task orchestration.
- Internal deps are linked with `workspace:*`.
- Always use PNPM, do not use other package managers.

### Common Root Commands

```bash
# Install workspace deps
pnpm install

# Run all demos/sites in parallel
pnpm dev

# Typecheck across repo (fast)
pnpm typecheck

# Build all packages/apps
pnpm build
# Build all packages (no apps)
pnpm build:packages
# Build specific package
pnpm -F <pkg> build

# Run tests across all packages
pnpm test
# Run tests for specific package
pnpm -F <pkg> test
# Run tests matching a name or pattern
pnpm -F <pkg> test -t "test name pattern"
# Run tests for a specific file
pnpm -F <pkg> test src/path/to/file.test.ts
# Run tests matching a glob or filter
pnpm -F <pkg> test src/core

# Lint all workspace packages
pnpm lint
# Lint and fix a single file
pnpm lint:file:fix <file>

# Remove all dist and types outputs
pnpm clean
```

## Dev Workflow

1. Make changes.
2. Typecheck, fix all issues.
3. Run test/s, fix all issues. If there are no tests add them.
4. Lint file/s, fix all issues.
5. Run build/s, fix all errors.
6. Before creating a PR `pnpm test`.

Be efficient when running operations, see "Common Root Commands".

## Testing

### File Organization

Tests live in a `tests/` directory next to the implementation they cover:

```text
packages/utils/src/dom/
├── listen.ts
├── event.ts
└── tests/
    ├── listen.test.ts
    └── event.test.ts
```

### Conventions

- Use Vitest as the test runner.
- Import test utilities from `vitest`: `describe`, `it`, `expect`, `vi`.
- Name test files `<module>.test.ts` matching the source file.
- Write or update matching tests for each new or modified behavior.
- Follow the `act → assert` pattern.
- Use `vi.fn()` for mocks and spies.

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
   - Place platform‑specific logic in the appropriate directory or adapter (HTML, React, RN).

5. **A11y, Styling & Performance**
   - Maintain accessibility: ARIA roles, keyboard interactions, focus management.
   - Use data‑attributes and CSS variables for style hooks—no inline animation JS.
   - Ensure logic runs at 60 FPS; prefer CSS transitions over manual DOM mutations.

6. **Commit Scope**
   - Use semantic commit messages (enforced by `commitlint`).
   - One focused change per commit—no mixed updates.
   - Breaking changes use `!`.
