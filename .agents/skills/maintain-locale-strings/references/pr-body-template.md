# Change description template

Read when describing the change.

Title: `fix(i18n): <verb> <Language> <what>`. `i18n` is an allowed commit scope. One locale per branch, one file per change, no labels.

Open with an unheaded paragraph, in this order: the file's review history; the sentence that every value reaches the DOM as an `aria-label`; the localized sources consulted; and, in bold, that a native-speaker check is requested before merge.

Then:

- `## Changes` — a table of `| key | current | proposed | why (source link) |`.
- `### Error strings retranslated against current English` — when the English `errors.*` copy moved underneath the pack.
- `## Deliberately left alone` — mandatory. What you did not change and why; this is what keeps the diff reviewable.
- `## Independent verification` — the second pass's verdict, the citations it re-fetched, and the mechanical assertions it replayed.
- `### Questions for a native speaker` — the rows that need a human call.
- `## Safety checks` — key count and order unchanged, `{placeholder}` multiset identical, only the one locale file touched.
- `## Testing` — the commands from the skill's Validation section and their results.

Outside native speakers cannot open pull requests on this repo (collaborators only), so they file an issue with the same key/current/proposed/why table and a collaborator opens the change and credits them. Issue #2537 is the origin of this format.
