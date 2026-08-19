import { defineRegistry, defineTarget } from 'vjsc/components';
import { components, resolveTargets } from './components.generated';

export interface ReactIconRegistryOptions {
  family?: string | undefined;
}

/** Canonical icons rendered through the React icon package. */
export function registry(options: ReactIconRegistryOptions = {}) {
  const family = options.family ?? 'default';
  const source = family === 'default' ? '@videojs/react/icons' : `@videojs/react/icons/${family}`;

  return defineRegistry({
    components,
    targets: resolveTargets((component) =>
      defineTarget({
        import: {
          from: source,
          name: component,
        },
        props: {
          from: source,
          name: 'IconProps',
        },
      })
    ),
  });
}
