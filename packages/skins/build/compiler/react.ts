import { defineConfig, jsx, rewrite } from '@videojs/compiler';
import { anyTag, childAsProp, type ImportRef } from '@videojs/compiler/ast';
import type { SkinStyleManifest } from '../styles/manifest';
import { type SkinStyleTarget, skinStyles } from '../styles/transform';

interface CreateCompilerReactConfigOptions {
  style: SkinStyleTarget;
  styles: SkinStyleManifest;
  iconSet?: string | undefined;
  resolveImport?: ReactImportResolver | undefined;
}

export type ReactImportResolver = (reference: ImportRef) => ImportRef | false;

/** Create the compiler policy for a React Skin projection. */
export function createCompilerReactConfig(options: CreateCompilerReactConfigOptions) {
  const iconSet = options.iconSet ?? 'default';
  const resolveImport = (reference: ImportRef): ImportRef | false =>
    options.resolveImport ? options.resolveImport(reference) : reference;
  return defineConfig({
    target: jsx({
      imports: {
        '@videojs/core/components': (name) => resolveImport({ source: '@videojs/react', name }),
        '@videojs/icons/components': (name) =>
          resolveImport({
            source: iconSet === 'default' ? '@videojs/react/icons' : `@videojs/react/icons/${iconSet}`,
            name,
          }),
        '@videojs/jsx': (name) =>
          resolveImport({
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
      skinStyles({ manifest: options.styles, target: options.style }),
      rewrite(
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
        { name: '@videojs/skins:react' }
      ),
    ],
  });
}
