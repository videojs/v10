import type { ComponentSchema } from '../../vjsc/src/components/index.ts';
import { type ComponentTarget, defineComponentTarget, type SourceProps } from '../../vjsc/src/target/index.ts';
import { jsx } from '../../vjsc/src/target/jsx-runtime.ts';

export interface IconTargetOptions {
  readonly family?: string | undefined;
}

const htmlIconNames: Readonly<Record<string, string>> = {
  AirPlayEnterIcon: 'airplay-enter',
  AirPlayExitIcon: 'airplay-exit',
};

export function createHtmlIconTarget(options: IconTargetOptions = {}): ComponentTarget<ComponentSchema> {
  const family = options.family ?? 'default';
  const source = family === 'default' ? '@videojs/html/icons/element' : `@videojs/html/icons/element/${family}`;

  return defineComponentTarget<ComponentSchema>()(({ element }) => {
    const Icon = element('media-icon', { import: { from: source, sideEffect: true } });

    return {
      source: '@videojs/icons/vjsc',
      resolve:
        ({ component }) =>
        ({ props }: { props: SourceProps<Record<string, unknown>> }) =>
          jsx(Icon, {
            ...props,
            ...(family === 'default' ? {} : { family }),
            name:
              htmlIconNames[component] ??
              component
                .replace(/Icon$/, '')
                .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
                .toLowerCase(),
          }),
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
