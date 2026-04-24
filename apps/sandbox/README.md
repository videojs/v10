# @videojs/sandbox

Vite-based playground for testing and developing Video.js 10 integrations. Each sandbox is a standalone entry point that demonstrates a different platform or scenario.

## Sandboxes

| Name                | Description                            |
| ------------------- | -------------------------------------- |
| `core`              | Framework-agnostic core API            |
| `html`              | HTML player with skin switching        |
| `html-background`   | Full-screen background video (HTML)    |
| `html-tailwind`     | HTML player styled with Tailwind CSS   |
| `react`             | React player with skin switching       |
| `react-tailwind`    | React player styled with Tailwind CSS  |
| `react-background`  | Full-screen background video (React)   |

## Getting started

```bash
# From the repo root
pnpm dev
# Or just the sandbox
pnpm dev:sandbox
```

This runs `setup.ts` first, which mirrors any missing files from `templates/` into `src/`, then starts the Vite dev server. Open the root URL to see links to all sandboxes.

## How it works

The package has two parallel directories:

- **`templates/`** — Checked into git. The source of truth for each sandbox's starting point.
- **`src/`** — Gitignored (except `index.html`). Your working copy where you freely edit, experiment, and break things.

On `pnpm dev`, `setup.ts` copies any file from `templates/` that doesn't already exist in `src/`. Existing files in `src/` are never overwritten, so your local changes are preserved across restarts.

## Syncing changes back to templates

When you've made improvements in `src/` that should become the new baseline:

```bash
pnpm -F @videojs/sandbox sync
```

This shows a colored diff of every changed file, then prompts for confirmation before copying `src/` changes into `templates/`. Files that only exist in `templates/` are left untouched.

Sync when:

- You've fixed a bug or improved a sandbox and want to preserve it for others.
- You're preparing a commit — templates are what gets checked in.

## Adding a new sandbox

1. Create a directory in `templates/` (e.g. `templates/my-feature/`).
2. Add an `index.html` entry point and a `main.ts` or `main.tsx`.
3. Add a link to your sandbox in `templates/index.html`.
4. Register the entry in `vite.config.ts` under `rollupOptions.input`.
5. Run `pnpm dev` — `setup.ts` mirrors the new template into `src/` automatically.
