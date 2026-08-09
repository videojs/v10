import { defineConfig, jsx, transform } from '@videojs/compiler';
import { anyTag, childAsProp } from '@videojs/compiler/ast';
import { type SkinStyleTarget, skinTailwind } from './styles';

export type CreateReactSkinSourceConfigOptions = SkinStyleTarget & {
  iconSet?: string | undefined;
};

/** Create the compiler policy for a React Skin projection. */
export function createReactSkinSourceConfig(options: CreateReactSkinSourceConfigOptions) {
  const iconSet = options.iconSet ?? 'default';
  return defineConfig({
    target: jsx({
      imports: {
        '@videojs/core/components': '@videojs/react',
        '@videojs/icons/components': iconSet === 'default' ? '@videojs/react/icons' : `@videojs/react/icons/${iconSet}`,
        '@videojs/jsx': (name) => ({
          source: 'react',
          name: name === 'ComponentNode' ? 'ReactElement' : name,
        }),
      },
      transforms: [
        childAsProp({
          match: anyTag(['Popover.Trigger', 'TooltipPrimitive.Trigger']),
          prop: 'render',
        }),
      ],
    }),
    plugins: [
      skinTailwind(options.style === 'tailwind' ? { style: 'tailwind' } : { style: 'css', program: options.program }),
      transform(
        (code) => {
          const cn = code.import('@videojs/utils/style', 'cn');
          const ReactElement = code.import('react', 'ReactElement', { type: true });

          return [
            code.jsx.element('Text').replace('span'),
            code.jsx.element('Slider.Thumbnail.Root').replace('div'),
            code.jsx.element('Slider.Thumbnail.Image').replace('Slider.Thumbnail'),
            code.jsx
              .props('className')
              .where(code.value.isArray())
              .replace(({ value }) => code.value.call(cn, code.value.arrayItems(value))),
            code.interface('ButtonTooltipProps').replaceExtends('TooltipProps', 'TooltipPrimitive.RootProps'),
            code
              .interface('ButtonTooltipProps')
              .property('children')
              .setType(() => code.type.named(ReactElement)),
          ];
        },
        { name: '@videojs/react:source-ui' }
      ),
    ],
  });
}
