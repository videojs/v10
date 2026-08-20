/** @jsxRuntime automatic */
/** @jsxImportSource vjsc/registry */

import { defineElement, defineRegistry } from 'vjsc/registry';
import * as $ from './schema.generated';

export interface HtmlIconRegistryOptions {
  family?: string | undefined;
}

/** Canonical icons rendered through the lazy HTML icon element. */
export function registry(options: HtmlIconRegistryOptions = {}) {
  const family = options.family ?? 'default';
  const source = family === 'default' ? '@videojs/html/icons/element' : `@videojs/html/icons/element/${family}`;
  const Icon = defineElement('media-icon', {
    import: {
      from: source,
      sideEffect: true,
    },
  });

  return defineRegistry({
    schema: $.schema,
    entries: $.mapEntries((_component, name) => ({
      render: ({ props }) => <Icon {...props} {...(family === 'default' ? {} : { family })} name={name} />,
    })),
  });
}
