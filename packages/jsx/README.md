# @videojs/jsx

A private, target-neutral JSX authoring runtime for Video.js source UI. It creates inert component nodes that `@videojs/compiler` can lower to React, HTML, and other source-owned targets without putting framework markup in canonical source.

This package is not a browser renderer. Calling a canonical component directly throws because components are intended to be interpreted by the compiler.

## Entry points

- `@videojs/jsx` exports component manifests, node types, `createComponent`, and `Slot`.
- `@videojs/jsx/jsx-runtime` supports TypeScript's automatic JSX transform.
- `@videojs/jsx/jsx-dev-runtime` provides the corresponding development transform.

Configure canonical source with `jsxImportSource` set to `@videojs/jsx`, then author against named component catalogs such as `@videojs/core/components`.

```tsx
import { PlayButton, Tooltip } from '@videojs/core/components';

export function PlayerControls() {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger>
        <PlayButton />
      </Tooltip.Trigger>
      <Tooltip.Popup>Play</Tooltip.Popup>
    </Tooltip.Root>
  );
}
```

Lowercase platform elements are intentionally rejected. Target-specific elements, imports, and behavior belong in compiler output rather than canonical source.

## Community

If you need help with Video.js v10 or want to discuss the source-owned UI pipeline:

- [Join Discord Server][discord]
- [See GitHub Discussions][gh-discussions]

## License

[Apache-2.0](./LICENSE)

[discord]: https://discord.gg/JBqHh485uF
[gh-discussions]: https://github.com/videojs/v10/discussions
