import { defineConfig, jsx, rewrite } from '@videojs/compiler';
import { anyTag, childAsProp, type ImportRef } from '@videojs/compiler/ast';
import type { SkinStyleManifest } from '../styles/manifest';
import { type SkinStyleTarget, skinStyles } from '../styles/transform';

interface CreateCompilerReactConfigOptions {
  style: SkinStyleTarget;
  styles: SkinStyleManifest;
  rootClassName?: string | undefined;
  iconSet?: string | undefined;
  resolveImport?: ReactImportResolver | undefined;
}

export type ReactImportResolver = (reference: ImportRef) => ImportRef | false;

/** Create the compiler policy for a React Skin projection. */
export function createCompilerReactConfig(options: CreateCompilerReactConfigOptions) {
  const iconSet = options.iconSet ?? 'default';
  const resolveImport = (reference: ImportRef): ImportRef | false =>
    options.resolveImport ? options.resolveImport(reference) : reference;
  const containerProps = requiredReactImport(resolveImport, 'ContainerProps');
  const posterProps = requiredReactImport(resolveImport, 'PosterProps');
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
          name === 'Slot'
            ? false
            : resolveImport({
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
          const ReactNode = code.import('react', 'ReactNode', { type: true });
          const ContainerProps = code.import(containerProps.source, containerProps.name, { type: true });
          const PosterProps = code.import(posterProps.source, posterProps.name, { type: true });
          const defaultVideoSkin = code.function('DefaultVideoSkin');
          const container = code.function('Container');
          const poster = code.function('Poster');
          const posterIsString = () => code.value.equal(code.value.typeOf('poster'), code.value.string('string'));

          return [
            defaultVideoSkin.insertBefore(() =>
              code.statement.interface({
                name: 'DefaultVideoSkinProps',
                export: true,
                extends: [code.type.named('Omit', [code.type.named(ContainerProps), code.type.literal('children')])],
                properties: [
                  {
                    name: 'children',
                    optional: true,
                    type: code.type.named(ReactNode),
                  },
                  {
                    name: 'poster',
                    optional: true,
                    type: code.type.union(
                      code.type.string(),
                      code.type.indexed(code.type.named(PosterProps), code.type.literal('render')),
                      code.type.undefined()
                    ),
                  },
                ],
              })
            ),
            defaultVideoSkin.setProps(['children', 'className', 'poster', { name: 'containerProps', spread: true }], {
              type: 'DefaultVideoSkinProps',
              initializer: code.value.object(),
            }),
            defaultVideoSkin.jsx.element('Slot').replace(() => code.jsx.expression(code.value.identifier('children'))),
            defaultVideoSkin.jsx.element('Poster').replace(() =>
              code.jsx.if(
                'poster',
                code.jsx.create('Poster', {
                  src: code.value.conditional(
                    posterIsString(),
                    code.value.identifier('poster'),
                    code.value.undefined()
                  ),
                  render: code.value.conditional(
                    posterIsString(),
                    code.value.undefined(),
                    code.value.identifier('poster')
                  ),
                })
              )
            ),
            defaultVideoSkin.jsx.element('Container').spreadProps('containerProps', { position: 'start' }),
            defaultVideoSkin.jsx.element('Container').addProp('className', () => {
              if (!options.rootClassName) {
                throw new Error('React Skin root lowering requires `rootClassName`.');
              }
              return code.value.array([code.value.string(options.rootClassName), 'className']);
            }),
            container.setProps(['children', 'className', { name: 'props', spread: true }], {
              type: ContainerProps,
            }),
            container.jsx.element('ContainerPrimitive').spreadProps('props', { position: 'start' }),
            container.jsx
              .props('className')
              .on('ContainerPrimitive')
              .replace(({ value }) => code.value.array([value, 'className'])),
            poster.setProps(['className', { name: 'props', spread: true }], { type: PosterProps }),
            poster.jsx.element('PosterPrimitive').spreadProps('props', { position: 'start' }),
            poster.jsx
              .props('className')
              .on('PosterPrimitive')
              .replace(({ value }) =>
                code.value.arrow(
                  ['state'],
                  code.value.call(cn, [
                    value,
                    code.value.conditional(
                      code.value.equal(code.value.typeOf('className'), code.value.string('function')),
                      code.value.call('className', ['state']),
                      code.value.identifier('className')
                    ),
                  ])
                )
              ),
            poster.jsx.element('PosterPrimitive').selfClosing(),
            code.variable('OverlayPrimitive').remove(),
            code.jsx.element('OverlayPrimitive').replace('div'),
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

function requiredReactImport(resolveImport: (reference: ImportRef) => ImportRef | false, name: string): ImportRef {
  const reference = resolveImport({ source: '@videojs/react', name });
  if (!reference) throw new Error(`React Skin lowering requires a target import for \`${name}\`.`);
  return reference;
}
