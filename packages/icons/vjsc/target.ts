import type { ComponentSchema } from '../../vjsc/src/components/index.ts';
import {
  type ComponentRewriteContext,
  type ComponentTarget,
  defineComponentTarget,
} from '../../vjsc/src/target/index.ts';
import { jsx } from '../../vjsc/src/target/jsx-runtime.ts';
import type { VjscValue } from '../../vjsc/src/value.ts';

export interface IconTargetOptions {
  readonly family?: string | undefined;
}

export function createHtmlIconTarget(options: IconTargetOptions = {}): ComponentTarget<ComponentSchema> {
  const family = options.family ?? 'default';
  const source = family === 'default' ? '@videojs/html/icons/element' : `@videojs/html/icons/element/${family}`;

  return defineComponentTarget<ComponentSchema>()(({ element }) => {
    const Icon = element('media-icon', { import: { from: source, sideEffect: true } });

    return {
      source: '@videojs/icons/vjsc',
      resolve:
        ({ component }) =>
        ({ props }: ComponentRewriteContext<VjscValue>) => {
          const iconProps = {
            ...props,
            name: component
              .replace(/Icon$/, '')
              .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
              .toLowerCase(),
          };
          if (family !== 'default') Object.assign(iconProps, { family });
          return jsx(Icon, iconProps);
        },
      jsx: {
        importSource: 'vjsc/html-runtime',
        attributes: 'html',
        host: {
          from: 'vjsc/html-runtime/jsx-runtime',
          name: 'Host',
        },
        scope: {
          from: 'vjsc/html-runtime/jsx-runtime',
          name: 'Scope',
        },
      },
    };
  });
}

export function createReactIconTarget(options: IconTargetOptions = {}): ComponentTarget<ComponentSchema> {
  const family = options.family ?? 'default';
  const source = family === 'default' ? '@videojs/react/icons' : `@videojs/react/icons/${family}`;

  return defineComponentTarget<ComponentSchema>()(({ imported }) => ({
    source: '@videojs/icons/vjsc',
    resolve: ({ component }) =>
      imported({
        from: source,
        name: component,
        props: { from: source, name: 'IconProps' },
      }),
    jsx: {
      importSource: 'react',
      attributes: 'react',
    },
  }));
}
