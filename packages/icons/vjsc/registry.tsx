/** @jsxRuntime automatic */
/** @jsxImportSource vjsc/registry */

import type { ComponentSchema } from 'vjsc/components';
import { defineElement, defineRegistry } from 'vjsc/registry';

export interface IconRegistryOptions {
  family?: string | undefined;
}

/** Create canonical icon mappings for a React icon family. */
export function createReactRegistry(schema: ComponentSchema, options: IconRegistryOptions = {}) {
  const family = options.family ?? 'default';
  const source = family === 'default' ? '@videojs/react/icons' : `@videojs/react/icons/${family}`;

  return defineRegistry({
    schema,
    output: 'jsx',
    entries: Object.fromEntries(
      Object.keys(schema.definitions).map((component) => [
        component,
        {
          import: { from: source, name: component },
          props: { from: source, name: 'IconProps' },
        },
      ])
    ) as any,
  });
}

/** Create canonical icon mappings for a lazy HTML icon family. */
export function createHtmlRegistry(schema: ComponentSchema, options: IconRegistryOptions = {}) {
  const family = options.family ?? 'default';

  const source = family === 'default' ? '@videojs/html/icons/element' : `@videojs/html/icons/element/${family}`;

  const Icon = defineElement('media-icon', {
    import: {
      from: source,
      sideEffect: true,
    },
  });

  return defineRegistry({
    schema,
    output: 'html',
    entries: Object.fromEntries(
      Object.keys(schema.definitions).map((component) => [
        component,
        {
          render: ({ props }: { props: Record<string, unknown> }) => (
            <Icon
              {...props}
              {...(family === 'default' ? {} : { family })}
              name={component
                .replace(/Icon$/, '')
                .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
                .toLowerCase()}
            />
          ),
        },
      ])
    ) as any,
  });
}
