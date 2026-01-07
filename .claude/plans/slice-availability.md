# Slice Availability Design

## The Problem

Slices may target capabilities the media doesn't support (e.g., `qualitySlice` on native `<video>`, `volumeSlice` on iOS).

## Decisions

### Single Availability Type

```typescript
type Availability = 'available' | 'unavailable' | 'unsupported';
```

| Value           | Meaning                                                    |
| --------------- | ---------------------------------------------------------- |
| `'unsupported'` | Platform/target can never do this                          |
| `'unavailable'` | Could work, not ready yet (e.g., waiting for HLS manifest) |
| `'available'`   | Ready to use                                               |

### Naming Convention

Property: `{feature}Availability`

- `volumeAvailability`
- `qualityAvailability`
- `pipAvailability`

### Default Value

Always start `'unsupported'` (pessimistic). Must be proven otherwise.

### Async Capability Detection

Use module-level cache + `update()` pattern. No API changes needed.

```typescript
let volumeSupportCache: Availability = 'unsupported';

const volumeSlice = createSlice<HTMLMediaElement>()({
  initialState: {
    volume: 1,
    volumeAvailability: 'unsupported',
  },

  getSnapshot: ({ target }) => ({
    volume: target.volume,
    volumeAvailability: volumeSupportCache,
  }),

  subscribe: ({ target, update, signal }) => {
    listen(target, 'volumechange', update, { signal });

    // Async detection
    canChangeVolume().then((supported) => {
      if (signal.aborted) return;
      volumeSupportCache = supported ? 'available' : 'unsupported';
      update();
    });
  },

  request: {
    setVolume: {
      guard: () => volumeSupportCache === 'available',
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
  const { volume, volumeAvailability } = useStore((s) => s);

  if (volumeAvailability === 'unsupported') return null;
  if (volumeAvailability === 'unavailable') return <Slider disabled />;
  return <Slider value={volume} />;
}
```

## References

- Media Chrome uses similar pattern with `*Unavailable` properties
- Vidstack uses `canSetVolume`, `canSetQuality` computed properties
