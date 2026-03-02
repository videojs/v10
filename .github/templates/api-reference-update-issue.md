<!-- component:{{COMPONENT_NAME}} -->
<!-- trigger-prs:{{TRIGGER_PR_NUMBERS}} -->
<!-- trigger-issues:{{TRIGGER_ISSUE_NUMBERS}} -->

## Summary
API reference update needed for `{{COMPONENT_NAME}}` based on recent merged PR changes.

## References
- Triggering PR(s): {{SOURCE_PR_URLS}}
- Triggering issue(s): {{SOURCE_PR_ISSUE_URLS}}

## API Changes Summary
| Surface | Change Type | Before | After | Source |
|---|---|---|---|---|
{{API_CHANGES_TABLE_ROWS}}

## Out-of-Sync Docs
| Doc Location | Drift Type | Current | Expected | Action |
|---|---|---|---|---|
{{OUT_OF_SYNC_TABLE_ROWS}}

## Documentation Notes
- Conventions check (props/state/data attrs/css vars): {{CONVENTION_STATUS}}
- JSDoc completeness for interface fields: {{JSDOC_STATUS}}
- Planning metadata copied from source issue:
  - Milestone: {{MILESTONE_STATUS}}
  - Project board(s): {{PROJECT_STATUS}}

## Implementation Notes
- Target files: {{TARGET_FILES_LIST}}
- Drift-specific tasks: {{IMPLEMENTATION_TASKS}}
- Validation commands:
  - `pnpm -C site api-docs`
  - `pnpm -C site build`

## Scope Checklist
- [ ] Update reference page content for `{{COMPONENT_NAME}}`.
- [ ] Update sidebar entries in `site/src/docs.config.ts` if required.
- [ ] Regenerate API reference JSON (`pnpm -C site api-docs`).
- [ ] Verify build (`pnpm -C site build`).
