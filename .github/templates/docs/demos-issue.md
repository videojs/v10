<!-- component:{{COMPONENT_NAME}} -->
<!-- drift-type:reference-demos -->
<!-- trigger-prs:{{TRIGGER_PR_NUMBERS}} -->

## Summary
Demo code for `{{COMPONENT_NAME}}` may use APIs that changed in a recent PR. Demo fixes need human judgment — this issue is for triage.

## References
- Triggering PR(s): {{SOURCE_PR_URLS}}

## Affected Demos
| Demo File | Issue | API Change | Suggested Fix |
|---|---|---|---|
{{AFFECTED_DEMOS_TABLE_ROWS}}

### Demo Locations
- HTML demos: `site/src/components/docs/demos/{{COMPONENT_SLUG}}/html/css/`
- React demos: `site/src/components/docs/demos/{{COMPONENT_SLUG}}/react/css/`

## Notes
- Demo updates require human review — automated fixes are not attempted.
- Check both HTML and React demo variants.
