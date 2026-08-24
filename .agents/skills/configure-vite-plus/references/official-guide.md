# Official Vite+ reading map

Use the smallest relevant section. The repository's installed version, CLI help, and types remain the executable source of truth when the evolving documentation differs.

## Run task definitions and workspace ordering

Read the [Run guide](https://viteplus.dev/guide/run) and [Run configuration](https://viteplus.dev/config/run) before adding or changing tasks. Read the [monorepo guide](https://viteplus.dev/guide/monorepo) when package selection or workspace topology changes.

Verify these details against the installed version:

- A task name may be defined in `vite.config.ts` or `package.json`, not both.
- `package#task` names an exact cross-package edge. The object `dependsOn` form expands a task over the declaring package's chosen dependency fields.
- Recursive and transitive selection derive ordering from normal workspace `dependencies`; selection flags do not infer exceptional artifact relationships.
- Normal execution preserves dependency ordering and runs independent work concurrently. `--parallel` deliberately ignores task dependencies.

## Local caching and unstable tracking

Read [Task Caching](https://viteplus.dev/guide/cache), [Automatic Data Tracking](https://viteplus.dev/guide/automatic-data-tracking), and the `input`, `output`, `env`, and `untrackedEnv` sections of [Run configuration](https://viteplus.dev/config/run).

Start with automatic tracking. Add `{ auto: true }` plus exclusions when a generated output was incorrectly observed as an input. Use workspace-based pattern objects for files outside the task's package. Replace automatic inputs with explicit globs only when the complete input set is known. Remember that only `vp build` currently supplies cooperative Vite metadata; other commands rely on file-system observations unless configured manually.

## GitHub Actions cache

Read the experimental [GitHub Actions cache guide](https://viteplus.dev/guide/github-actions-cache) before changing a workflow.

The documented order is install, restore, `vp run` tasks, then save on success. The cache directory is `node_modules/.vite/task-cache`. Use an immutable primary key containing OS, architecture, run ID, and attempt, with an OS/architecture restore prefix. Do not add source hashes to the Actions key. Confirm an immediate local second run hits before expecting a restored CI cache to hit, and measure whether transfer overhead is worthwhile.

## Pack and migrations

Read [Pack](https://viteplus.dev/guide/pack) and [Pack configuration](https://viteplus.dev/config/pack) before changing a library build. Consult the linked tsdown documentation for Pack-only options. Read [Migrate to Vite+](https://viteplus.dev/guide/migrate) and [Migration Rules](https://viteplus.dev/guide/migrate-rules) when replacing another tool rather than maintaining the resulting setup.

`vp pack` reads its tsdown settings from the active `vite.config.ts` `pack` block. Use a `name` plus `--filter` for related configs loaded together. Use the global `-C <dir>` option when a deliberately separate config lives in its own directory.
