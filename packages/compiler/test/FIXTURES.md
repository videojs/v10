# Test Fixtures Reference

**Total Fixtures**: 19
**Total Tests**: 46 (all passing)

---

## Fixture Organization

```
test/fixtures/
├── components/
│   ├── buttons/
│   │   ├── play-button-simple.tsx           # No icons
│   │   ├── play-button-with-icons.tsx       # With PlayIcon + PauseIcon
│   │   ├── mute-button-simple.tsx           # No icons
│   │   ├── mute-button-with-icons.tsx       # With volume icons
│   │   └── fullscreen-button-with-icons.tsx # With enter/exit icons
│   ├── displays/
│   │   ├── current-time-display-simple.tsx
│   │   ├── duration-display-simple.tsx
│   │   └── preview-time-display-simple.tsx
│   ├── sliders/
│   │   ├── time-slider-root-only.tsx        # Tests Root → base name
│   │   ├── time-slider-full.tsx             # Full compound (Root + Track + Progress + Pointer + Thumb)
│   │   ├── volume-slider-root-only.tsx      # Tests Root → base name
│   │   └── volume-slider-full.tsx           # Full compound
│   ├── containers/
│   │   └── media-container-simple.tsx       # With {children} slot
│   ├── icons/
│   │   └── play-icon-simple.tsx
│   └── interactive/
│       ├── tooltip-with-button.tsx          # Known limitation (Phase 2)
│       └── popover-with-slider.tsx          # Known limitation (Phase 2)
├── example-minimal.tsx                      # Integration fixture
└── frosted-skin.tsx                         # Full production skin
```

---

## Fixture Categories

### Buttons (5 fixtures)

**Simple variants** (no icons):

- `play-button-simple.tsx`
- `mute-button-simple.tsx`

**With icons**:

- `play-button-with-icons.tsx` - PlayIcon + PauseIcon
- `mute-button-with-icons.tsx` - VolumeHighIcon + VolumeLowIcon + VolumeOffIcon
- `fullscreen-button-with-icons.tsx` - FullscreenEnterIcon + FullscreenExitIcon

**Purpose**: Verify button transformation with and without child icon elements

### Displays (3 fixtures)

- `current-time-display-simple.tsx`
- `duration-display-simple.tsx`
- `preview-time-display-simple.tsx`

**Purpose**: Simple component transformation validation

### Sliders (4 fixtures)

**Root only** (critical for Root → base name rule):

- `time-slider-root-only.tsx` - Should output `<media-time-slider>`, NOT `-root`
- `volume-slider-root-only.tsx` - Should output `<media-volume-slider>`, NOT `-root`

**Full compound**:

- `time-slider-full.tsx` - All 5 subcomponents (Root, Track, Progress, Pointer, Thumb)
- `volume-slider-full.tsx` - All 4 subcomponents (Root, Track, Progress, Thumb)

**Purpose**: Verify Root special case and full compound component nesting

### Containers (1 fixture)

- `media-container-simple.tsx` - With `{children}` → slot transformation

**Purpose**: Verify children slot transformation

### Icons (1 fixture)

- `play-icon-simple.tsx`

**Purpose**: Basic icon transformation

### Interactive (2 fixtures) - Known Limitations

- `tooltip-with-button.tsx` - Complex nested structure
- `popover-with-slider.tsx` - Complex nested structure

**Purpose**: Document current limitations and track for Phase 2 implementation

---

## Test Modules

### Component-Specific Tests (DOM-based)

Located in `test/components/`:

- **`buttons.test.ts`** (5 tests) - All button permutations
- **`displays.test.ts`** (3 tests) - All display components
- **`sliders.test.ts`** (5 tests) - Root-only + full compound, Root rule verification
- **`containers.test.ts`** (1 test) - MediaContainer with children slot
- **`interactive.test.ts`** (2 tests) - Tooltip/Popover (documents limitations)

**Total**: 16 component-specific tests

### Integration Tests

- **`example-dom.test.ts`** (4 tests) - DOM-based minimal skin integration
- **`example.test.ts`** (1 test) - String-based minimal skin
- **`frosted-skin.test.ts`** (4 tests) - Full production skin

**Total**: 9 integration tests

### Unit Tests

- **`jsx-transform.test.ts`** (21 tests) - Core transformation logic

**Total**: 21 unit tests

---

## Coverage Matrix

| Component          | Simple          | With Icons | Root Only | Full Compound | Total Tests |
| ------------------ | --------------- | ---------- | --------- | ------------- | ----------- |
| PlayButton         | ✅              | ✅         | -         | -             | 2           |
| MuteButton         | ✅              | ✅         | -         | -             | 2           |
| FullscreenButton   | -               | ✅         | -         | -             | 1           |
| TimeSlider         | -               | -          | ✅        | ✅            | 3           |
| VolumeSlider       | -               | -          | ✅        | ✅            | 2           |
| CurrentTimeDisplay | ✅              | -          | -         | -             | 1           |
| DurationDisplay    | ✅              | -          | -         | -             | 1           |
| PreviewTimeDisplay | ✅              | -          | -         | -             | 1           |
| MediaContainer     | ✅              | -          | -         | -             | 1           |
| Icons              | ✅              | -          | -         | -             | 1           |
| Tooltip            | ✅ (limitation) | -          | -         | -             | 1           |
| Popover            | ✅ (limitation) | -          | -         | -             | 1           |

**Total Component Tests**: 17

---

## Test Patterns

### Simple Component Test

```typescript
it('compiles simple component', () => {
  const source = readFileSync(join(fixturesDir, 'component-simple.tsx'), 'utf-8');
  const result = compile(source);
  const root = parseElement(result.html);

  expect(root.tagName.toLowerCase()).toBe('media-component');
  expect(getClasses(root)).toContain('expected-class');
});
```

### Compound Component Test (Root Only)

```typescript
it('compiles Root only - maps to base element name', () => {
  const source = readFileSync(join(fixturesDir, 'slider-root-only.tsx'), 'utf-8');
  const result = compile(source);
  const root = parseElement(result.html);

  // Critical: Root → base name (no -root suffix)
  expect(root.tagName.toLowerCase()).toBe('media-time-slider');
  expect(root.tagName.toLowerCase()).not.toBe('media-time-slider-root');
});
```

### Compound Component Test (Full)

```typescript
it('compiles full compound component', () => {
  const source = readFileSync(join(fixturesDir, 'slider-full.tsx'), 'utf-8');
  const result = compile(source);
  const root = parseElement(result.html);

  // Verify all subcomponents
  const track = querySelector(root, 'media-time-slider-track');
  expect(track.parentElement).toBe(root);

  const progress = querySelector(track, 'media-time-slider-progress');
  expect(progress.parentElement).toBe(track);
});
```

---

## Running Tests

```bash
# All tests
pnpm test

# Component-specific
pnpm test buttons
pnpm test sliders
pnpm test displays

# By approach
pnpm test dom        # DOM-based tests
pnpm test frosted    # Frosted skin
```

---

**Last Updated**: 2025-11-07
**Test Count**: 46 tests passing ✅
