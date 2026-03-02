<!-- component:{{COMPONENT_NAME}} -->
<!-- drift-type:reference-copy -->
<!-- trigger-prs:{{TRIGGER_PR_NUMBERS}} -->
<!-- trigger-issues:{{TRIGGER_ISSUE_NUMBERS}} -->

## Summary
The hand-written MDX reference page for `{{COMPONENT_NAME}}` has drifted from the auto-generated API JSON.

> The API JSON files are rebuilt on every sync run and are always current.
> Drift listed here is in the **MDX prose**, not the generated data.

## References
- Triggering PR(s): {{SOURCE_PR_URLS}}
- Triggering issue(s): {{SOURCE_PR_ISSUE_URLS}}

## Out-of-Sync Docs
| MDX File | Section | Drift Type | Current (MDX) | Expected (from JSON) | Action |
|---|---|---|---|---|---|
{{OUT_OF_SYNC_TABLE_ROWS}}

## Sidebar Status
- `site/src/docs.config.ts` entry: {{SIDEBAR_STATUS}}

## Implementation Notes
- Target files: {{TARGET_FILES_LIST}}
- Drift-specific tasks: {{IMPLEMENTATION_TASKS}}
- Validation commands:
  - `pnpm -C site api-docs`
  - `pnpm -C site build`

## Scope Checklist
- [ ] Update MDX reference page content for `{{COMPONENT_NAME}}`.
- [ ] Update sidebar entries in `site/src/docs.config.ts` if required.
- [ ] Regenerate API reference JSON (`pnpm -C site api-docs`).
- [ ] Verify build (`pnpm -C site build`).
