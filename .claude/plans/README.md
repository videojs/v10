# Implementation Plans

Working notes and implementation details for AI agents and developers.

## Purpose

This directory contains:

- Step-by-step implementation plans
- Working notes during development
- AI-agent context for executing RFCs
- Completed work logs with key decisions

## What Belongs Here

- Implementation details and code snippets
- Debugging notes and discoveries
- Task breakdowns for complex features
- Post-implementation summaries

## What Doesn't Belong Here

Design proposals and architectural decisions belong in `/rfc`. This directory is for **how** to implement, not **what** or **why**.

## Compaction Rule

Before merging a PR, compact completed plans:

1. Remove verbose implementation details
2. Point to PR and commits for specifics
3. Keep key decisions and important notes
4. Update status to COMPLETED

Example compacted plan:

```markdown
# Feature Name

**Status:** COMPLETED
**PR:** [#123](https://github.com/videojs/v10/pull/123)

## Summary

Brief description of what was implemented.

## Key Decisions

- Decision 1: Rationale
- Decision 2: Rationale

## Notes

Any gotchas or important context for future reference.
```

## Relationship to RFCs

Plans may link to their parent RFC:

```markdown
# Implementing Feature X

**RFC:** [/rfc/feature-x.md](/rfc/feature-x.md)

## Tasks

...
```
