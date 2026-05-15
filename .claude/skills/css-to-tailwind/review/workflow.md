# CSS → Tailwind review workflow

Reviews assume **Tailwind CSS v4**: theme lives in CSS (**`@theme`**), and repeated patterns belong in **`@utility`** / **`@custom-variant`**, not duplicated arbitrary classes.

Use this workflow to verify Tailwind migrations and class strings follow [references/migration.md](../references/migration.md).

## Process

### 1. Gather context

- **Source:** original CSS file, module, or styled-component snippet
- **Shared theme:** **`packages/skins/src/shared/tailwind.css`**, app entries with **`@import "tailwindcss"`** and local **`@theme`**
- **Target:** Tailwind class strings (preset templates, skin `tailwind/components/*.ts`, etc.)
- **Scope:** single component, single skin pair (`css/` + `tailwind/`), or PR diff

### 2. Compare behavior

Confirm layout, breakpoints, pseudos, data-attribute selectors, transitions, and `pointer-events`/stacking contexts still match intent — not only pixel values.

### 3. Run the checklist

Use [checklist.md](checklist.md) section by section. Flag issues with severity:

| Level       | Meaning                                      |
| ----------- | -------------------------------------------- |
| **Blocker** | Wrong behavior or obvious rule violations    |
| **Should fix** | Token misuse, fixable arbitrary values   |
| **Consider** | Readability, future theme consolidation      |

### 4. Output

Produce the **migration report** shape from migration rule 8:

- Arbitrary values + justification or “remove and use scale”
- Suggested theme tokens for follow-up
- Any CSS intentionally left outside Tailwind

## Quick path

Small change: skim [checklist.md](checklist.md) only; skip formal report unless the PR is large.

## References

| File                               | Contents     |
| ---------------------------------- | ------------ |
| [../references/migration.md](../references/migration.md) | Authoritative rules |
