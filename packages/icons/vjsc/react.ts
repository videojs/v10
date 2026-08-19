import { defineRegistry } from 'vjsc/registry';
import * as $ from './schema.generated';

export interface ReactIconRegistryOptions {
  family?: string | undefined;
}

/** Canonical icons rendered through the React icon package. */
export function registry(options: ReactIconRegistryOptions = {}) {
  const family = options.family ?? 'default';
  const source = family === 'default' ? '@videojs/react/icons' : `@videojs/react/icons/${family}`;

  return defineRegistry({
    schema: $.schema,
    entries: $.mapEntries((component) => ({
      import: {
        from: source,
        name: component,
      },
      props: {
        from: source,
        name: 'IconProps',
      },
    })),
  });
}
