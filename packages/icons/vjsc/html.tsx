/** @jsxRuntime automatic */
/** @jsxImportSource vjsc/components/registry */

import { defineRegistry, defineTarget } from 'vjsc/components';
import { components, resolveTargets } from './components.generated';

export interface HtmlIconRegistryOptions {
  family?: string | undefined;
}

/** Canonical icons rendered through the lazy HTML icon element. */
export function registry(options: HtmlIconRegistryOptions = {}) {
  const family = options.family ?? 'default';
  const source = family === 'default' ? '@videojs/html/icons/element' : `@videojs/html/icons/element/${family}`;
  const Icon = defineTarget({
    tagName: 'media-icon',
    import: {
      from: source,
      sideEffect: true,
    },
  });

  return defineRegistry({
    components,
    targets: resolveTargets((_component, name) =>
      defineTarget({
        render: ({ props }) => <Icon {...props} {...(family === 'default' ? {} : { family })} name={name} />,
      })
    ),
  });
}
