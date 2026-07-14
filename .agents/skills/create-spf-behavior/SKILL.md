---
name: create-spf-behavior
description: Create or extract one SPF playback-engine behavior. Use for a new atomic responsibility with signals, lifecycle, cleanup, composition, and tests.
---

# Create an SPF behavior

Read adjacent behaviors, the composition site, state/context slots, and `internal/design/spf/conventions/README.md`. Load only the applicable signal, actor, reactor, configuration, or behavior convention.

1. Define one-sentence purpose, inputs, writes, lifecycle, cleanup, ordering, and source-reset rules.
2. Confirm the responsibility is independently testable and does not hide coordination with another behavior.
3. Add focused failing tests, implement the smallest behavior, and wire it at the owning composition layer.
4. Verify slot ownership, naming, cleanup, boundaries, and final test coverage.

If existing ownership must change, treat the work as a behavior refactor. If the requested capability spans multiple behaviors, keep this workflow scoped to the one atomic responsibility and surface the broader composition work separately.

Run the affected playback-engine tests and `pnpm -F @videojs/spf check:boundaries`; build SPF when public types or exports change.

## Example

Input: “Extract manifest refresh scheduling into its own behavior.”

Output: One independently testable responsibility with explicit inputs, writes, lifecycle, cleanup, composition, and boundary checks.
