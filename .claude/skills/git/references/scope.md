# Scope Inference

Infer commit scope from changed file paths.

## Path to Scope Mapping

| Path                     | Scope           |
| ------------------------ | --------------- |
| `packages/core/`         | `core`          |
| `packages/store/`        | `store`         |
| `packages/utils/`        | `utils`         |
| `packages/html/`         | `html`          |
| `packages/react/`        | `react`         |
| `packages/react-native/` | `react-native`  |
| `packages/icons/`        | `icons`         |
| `packages/skins/`        | `skins`         |
| `site/`                  | `site`          |
| `.claude/`               | `claude`        |
| `.github/workflows/`     | `ci`            |
| `.github/`               | `cd`            |
| `examples/`              | `examples`      |
| `examples/html/`         | `example/html`  |
| `examples/react/`        | `example/react` |
| `examples/next/`         | `example/next`  |
| Root config files        | `root`          |

## Multiple Packages

When changes span multiple packages:

1. **Single primary package**: Use that package's scope
2. **Related packages**: Use the most significant one
3. **Broad changes**: Use `packages` scope

## Allowed Scopes

From `commitlint.config.js`:

```
cd, ci, claude, core, docs, demo, example, examples,
example/html, example/react, example/next, html, icons,
packages, plan, react-native, react, root, site, skins,
store, test, utils
```

## Examples

```bash
# Single package
packages/store/src/slice.ts → store

# Multiple files in same package
packages/html/src/slider.ts
packages/html/src/button.ts → html

# Cross-package refactor
packages/store/src/queue.ts
packages/core/src/media.ts → packages (or primary one)

# Root configs
tsconfig.json
package.json → root

# CI changes
.github/workflows/test.yml → ci
```
