---
status: draft
date: 2025-01-27
---

# Feature Availability Design

## Problem

Features may target capabilities the platform doesn't support.

```ts
// iOS Safari doesn't allow programmatic volume control
request: {
  setVolume: (vol, { target }) => {
    target.volume = vol; // silently fails on iOS
  },
}
```

UI needs to know: hide control? disable it? show it normally?

## Solution

Single availability state per feature:

```ts
type FeatureAvailability = 'available' | 'unavailable' | 'unsupported';
```

| Value           | Meaning                                                |
| --------------- | ------------------------------------------------------ |
| `'unsupported'` | Platform can never do this (e.g., iOS volume)          |
| `'unavailable'` | Could work, not ready yet (e.g., waiting for manifest) |
| `'available'`   | Ready to use                                           |

---

## Related: Missing Feature vs Unavailable Capability

See [feature-slice-design](feature-slice-design.md) for feature access patterns.

| Concept                | Cause               | Detection                         |
| ---------------------- | ------------------- | --------------------------------- |
| Missing feature        | Feature not included| `slice === undefined`             |
| Unavailable capability | Platform limitation | `*Availability === 'unsupported'` |

---

## Implementation

### Naming Convention

Property: `{feature}Availability`

- `volumeAvailability`
- `qualityAvailability`
- `pipAvailability`

### Default Value

Always start `'unsupported'` (pessimistic). Must be proven otherwise.

### Async Capability Detection

Use module-level cache + `update()` pattern. No API changes needed.

```ts
let availability: FeatureAvailability = 'unsupported';

const volumeFeature = createFeature<HTMLMediaElement>()({
  initialState: {
    volume: 1,
    volumeAvailability: 'unsupported',
  },

  getSnapshot: ({ target }) => ({
    volume: target.volume,
    volumeAvailability: availability,
  }),

  subscribe: ({ target, update, signal }) => {
    listen(target, 'volumechange', update, { signal });

    // Async detection
    canChangeVolume().then((supported) => {
      if (signal.aborted) return;
      availability = supported ? 'available' : 'unsupported';
      update();
    });
  },

  request: {
    setVolume: {
      guard: () => availability === 'available',
      handler: (vol, { target }) => {
        target.volume = vol;
      },
    },
  },
});
```

### Guards

Guards receive `{ target, signal }`, not state. Check capability on target directly.

## References

- Media Chrome uses similar pattern with `*Unavailable` properties
- Vidstack uses `canSetVolume`, `canSetQuality` computed properties
