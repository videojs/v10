import { defineConfig, jsx, transform } from '@videojs/compiler';
import { anyTag, childAsProp } from '@videojs/compiler/ast';

const reactSourceConfig = defineConfig({
  target: jsx({
    imports: {
      '@videojs/core': '@videojs/react',
      '@videojs/core/components': '@videojs/react',
      '@videojs/icons/components': './icons',
    },
    transforms: [
      childAsProp({
        match: anyTag(['Popover.Trigger', 'TooltipPrimitive.Trigger']),
        prop: 'render',
      }),
    ],
  }),
  plugins: [
    transform(
      (code) => {
        const cn = code.import('@videojs/utils/style', 'cn');

        return [
          code.jsx.element('Text').replace('span'),
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

export default reactSourceConfig;
