---
status: active
date: 2026-05-07
---

# SPF conventions

These records contain recurring choices that source alone cannot route consistently. Load only the convention relevant to the change.

| Record | Use it for |
| --- | --- |
| [behaviors](behaviors.md) | composition boundaries, cleanup, splitting, helpers, and per-type work |
| [actors](actors.md) | message-driven ownership and actor lifetime |
| [reactors](reactors.md) | signal-driven state and state-exit cleanup |
| [signals](signals.md) | slot read/write intent, seeding, and external writes |
| [configuration](config.md) | tunables, strategies, defaults, and threading |

Implementation details belong to `packages/spf/src/`, tests, and [the primitive record](../primitives.md). Add a convention only after a pattern recurs; remove examples when their source shape changes.
