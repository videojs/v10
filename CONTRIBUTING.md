# Contributor Guide

First off, thank you for taking the time to contribute to **Video.js 10** ❤️
Your input helps shape the next generation of open web media players.

Video.js is a free and open source library, and we appreciate any help you're willing to give - whether it's fixing bugs, improving documentation, or suggesting new features. Contributions and project decisions are overseen by the
[Video.js Technical Steering Committee (TSC)][vjs-gov].

[vjs-gov]: https://github.com/videojs/admin/blob/main/GOVERNANCE.md

## 🎒 Contributing code

Video.js 10 is set up a monorepo using [`pnpm` workspaces](https://pnpm.io/workspaces). As such, most scripts run will be done from the project/workspace root. Unless otherwise specified, assume commands and similar should be run from the root directory.

### Getting Your Machine Ready

You’ll need the following installed:

- [Node.js](https://nodejs.org/en/download) (≥ 22.19.0)
- [Git](https://git-scm.com/downloads)
- [PNPM](https://pnpm.io/installation) (≥ 10.17.0)
- [Volta](https://docs.volta.sh/guide) or [NVM](https://github.com/nvm-sh/nvm) (we recommend Volta for automatic Node management)

> [!TIP]
> PNPM will automatically use the correct Node version when running scripts.
> If you prefer NVM: after installing it, simply run `nvm use` in the repo root.

### ⬇️ Fork & Clone

1. [Fork on GitHub][vjs-gh].
2. Clone your fork locally and set up upstream tracking:

```sh
git clone https://github.com/{your-github-username}/v10.git
cd vjs-10

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
# Run a specific app
pnpm dev:html
pnpm dev:react
pnpm dev:next
pnpm dev:site
```

Sometimes you may want to do (non-dev) builds, say, to validate the full build process or evaluate production artifacts.

```sh
pnpm build:packages
```

To build all workspace packages and applications:

```sh
pnpm build
```

### 🧹 Style & Linting

For the bulk of our core code, we use a [slightly modified](./eslint.config.mjs) version of [`@antfu/eslint-config`](https://www.npmjs.com/package/@antfu/eslint-config) along with [`prettier`](https://prettier.io/) for things like markdown or svgs. Between IDE configs, pre-commit hooks, and manual CLI fixes, many styling and linting issues should get caught automatically.

To ensure your code follows our lint rules with:

```sh
pnpm lint
pnpm lint:fix
```

Pre‑commit hooks automatically lint staged files via **simple-git-hooks** and **lint‑staged**.

### 🧪 Testing

We use [Vitest](https://vitest.dev) for unit testing.

```sh
pnpm test                 # all workspace tests
pnpm test:core            # just core package
pnpm test:core --watch
pnpm test:core file.spec
```

### 📦 Dependencies

To add a dependency to a specific package, you can use [`pnpm` Filtering](https://pnpm.io/filtering) from the workspace root:

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

## Creating a Pull Request

By submitting a pull request, you agree that your contribution is provided under the
[Apache 2.0 License](./LICENSE) and may be included in future releases. No contributor license agreement (CLA) has ever been required for contributions to Video.js. See the [Developer's Certificate of Origin 1.1](#developers-certificate-of-origin-11).

### Step 1: Verify

Whether you're adding something new, making something better, or fixing a bug, you'll first want to search the [GitHub issues](https://github.com/videojs/v10/issues) to make sure you're aware of any previous discussion or work. If an unclaimed issue exists, claim it via a comment. If no issue exists for your change, submit one, following the [issue filing guidelines](#filing-issues)

### Step 2: Update remote

Before starting work, you want to update your local repository to have all the latest changes from `upstream/main`.

```sh
git fetch upstream
git checkout main
git pull upstream main
```

> [!NOTE]
> If `git pull upstream main` fails, this means either you've committed changes to your local clone of `main` or there was a (rare) change in `upstream/main`'s commit history. In either case, if you simply want to base your local clone off of the latest in `upstream/main`, you can simply run: `git checkout -B main upstream/main` (assuming you've already `fetch`ed). For more on `git checkout -B`, check out the [git docs](https://git-scm.com/docs/git-checkout#Documentation/git-checkout.txt-gitcheckout-b-Bnew-branchstart-point).

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

### Step 6: Push

When ready, push your branch up to your fork (or upstream if you are a core contributor):

```sh
git push --set-upstream origin fix/my-issue
```

Then, open a PR via the green **“Compare & Pull Request”** button. In the description, make sure you thoroughly describe your changes and [link related issues or discussions][link-pr-issue].

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

- [Discord][discord]
- [GitHub Discussions][gh-discussions]

[conventional-commit-style]: https://www.conventionalcommits.org/en/v1.0.0/#summary
[discord]: https://discord.gg/JBqHh485uF
[gh-discussions]: https://github.com/videojs/v10/discussions
