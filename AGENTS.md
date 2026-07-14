# Video.js 10 agent guide

Use this file for durable repository rules. Prefer retrieval-led reasoning: inspect the relevant code, tests, package manifest, and nearest `AGENTS.md` before relying on model memory or these summaries.

## Sources of truth

- Setup and contributor workflow: `CONTRIBUTING.md`
- Available commands and dependency versions: root and package `package.json` files
- Workspace topology: `pnpm-workspace.yaml`, `turbo.json`, and package manifests
- Formatting and static checks: `biome.json`, `tsconfig*.json`, and `build/scripts/check-workspace.mjs`
- Current behavior: implementation and colocated tests
- Public package behavior: package source, exports, and README files
- Architecture rationale: `internal/design/`, `internal/decisions/`, and `rfc/`

When prose conflicts with executable sources, follow the executable source and update stale prose in the same change.

## Repository map

- `packages/utils`: shared utilities; DOM helpers live under its `/dom` export.
- `packages/element`: custom-element base.
- `packages/store`: framework-neutral state plus `/html` and `/react` bindings.
- `packages/spf`: stream-processing primitives, DOM bindings, and playback engine.
- `packages/core`: runtime-neutral player logic; DOM bindings live under `/dom`.
- `packages/html`, `packages/react`: platform players.
- `packages/icons`, `packages/skins`: private shared assets and styling.
- `apps/sandbox`: Vite playground. `templates/` is tracked; `src/` is scratch.
- `apps/e2e`: Playwright coverage.
- `site`: Astro documentation site; follow `site/AGENTS.md`.

Keep framework-neutral packages free of DOM or framework dependencies. Put platform behavior in the appropriate adapter or binding package.

## Commands

Use pnpm only and run workspace commands from the repository root unless a package documents otherwise.

```bash
pnpm install
pnpm dev
pnpm -F <pkg> test [path-or-pattern]
pnpm -F <pkg> build
pnpm typecheck
pnpm lint:fix:file <file>
pnpm check:workspace
```

Use the narrowest relevant test/build while iterating. Before handoff, run checks proportional to the change. If exported package types changed, build that package before `pnpm typecheck`; project references consume built declarations.

## Code and tests

- Match nearby code before introducing a new abstraction or naming rule.
- Check `@videojs/utils` before adding a helper. Prefer its predicate helpers over inline type/null checks where an equivalent exists.
- Keep types beside their implementation; do not create generic `types.ts` buckets.
- Put package tests in a `tests/` directory beside the implementation and name them `<module>.test.ts`.
- Use Vitest and name `describe()` after the exact export under test.
- Add or update tests for changed observable behavior.
- Keep dev-only warnings, debug helpers, and `displayName` assignments behind `__DEV__`.
- Comments and JSDoc should explain non-obvious intent or contracts, not restate TypeScript or the next line.
- API-reference exports need richer JSDoc because the site builder extracts it; use `write-api-reference` for those changes.

## Design records

- `internal/design/`: architecture or feature decisions owned by the author.
- `internal/decisions/`: short records of a single tactical choice.
- `rfc/`: proposals needing wider approval, especially public API or hard-to-reverse changes.
- `.agents/plans/`: temporary implementation notes; delete before merge or extract durable rationale into a record.

## Skills and agent documentation

Checked-in skills are direct children of top-level `skills/`. `pnpm install` exposes that catalog through generated `.agents/skills/`, `.claude/skills/`, and `.opencode/skills/` directory aliases. Load only the specialized workflow needed after inspecting relevant project sources.

- API: `design-api`, `review-api`
- UI: `build-ui-component`, `review-ui-component`, `implement-accessible-ui`, `review-accessibility`
- Docs and records: `write-docs`, `review-docs`, `write-api-reference`, `write-design-doc`, `write-rfc`
- Site styling: `migrate-css-to-tailwind`, `review-tailwind-migration`
- Delivery: `investigate-issue`, `create-issue`, `review-branch`, `commit-pr`
- SPF behaviors: `create-spf-behavior`, `change-spf-behavior`
- SPF registry: `document-spf-feature`, `document-spf-use-case`, `implement-spf-feature`, `implement-spf-use-case`
- Agent guidance: `maintain-agent-docs`, `create-skill`

Keep `AGENTS.md` factual, small, and broadly applicable. Put repeatable vertical procedures in skills. Put detailed or conditional material in a skill reference and state when to read it. Do not duplicate code, schemas, command inventories, or design documents in agent prose.

Run `pnpm check:workspace` after changing `AGENTS.md`, `CLAUDE.md`, or any skill. It validates imports, portable skill metadata, and repository token budgets.
