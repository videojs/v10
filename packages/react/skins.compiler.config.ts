import { defineConfig, jsx, transform } from '@videojs/compiler';
import { anyTag, childAsProp } from '@videojs/compiler/ast';
import { tailwind } from '@videojs/compiler/tailwind';

export type SkinSourceStyle = 'css' | 'tailwind';

export interface CreateReactSkinSourceConfigOptions {
  style: SkinSourceStyle;
  tailwindInput?: string | undefined;
}

export function createReactSkinSourceConfig({ style, tailwindInput }: CreateReactSkinSourceConfigOptions) {
  return defineConfig({
    target: jsx({
      imports: {
        '@videojs/core/components': '@videojs/react',
        '@videojs/icons/components': './icons',
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
              input: requiredTailwindInput(tailwindInput),
              output: 'styles.css',
              resolve: {
                element: ({ defaultName }) => ({ className: `vjs-${defaultName}` }),
              },
              vars: {
                hoist: { rootSelector: '.vjs-skin' },
                properties: { mode: 'inline' },
              },
            }
      ),
      transform(
        (code) => {
          const cn = code.import('@videojs/utils/style', 'cn');

          return [
            code.jsx.element('Text').replace('span'),
            code.jsx.element('Slider.Thumbnail.Root').replace('div'),
            code.jsx.element('Slider.Thumbnail.Image').replace('Slider.Thumbnail'),
            code.jsx
              .props('className')
              .where(code.value.isArray())
              .replace(({ value }) => code.value.call(cn, code.value.arrayItems(value))),
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
