---
status: active
date: 2026-05-18
---

# Actors

Use an actor for message-driven ownership: a stable unit owns a resource or queue, accepts discrete commands, and may expose observable lifecycle.

## Choose the smallest actor

- Use a callback actor for fire-and-forget dispatch with no observable state.
- Use a transition actor for reducer-shaped context updates without asynchronous state-specific work.
- Use a machine actor when valid messages or work differ by state, a runner schedules tasks, or settling causes a transition.

Use a reactor instead when signals, rather than messages, drive lifecycle. Use a direct effect when there is no resource, queue, or meaningful state.

## Ownership

- Create an actor in the behavior or parent actor that owns its lifetime.
- Destroy it from the same boundary and clear any context reference.
- Keep one actor when policy and mechanism share one serialized resource. Split actors only when they have independent lifetime or scheduling.
- Put browser-backed actors in a `dom/` boundary; keep framework primitives browser-free.
- Treat the actor snapshot as observation, not a second command channel.

## Work and cancellation

- Schedule cancellable asynchronous operations as tasks through the actor's runner.
- On replacement, decide explicitly whether current work remains useful, must be aborted, or can be deduplicated.
- State-exit cleanup must abort work that is invalid outside that state.
- Do not encode queue state in ad hoc flags when the runner or machine state already owns it.

## Verification

Test valid messages per state, continue-versus-preempt behavior, settling transitions, destruction, and cleanup after source replacement.

Current factories and tests live under `packages/spf/src/core/actors/`; playback actors live under `packages/spf/src/playback/actors/`.
