---
status: active
date: 2026-05-07
---

# Signals

Signals are SPF's state-over-time substrate. This convention covers ownership and participation; implementation semantics live in source and [the signals decision](../signals.md).

## Slot intent

- Type a slot as writable only in behaviors that own a write.
- Use a readonly signal for consumers.
- Default to readonly when a behavior only reads or derives from the slot.
- Name state for domain facts or intent, not transient implementation flags.

## Writers

Prefer one owning writer per slot. Multiple writers are acceptable only when the relationship is explicit:

- a staged pipeline enriches one value;
- a platform property is synchronized in both directions;
- external intent and automatic policy are separate inputs resolved by one selection behavior.

Do not let external intent write the same resolved output as automatic policy. Store intent separately and let the owning behavior resolve the selected value.

## State and context

- Put serializable engine facts and consumer intent in state.
- Put owned resources, platform objects, and actor references in context.
- Seed a slot through initial state/context when no behavior naturally owns its initial write.
- Use `shareSignals` only at the adapter boundary; internal behaviors should receive declared slices from composition.

## Reactive reads

- Use tracked reads for dependencies that should rerun work.
- Use `peek` or `untrack` for contextual reads that must not participate.
- Hoist computed signals to a stable owner; never create them repeatedly inside an effect.
- Split broad objects when unrelated updates repeatedly invalidate independent work.

Current composition typing and tests live under `packages/spf/src/core/composition/` and `packages/spf/src/core/signals/`.
