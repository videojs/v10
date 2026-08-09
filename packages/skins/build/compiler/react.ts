import { defineConfig, jsx, transform } from '@videojs/compiler';
import { anyTag, childAsProp } from '@videojs/compiler/ast';
import { type StyleProgram, tailwind } from '@videojs/compiler/tailwind';
import { resolveSkinStyle } from './styles';

export type SkinSourceStyle = 'css' | 'tailwind';

export interface CreateReactSkinSourceConfigOptions {
  style: SkinSourceStyle;
  iconSet?: string | undefined;
  tailwindInput?: string | undefined;
  styleProgram?: StyleProgram | undefined;
}

export function createReactSkinSourceConfig({
  style,
  iconSet = 'default',
  tailwindInput,
  styleProgram,
}: CreateReactSkinSourceConfigOptions) {
  return defineConfig({
    target: jsx({
      imports: {
        '@videojs/core/components': '@videojs/react',
        '@videojs/icons/components': iconSet === 'default' ? '@videojs/react/icons' : `@videojs/react/icons/${iconSet}`,
        '@videojs/jsx': (name) => ({ source: 'react', name: name === 'ComponentNode' ? 'ReactElement' : name }),
      },
      transforms: [
        childAsProp({
          match: anyTag(['Popover.Trigger', 'TooltipPrimitive.Trigger']),
          prop: 'render',
        }),
      ],
    }),
    plugins: [
      tailwind(
        style === 'tailwind'
          ? { mode: 'inline' }
          : {
              mode: 'extract',
              ...(styleProgram
                ? { program: styleProgram }
                : { input: requiredTailwindInput(tailwindInput), output: 'styles.css' }),
              resolve: {
                element: resolveSkinStyle,
                token: resolveSkinStyle,
              },
              ...(styleProgram
                ? {}
                : { emit: { support: 'separate', tailwindVariables: 'inline', themeSelector: '.media-skin' } }),
            }
      ),
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

function requiredTailwindInput(input: string | undefined): string {
  if (!input) throw new Error('React vanilla CSS source generation requires a Tailwind input file.');
  return input;
}

const reactSourceConfig = createReactSkinSourceConfig({ style: 'tailwind' });

export default reactSourceConfig;
