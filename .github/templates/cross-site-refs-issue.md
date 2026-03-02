<!-- drift-type:cross-site-refs -->
<!-- trigger-prs:{{TRIGGER_PR_NUMBERS}} -->
<!-- apis:{{CHANGED_API_NAMES}} -->

## Summary
Pages outside `/reference/` mention APIs that changed in a recent PR. These references may be stale and need human triage.

## References
- Triggering PR(s): {{SOURCE_PR_URLS}}

## Stale References Found
| File | Line(s) | Stale Reference | API Change | Confidence | Action |
|---|---|---|---|---|---|
{{STALE_REFERENCES_TABLE_ROWS}}

### Directories Checked
- `site/src/content/docs/concepts/`
- `site/src/content/docs/how-to/`
- `packages/*/README.md`

## Notes
- **Confidence levels**: `high` = definitely stale, `medium` = likely stale, `low` = needs human review.
- All items in this issue need human triage — false positives are possible.
- Related APIs are grouped into a single issue when they affect the same files.
