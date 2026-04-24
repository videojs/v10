# Contributor Guide

First off, thank you for taking the time to contribute to **Video.js 10** ❤️
Your input helps shape the next generation of open web media players.

Video.js is a free and open source library, and we appreciate any help you're willing to give - whether it's fixing bugs, improving documentation, or suggesting new features. Contributions and project decisions are overseen by the
[Video.js Technical Steering Committee (TSC)][vjs-gov].

[vjs-gov]: https://github.com/videojs/admin/blob/main/GOVERNANCE.md

## 🎒 Contributing code

Video.js 10 is set up a monorepo using [`pnpm` workspaces](https://pnpm.io/workspaces). As such, most scripts run will be done from the project/workspace root. Unless otherwise specified, assume commands and similar should be run from the root directory.

> [!TIP]
> This repo includes tooling for AI-assisted development. See [Using AI](#using-ai).

### Getting Your Machine Ready

You’ll need the following installed:

- [Node.js](https://nodejs.org/en/download) (≥ 22.19.0)
- [Git](https://git-scm.com/downloads)
- [PNPM](https://pnpm.io/installation) (≥ 10.17.0)
- [Volta](https://docs.volta.sh/guide) or [NVM](https://github.com/nvm-sh/nvm) (we recommend Volta for automatic Node management)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (optional, for AI-assisted development)

> [!TIP]
> PNPM will automatically use the correct Node version when running scripts.
> If you prefer NVM: after installing it, simply run `nvm use` in the repo root.

### ⬇️ Fork & Clone

1. [Fork on GitHub][vjs-gh].
2. Clone your fork locally and set up upstream tracking:

```sh
git clone https://github.com/{your-github-username}/v10.git
cd v10

git remote add upstream git@github.com:videojs/v10.git
git fetch upstream
git branch --set-upstream-to=upstream/main main
```

To update your local main branch later:

```sh
git fetch upstream
git checkout main
git pull upstream main
```

### ⚙️ Setup

```sh
pnpm install
```

This also creates symlink aliases (`.opencode`, `agents`, `AGENTS.md`) so that AI coding tools other than Claude Code can discover project instructions.

> [!NOTE]
> **Windows users:** Directory symlinks use junctions and work automatically. File symlinks (e.g., `AGENTS.md → CLAUDE.md`) require [Developer Mode](https://learn.microsoft.com/en-us/windows/apps/get-started/enable-your-device-for-development) enabled. If symlink creation fails, `pnpm install` will log a warning but continue normally — the canonical files (`.claude/`, `CLAUDE.md`) still work fine.

Then build all workspace packages:

```sh
pnpm build:packages
```

> ℹ️ **VS Code Users:** the project may suggest extensions to enhance the developer
> experience.
> If imports like `react` are not resolving, set your TS version to the workspace one:
> `CMD/CTRL + Shift + P` → `TypeScript: Select TypeScript Version` → _Use Workspace Version_.

### 🏗 Building & Development

To run the workspace in development mode:

```sh
pnpm dev
```

This will run the entire workspace in developer mode, meaning all applications (examples and website) will also be started on their respective ports.

```sh
pnpm dev:site       # just the documentation site
pnpm dev:packages   # just the library packages (no apps)
pnpm dev:sandbox    # just the sandbox playground
```

See [Manual Testing with the Sandbox](#-manual-testing-with-the-sandbox) for how to use the sandbox to exercise player changes in the browser.

Sometimes you may want to do (non-dev) builds, say, to validate the full build process or evaluate production artifacts.

```sh
pnpm build:packages
```

To build the sandbox (and its package dependencies):

```sh
pnpm build:sandbox
```

To build all workspace packages and applications:

```sh
pnpm build
```

### 🧹 Style & Linting

For the bulk of our core code, we use [Biome](https://biomejs.dev). Between IDE configs, pre-commit hooks, and manual CLI fixes, many styling and linting issues should get caught automatically.

To ensure your code follows our lint rules with:

```sh
pnpm lint                    # check the whole workspace
pnpm lint:fix                # check and auto-fix the whole workspace
pnpm lint:fix:file <file>    # check and auto-fix a single file
```

Pre‑commit hooks automatically lint staged files via **simple-git-hooks** and **lint‑staged**.

### 🔎 Typechecking

We use TypeScript project references for fast, incremental typechecking across the workspace:

```sh
pnpm typecheck
```

> [!TIP]
> Typecheck runs against built `.d.ts` files. If you add or change exported types in a package, run `pnpm -F <pkg> build` first so the new declarations are emitted before typechecking.

### 🧪 Testing

We use [Vitest](https://vitest.dev) for unit testing.

```sh
pnpm test                    # all workspace tests
pnpm -F core test            # just core package
pnpm -F core test:watch      # watch core package
```

#### E2E Tests

We use [Playwright](https://playwright.dev) for end-to-end testing. The E2E tests live in `apps/e2e/` and run against a Vite-based test app that hosts the player in multiple configurations (HTML, React, ejected skins, CDN bundles).

Playwright browsers and system dependencies are installed automatically during `pnpm install`. On Linux without sudo, browsers will install but system deps will be skipped with a note. If e2e tests fail due to missing system dependencies, install them manually:

```sh
sudo pnpm test:e2e:install
```

**Running tests:**

```sh
pnpm test:e2e                    # Chromium + WebKit (all engines)
pnpm test:e2e:vite               # Chromium only (fast feedback)
```

**Visual snapshot tests** verify that skin CSS and layout aren't broken. If a snapshot test fails, it means the rendered skin looks different from the baseline. This could mean:

1. **You intentionally changed the skin** — update the baselines:
   ```sh
   pnpm test:e2e:update
   ```
   Review the updated PNGs in `apps/e2e/tests/visual/` to confirm they look correct, then commit them.

2. **You didn't intend to change the skin** — the failure caught a real regression. Inspect the diff in the Playwright HTML report:
   ```sh
   pnpm --dir apps/e2e report
   ```
   The report shows expected vs. actual vs. diff images side-by-side.

> [!TIP]
> Snapshot baselines are checked into git. When you update them, review the PNG diffs in your PR to make sure the visual changes are intentional.

### 🏖 Manual Testing with the Sandbox

The sandbox (`apps/sandbox/`) is a Vite playground for manually exercising player changes in a browser. Run it and open the printed URL for a directory of entry points: `core`, `html`, `html-tailwind`, `html-background`, `react`, `react-tailwind`, `react-background`.

```sh
pnpm dev:sandbox                 # just the sandbox (usually what you want)
pnpm dev                         # sandbox + site + watch all packages
```

Sandbox code lives in two parallel directories:

- **`apps/sandbox/templates/`** — source of truth, checked into git.
- **`apps/sandbox/src/`** — your scratch copy, **gitignored** (except `index.html`).

On `pnpm dev:sandbox`, `setup.ts` copies any file from `templates/` that doesn't already exist in `src/`. Existing files in `src/` are never overwritten, so your local changes persist across restarts.

> [!IMPORTANT]
> Because `src/` is gitignored, edits you make there will not appear in `git status`. When you want to promote a sandbox change into the repo, run `pnpm -F @videojs/sandbox sync` — it shows a diff of every changed file and prompts before copying `src/` → `templates/`.

See [`apps/sandbox/README.md`](./apps/sandbox/README.md) for the full model, including how to add a new sandbox entry point.

### ✅ Workspace Consistency

Before opening a PR, run the workspace consistency check to catch common mistakes (CI coverage, scope mismatches, broken define imports, etc.):

```sh
pnpm check:workspace
```

### 📦 Dependencies

To add a dependency to a specific package, you can use [`pnpm` filtering][pnpm-filtering] from the workspace root:

```sh
pnpm -F <scope> add <package>
# Example:
pnpm -F react add @floating-ui/react-dom
```

To upgrade a dependency across all packages:

```sh
pnpm up <package>@<version> -r
```

> [!CAUTION]
> We try to be very intentional with any dependencies we add to this project. This is true of both developer/tooling dependencies and especially package-level (source) dependencies. If you find yourself needing to add a dependency, we strongly encourage you to check in with the core maintainers before proceeding to avoid wasted time and effort for everyone involved (yourself included!).

[pnpm-filtering]: https://pnpm.io/filtering

## Using AI

Video.js 10 includes tooling for AI-assisted development with [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Read [`CLAUDE.md`](./CLAUDE.md) for repo-wide conventions, package layout, and development workflow.

### Slash Commands

| Command          | Purpose                                           |
| ---------------- | ------------------------------------------------- |
| `/commit-pr`     | Commit changes and create/update a PR             |
| `/review-branch` | Review changes in the current branch              |
| `/gh-issue <n>`  | Analyze an issue and generate a plan              |
| `/create-issue`  | Create a GitHub issue following repo conventions  |
| `/claude-update` | Update `CLAUDE.md` and skills for new patterns    |
| `/create-skill`  | Scaffold a new skill                              |

### Skills

Domain-specific knowledge lives in `.claude/skills/`. A few of the most-used skills:

| Skill           | Use When                                                 |
| --------------- | -------------------------------------------------------- |
| `api`           | Designing APIs, reviewing architecture                   |
| `component`     | Building HTML or React components                        |
| `aria`          | Accessibility implementation and review                  |
| `docs`          | Writing concept guides, how-tos, and READMEs             |
| `api-reference` | Scaffolding component/util reference pages               |
| `design`        | Writing internal Design Docs                             |
| `rfc`           | Writing RFCs for proposals that need buy-in              |
| `git`           | Commit messages, PR conventions                          |

See [`.claude/skills/README.md`](./.claude/skills/README.md) for the full list and workflow mappings.

### Maintaining AI Docs

When your changes introduce new patterns:

- **Code conventions** → Update `CLAUDE.md` Code Rules section
- **Domain patterns** → Update relevant skill in `.claude/skills/`

## Design Docs and RFCs

We use two types of design documents:

**Design Docs** (`internal/design/`) — Decisions you own, documented for posterity. Write one when making significant decisions in your area, choosing between approaches, or documenting architecture. See [`internal/design/README.md`](./internal/design/README.md).

**RFCs** (`rfc/`) — Proposals needing buy-in from others. Write one when the decision affects multiple areas, changes shared API surface, or is hard to reverse. See [`rfc/README.md`](./rfc/README.md).

**Rule of thumb:** If you need someone else's approval, it's an RFC. If you're documenting your own decision, it's a Design Doc.

**Skip both for:** Bug fixes, small contained features, implementation details.

## Creating a Pull Request

By submitting a pull request, you agree that your contribution is provided under the
[Apache 2.0 License](./LICENSE) and may be included in future releases. No contributor license agreement (CLA) has ever been required for contributions to Video.js. See the [Developer's Certificate of Origin 1.1](#developers-certificate-of-origin-11).

### Step 1: Verify

Whether you're adding something new, making something better, or fixing a bug, you'll first want to search the [GitHub issues](https://github.com/videojs/v10/issues) to make sure you're aware of any previous discussion or work. If an unclaimed issue exists, claim it via a comment. If no issue exists for your change, [submit a new issue][vjs-issue-choose].

### Step 2: Update remote

Before starting work, you want to update your local repository to have all the latest changes from `upstream/main`.

```sh
git fetch upstream
git checkout main
git pull upstream main
```

> [!NOTE]
> If `git pull upstream main` fails, this means either you've committed changes to your local clone of `main` or there was a (rare) change in `upstream/main`'s commit history. In either case, if you simply want to base your local clone off of the latest in `upstream/main`, you can simply run: `git checkout -B main upstream/main` (assuming you've already `fetch`ed). For more on `git checkout -B`, check out the [git docs][git-docs].

[git-docs]: https://git-scm.com/docs/git-checkout#Documentation/git-checkout.txt-gitcheckout-b-Bnew-branchstart-point

### Step 3: Branch

You want to do your work in a separate branch. In general, you want to make sure the branch is based off of the latest in `upstream/main`.

```sh
git checkout -b my-branch
```

One helpful naming convention approximates [conventional commits](conventional-commit-style), e.g.:

- `fix/some-issue`
- `feat/my-media-store-feature`
- `docs/site-docs-for-x`
- `chore/repo-cleanup-task`

### Step 4: Commit

We follow **[conventional commits semantics][conventional-commit-style]** to enable automated releases.

Examples:

- `feat(core): add volume smoothing hook`
- `fix(react): correct prop mapping for picture-in-picture`
- `chore(root): update linting`

> [!TIP]
> Run `git log` (or `git log --oneline`) to check recent examples before committing.

### Step 5: Test

Any code change should come with corresponding test changes. Especially bug fixes.
Tests attached to bug fixes should fail before the change and succeed with it.

```sh
pnpm test
```

See [Testing](#-testing) for more information.

### Step 6: Review Documentation

If your changes introduced new patterns or conventions, check if documentation needs updates:

- **Site docs** — User-facing documentation in `site/`
- **AI docs** — See [Maintaining AI Docs](#maintaining-ai-docs)

### Step 7: Push

When ready, push your branch up to your fork (or upstream if you are a core contributor):

```sh
git push --set-upstream origin fix/my-issue
```

Then, open a PR via the green **“Compare & Pull Request”** button. In the description, make sure
you thoroughly describe your changes and [link related issues or discussions][link-pr-issue].

- Keep PRs focused and small when possible.
- Give reviewers time to provide feedback.
- Even if a PR isn’t merged, your work helps shape the direction of Video.js 10 ❤️

[link-pr-issue]: https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue#linking-a-pull-request-to-an-issue-using-a-keyword

### Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

- (a) The contribution was created in whole or in part by me and I
  have the right to submit it under the open source license
  indicated in the file; or

- (b) The contribution is based upon previous work that, to the best
  of my knowledge, is covered under an appropriate open source
  license and I have the right under that license to submit that
  work with modifications, whether created in whole or in part
  by me, under the same open source license (unless I am
  permitted to submit under a different license), as indicated
  in the file; or

- (c) The contribution was provided directly to me by some other
  person who certified (a), (b) or (c) and I have not modified
  it.

- (d) I understand and agree that this project and the contribution
  are public and that a record of the contribution (including all
  personal information I submit with it, including my sign-off) is
  maintained indefinitely and may be redistributed consistent with
  this project or the open source license(s) involved.

## Community

To discuss larger ideas or prototypes, or to help out with ongoing discussions, open a thread in:

- [Discord][vjs-discord]
- [GitHub Discussions][vjs-gh-discussions]

[vjs-gh]: https://github.com/videojs/v10
[vjs-issue-choose]: https://github.com/videojs/v10/issues/new/choose
[vjs-gh-discussions]: https://github.com/videojs/v10/discussions
[vjs-discord]: https://discord.gg/JBqHh485uF
[conventional-commit-style]: https://www.conventionalcommits.org/en/v1.0.0/#summary
