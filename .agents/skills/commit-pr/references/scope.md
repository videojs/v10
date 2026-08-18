# Scope Inference

Infer commit scope from changed file paths.

## Path to Scope Mapping

| Path                     | Scope          |
| ------------------------ | -------------- |
| `packages/core/`         | `core`         |
| `packages/store/`        | `store`        |
| `packages/utils/`        | `utils`        |
| `packages/html/`         | `html`         |
| `packages/react/`        | `react`        |
| `packages/react-native/` | `react-native` |
| `packages/icons/`        | `icons`        |
| `site/`                  | `site`         |
| `rfc/`                   | `rfc`          |
| `internal/design/`       | `design`       |
| `.claude/`               | `claude`       |
| `.github/workflows/`     | `ci`           |
| `.github/`               | `cd`           |
| Root config files        | `root`         |

## Multiple Packages

When changes span multiple packages:

1. **Single primary package**: Use that package's scope
2. **Related packages**: Use the most significant one
3. **Broad changes**: Use `packages` scope

## Allowed Scopes

From `commitlint.config.js`:

```
cd, ci, claude, core, design, docs, html, icons, packages,
plan, react-native, react, rfc, root, site, store,
test, utils
```

## Examples

```bash
# Single package
packages/store/src/feature.ts → store

# Multiple files in same package
packages/html/src/slider.ts
packages/html/src/button.ts → html

# Cross-package refactor
packages/store/src/slice.ts
packages/core/src/media.ts → packages (or primary one)

# Root configs
tsconfig.json
package.json → root

# CI changes
.github/workflows/test.yml → ci
```
