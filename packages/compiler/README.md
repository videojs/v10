# @videojs/compiler

Compile React components to web components.

## Features

**Current (v0.1):**

- ✅ JSX → HTML web component transformation
- ✅ Element name conversion (`<PlayButton>` → `<media-play-button>`)
- ✅ Compound components (`<TimeSlider.Root>` → `<media-time-slider-root>`)
- ✅ Attribute transformation (`className` → `class`, camelCase → kebab-case)
- ✅ Children placeholder (`{children}` → `<slot name="media" slot="media"></slot>`)
- ✅ Basic className extraction for CSS generation
- ✅ Placeholder CSS generation

**Future:**

- ⏳ Tailwind CSS processing
- ⏳ Import transformation
- ⏳ Named groups, pseudo-elements
- ⏳ Container queries
- ⏳ CLI and file I/O

## Installation

```bash
pnpm add @videojs/compiler
```

## Usage

### Basic Compilation

```typescript
import { compile } from '@videojs/compiler';

const source = `
  export default function MediaSkinMinimal({ children }) {
    return (
      <MediaContainer className="container">
        {children}
        <PlayButton className="play-button" />
      </MediaContainer>
    );
  }
`;

const result = compile(source);

console.log(result.html);
// <media-container class="container">
//   <slot name="media" slot="media"></slot>
//   <media-play-button class="play-button"></media-play-button>
// </media-container>

console.log(result.css);
// .container { /* TODO: Add styles */ }
// .play-button { /* TODO: Add styles */ }

console.log(result.classNames);
// ['container', 'play-button']
```

### Formatted Output

```typescript
import { compileFormatted } from '@videojs/compiler';

const output = compileFormatted(source);
console.log(output);
```

## Transformation Rules

### Element Names

| Input               | Output                          |
| ------------------- | ------------------------------- |
| `<PlayButton>`      | `<media-play-button>`           |
| `<TimeSlider.Root>` | `<media-time-slider-root>`      |
| `<div>`, `<button>` | `<div>`, `<button>` (unchanged) |

### Attributes

| Input                       | Output                |
| --------------------------- | --------------------- |
| `className="foo"`           | `class="foo"`         |
| `className={styles.Button}` | `class="button"`      |
| `dataTestId="test"`         | `data-test-id="test"` |
| `delay={200}`               | `delay="200"`         |
| `disabled`                  | `disabled`            |

### Children

| Input               | Output                                    |
| ------------------- | ----------------------------------------- |
| `{children}`        | `<slot name="media" slot="media"></slot>` |
| `<span>Text</span>` | `<span>Text</span>` (unchanged)           |

## Configuration

```typescript
import { compile } from '@videojs/compiler';

const result = compile(source, {
  transform: {
    elementPrefix: 'vjs-', // Default: 'media-'
    builtInElements: new Set(['div', 'span', 'button',]),
  },
});
```

## Architecture

The compiler follows a simple 3-step pipeline:

1. **Parse**: Use Babel to parse JSX/TSX into AST
2. **Transform**: Convert JSX elements to HTML strings
3. **Extract**: Collect classNames for CSS generation

All core functions are pure (string in, string out) with no filesystem I/O.

## Testing

```bash
# Run tests
pnpm test

# Type check
pnpm typecheck

# Build
pnpm build
```

## Current Limitations (v0.1)

1. **Template Literal classNames** - Not fully resolved
   - `className={\`${styles.A} ${styles.B}\`}` won't extract properly
   - **Workaround**: Use single className references

2. **Tooltip/Popover Components** - Structural transformation not implemented
   - React uses nested compound components (Tooltip.Root, Trigger, Portal, etc.)
   - HTML uses flat structure with `commandfor` linking
   - **Current**: Produces incorrect nested structure
   - **Future**: Phase 2 (v0.2) will add transformation rules

3. **Tailwind CSS** - Placeholder only
   - Generates stub CSS rules
   - **Future**: Phase 3 (v0.3) will add full Tailwind processing

See [ROADMAP.md](./ROADMAP.md) for complete feature timeline.

## Development

This is v0.1 - a minimal, incremental implementation focusing on JSX compilation only. Future iterations will add:

- Tooltip/Popover structural transformations (v0.2)
- Full Tailwind CSS processing (v0.3)
- Import path transformation (v0.4)
- Template literal resolution (v0.5)
- CLI for batch compilation (v0.6)
- Source maps

## License

Apache-2.0
