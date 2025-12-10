# @videojs/compiler

Compiles React skin components to HTML web component modules.

## Installation

```bash
pnpm add @videojs/compiler
```

## Usage

### Basic Compilation

```typescript
import { readFileSync } from 'node:fs';
import { compile } from '@videojs/compiler';

// Read the React skin source file
const source = readFileSync('./MediaSkinMinimal.tsx', 'utf-8');

// Compile returns a complete HTML module as a string
const htmlModule = compile({ input: { source } });

// Output includes:
// - Import statements (MediaSkinElement, defineCustomElement, component definitions, styles)
// - Template function with HTML structure
// - Class declaration extending MediaSkinElement
// - Custom element registration
```

Where `MediaSkinMinimal.tsx` contains:

```tsx
import type { PropsWithChildren } from 'react';
import { MediaContainer, PlayButton } from '@videojs/react';
import { PlayIcon, PauseIcon } from '@videojs/react/icons';
import styles from './styles';

export default function MediaSkinMinimal({ children }: PropsWithChildren) {
  return (
    <MediaContainer className={styles.Container}>
      {children}
      <PlayButton className={`${styles.Button} ${styles.IconButton}`}>
        <PlayIcon className={`${styles.Icon} ${styles.PlayIcon}`} />
        <PauseIcon className={`${styles.Icon} ${styles.PauseIcon}`} />
      </PlayButton>
    </MediaContainer>
  );
}
```

### Module Output Structure

The compiler generates a complete TypeScript/JavaScript module:

```typescript
import { MediaSkinElement } from '@/media/media-skin';
import { defineCustomElement } from '@/utils/custom-element';
import styles from './styles.css';
import '@/define/media-container';
import '@/define/media-play-button';
import '@/icons';

export function getTemplateHTML(): string {
  return /* @__PURE__ */ `
    ${MediaSkinElement.getTemplateHTML()}
    <style>${styles}</style>
    <media-container class="container">
      <slot name="media" slot="media"></slot>
      <media-play-button class="button icon-button">
        <media-play-icon class="icon"></media-play-icon>
        <media-pause-icon class="icon"></media-pause-icon>
      </media-play-button>
    </media-container>
  `;
}

export class MediaSkinMinimalElement extends MediaSkinElement {
  static getTemplateHTML: () => string = getTemplateHTML;
}

defineCustomElement('media-skin-minimal', MediaSkinMinimalElement);
```

**Note:** The compiler currently handles JSX/import transformation and generates a placeholder CSS reference (`${styles}`). Compilation of Tailwind utilities to vanilla CSS is not yet implemented.

## Documentation

For detailed information on architecture and design, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Development

```bash
# Run tests
pnpm test

# Type check
pnpm typecheck

# Build
pnpm build
```

## License

Apache-2.0
