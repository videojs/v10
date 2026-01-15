# Feature Availability Design

## Problem

Slices may target capabilities the platform doesn't support.

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
type Availability = 'available' | 'unavailable' | 'unsupported';
```

| Value           | Meaning                                                |
| --------------- | ------------------------------------------------------ |
| `'unsupported'` | Platform can never do this (e.g., iOS volume)          |
| `'unavailable'` | Could work, not ready yet (e.g., waiting for manifest) |
| `'available'`   | Ready to use                                           |

---

## Related: Missing Slice vs Unavailable Capability

See [slice-accessor-design.md](./slice-accessor-design.md).

| Concept                | Cause               | Detection                         |
| ---------------------- | ------------------- | --------------------------------- |
| Missing slice          | Composition error   | `getSlice()` → `undefined`        |
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
let availability: Availability = 'unsupported';

const volumeSlice = createSlice<HTMLMediaElement>()({
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

### UI Usage

```tsx
function VolumeSlider() {
  const { volume, volumeAvailability } = usePlayer().state;

  if (volumeAvailability === 'unsupported') return null;
  if (volumeAvailability === 'unavailable') return <Slider disabled />;
  return <Slider value={volume} />;
}
```

---

## References

- Media Chrome uses similar pattern with `*Unavailable` properties
- Vidstack uses `canSetVolume`, `canSetQuality` computed properties
