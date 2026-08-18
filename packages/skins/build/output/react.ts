import {
  type Expression,
  isArrayLiteralExpression,
  isCallExpression,
  isIdentifier,
  isJsxElement,
  isJsxSelfClosingElement,
} from 'typescript';
import { type CompilerConfig, createJsxEditor, jsx, rewrite } from 'vjsc';
import type { ImportRef } from 'vjsc/ast';
import { defineOutput, type StaticCatalogOutputAdapter } from 'vjsc/catalog';
import { extendRegistry } from 'vjsc/components';
import { registry as iconRegistry } from '../../../icons/compiler/react';
import { registry as reactRegistry } from '../../../react/compiler';

export type ReactImportResolver = (reference: ImportRef) => ImportRef | false;

interface ReactOutputOptions {
  rootComponentName?: string | undefined;
  iconSet?: string | undefined;
  resolveImport?: ReactImportResolver | undefined;
  components?: { editable?: boolean | undefined } | undefined;
}

const SETTINGS_SUBMENU_FUNCTIONS = ['QualityMenu', 'AudioTrackMenu', 'PlaybackRateMenu', 'CaptionsMenu'] as const;

const TARGET_COMPONENTS = [
  ['AirPlayButton', '$.AirPlayButton', 'AirPlayButtonPrimitive', ['children']],
  ['BufferingIndicator', '$.BufferingIndicator', 'BufferingIndicatorPrimitive', ['children']],
  ['CaptionsButton', '$.CaptionsButton', 'CaptionsButtonPrimitive', ['children']],
  ['CastButton', '$.CastButton', 'CastButtonPrimitive', ['children']],
  ['Container', null, 'ContainerPrimitive', []],
  ['ErrorDialog', '$.ErrorDialog.Popup', 'ErrorDialogPrimitive.Popup', ['children']],
  ['FullscreenButton', '$.FullscreenButton', 'FullscreenButtonPrimitive', ['children']],
  ['MuteButton', '$.MuteButton', 'MuteButtonPrimitive', ['children']],
  ['PiPButton', '$.PiPButton', 'PiPButtonPrimitive', ['children']],
  ['PlayButton', '$.PlayButton', 'PlayButtonPrimitive', ['children']],
  ['Poster', '$.Poster', 'PosterPrimitive', []],
  ['SeekButton', '$.SeekButton', 'SeekButtonPrimitive', ['children']],
  ['SeekIndicator', '$.SeekIndicator.Root', 'SeekIndicatorPrimitive.Root', ['children']],
  ['StatusAnnouncer', '$.StatusAnnouncer', 'StatusAnnouncerPrimitive', ['children']],
  ['StatusIndicator', '$.StatusIndicator.Root', 'StatusIndicatorPrimitive.Root', ['children', 'actions']],
  ['PlaybackStatusIndicator', '$.StatusIndicator.Root', 'StatusIndicatorPrimitive.Root', ['children', 'actions']],
  ['TimeSlider', '$.TimeSlider.Root', 'TimeSliderPrimitive.Root', ['children']],
  ['VolumeIndicator', '$.VolumeIndicator.Root', 'VolumeIndicatorPrimitive.Root', ['children']],
  ['VolumeSlider', '$.VolumeSlider.Root', 'VolumeSliderPrimitive.Root', ['children']],
  ['QualityRadioGroup', '$.QualityRadioGroup', 'QualityRadioGroupPrimitive', []],
  ['AudioTrackRadioGroup', '$.AudioTrackRadioGroup', 'AudioTrackRadioGroupPrimitive', []],
  ['PlaybackRateRadioGroup', '$.PlaybackRateRadioGroup', 'PlaybackRateRadioGroupPrimitive', []],
  ['CaptionsRadioGroup', '$.CaptionsRadioGroup', 'CaptionsRadioGroupPrimitive', []],
] as const;

const STATEFUL_COMPONENTS = [
  ...TARGET_COMPONENTS.flatMap(([name, primitive]) => (primitive ? [[name, primitive] as const] : [])),
  ['VolumePopover', '$.Popover.Popup'],
  ['SettingsMenu', '$.Menu.Content'],
  ['Submenu', '$.Menu.Content'],
  ['RadioItem', '$.Menu.RadioItem'],
] as const;

const PRESENTATIONAL_COMPONENT_PROPS = ['Overlay', 'VideoStatusIndicators'] as const;

/** Create the React module output adapter for a Skin catalog. */
export function reactOutput(options: ReactOutputOptions = {}): StaticCatalogOutputAdapter {
  const resolveImport = (reference: ImportRef): ImportRef | false =>
    options.resolveImport ? options.resolveImport(reference) : reference;
  const iconSet = options.iconSet ?? 'default';
  const iconSource = iconSet === 'default' ? '@videojs/react/icons' : `@videojs/react/icons/${iconSet}`;
  const registry = extendRegistry(reactRegistry, iconRegistry({ family: iconSet }));

  return defineOutput({
    registry,
    compiler: createCompilerConfig(options, resolveImport, iconSource),
  });
}

function createCompilerConfig(
  options: ReactOutputOptions,
  resolveImport: ReactImportResolver,
  iconSource: string
): CompilerConfig {
  const rootComponentName = options.rootComponentName ?? 'DefaultVideoSkin';
  const rootPropsName = `${rootComponentName}Props`;

  const containerProps = requiredReactImport(resolveImport, 'ContainerProps');
  const posterProps = requiredReactImport(resolveImport, 'PosterProps');

  const usePlayerRef = requiredReactImport(resolveImport, 'usePlayer');
  const useQualityOptionsRef = requiredReactImport(resolveImport, 'useQualityOptions');
  const useAudioTrackOptionsRef = requiredReactImport(resolveImport, 'useAudioTrackOptions');
  const usePlaybackRateOptionsRef = requiredReactImport(resolveImport, 'usePlaybackRateOptions');
  const useCaptionsOptionsRef = requiredReactImport(resolveImport, 'useCaptionsOptions');

  const cnReference = resolveImport({ source: '@videojs/utils/style', name: 'cn' });

  if (!cnReference) throw new Error('React Skin output requires a target import for `cn`.');

  const resolveClassNameReference = resolveImport({
    source: options.components?.editable ? '@videojs/skins/registry' : '@videojs/utils/style',
    name: 'resolveClassName',
  });

  if (!resolveClassNameReference) {
    throw new Error('React Skin output requires a target import for `resolveClassName`.');
  }

  return {
    target: jsx({
      imports: {
        '@videojs/core': (name) => resolveImport({ source: '@videojs/core', name }),
        '@videojs/react': (name) => resolveImport({ source: '@videojs/react', name }),
        '@videojs/utils/style': (name) => resolveImport({ source: '@videojs/utils/style', name }),
        [iconSource]: (name) => resolveImport({ source: iconSource, name }),
        react: (name) => resolveImport({ source: 'react', name }),
      },
    }),
    plugins: [
      rewrite((code) => {
        const cn = code.import(cnReference.source, cnReference.name);
        const resolveClassName = code.import(resolveClassNameReference.source, resolveClassNameReference.name);
        const ReactElement = code.import('react', 'ReactElement', { type: true });
        const ReactNode = code.import('react', 'ReactNode', { type: true });
        const ComponentProps = code.import('react', 'ComponentProps', { type: true });
        const ContainerProps = code.import(containerProps.source, containerProps.name, { type: true });
        const PosterProps = code.import(posterProps.source, posterProps.name, { type: true });
        const SettingsMenuProps = code.import('./settings-menu', 'SettingsMenuProps', {
          type: true,
          relativeTo: 'module',
        });
        const SubmenuProps = code.import('./submenu', 'SubmenuProps', { type: true, relativeTo: 'module' });
        const VolumeSliderProps = code.import('../sliders/volume-slider', 'VolumeSliderProps', {
          type: true,
          relativeTo: 'module',
        });
        const usePlayer = code.import(usePlayerRef.source, usePlayerRef.name);
        const rootSkin = code.function(rootComponentName);
        const volumePopover = code.function('VolumePopover');
        const useQualityOptions = code.import(useQualityOptionsRef.source, useQualityOptionsRef.name);
        const useAudioTrackOptions = code.import(useAudioTrackOptionsRef.source, useAudioTrackOptionsRef.name);
        const usePlaybackRateOptions = code.import(usePlaybackRateOptionsRef.source, usePlaybackRateOptionsRef.name);
        const useCaptionsOptions = code.import(useCaptionsOptionsRef.source, useCaptionsOptionsRef.name);
        const posterIsString = () => code.value.equal(code.value.typeOf('poster'), code.value.string('string'));
        const classNameValues = (value: Expression): Expression[] => {
          const items = isArrayLiteralExpression(value)
            ? [...value.elements]
            : isCallExpression(value) && isIdentifier(value.expression) && value.expression.text === 'cn'
              ? [...value.arguments]
              : [value];

          return (items.length > 0 ? items : [value]).filter(
            (item) => !isIdentifier(item) || item.text !== 'className'
          );
        };
        const composeStateClassName = (value: Expression) =>
          code.value.arrow(
            ['state'],
            code.value.call(cn, [...classNameValues(value), code.value.call(resolveClassName, ['className', 'state'])])
          );
        const omitProps = (type: ReturnType<typeof code.type.named>, omitted: readonly string[]) =>
          omitted.length === 0
            ? type
            : code.type.named('Omit', [
                type,
                omitted.length === 1
                  ? code.type.literal(omitted[0]!)
                  : code.type.union(...omitted.map((name) => code.type.literal(name))),
              ]);
        const primitiveProps = (target: string, omitted: readonly string[] = []) =>
          omitProps(code.type.named(target.includes('.') ? `${target}Props` : `${target}.Props`), omitted);
        const defineFunctionProps = (
          name: string,
          extendsType: () => ReturnType<typeof code.type.named>,
          properties: () => NonNullable<Parameters<typeof code.statement.interface>[0]['properties']> = () => []
        ) => {
          const propsName = `${name}Props`;
          const component = code.function(name);

          return [
            component.insertBefore(() =>
              code.statement.interface({
                name: propsName,
                export: true,
                extends: [extendsType()],
                properties: properties(),
              })
            ),
            component.setParameterType(code.type.named(propsName)),
          ];
        };

        return [
          // Canonical components use core props; React-facing component props belong to this output adapter.
          ...TARGET_COMPONENTS.flatMap(([name, , target, omitted]) =>
            defineFunctionProps(name, () => primitiveProps(target, omitted))
          ),
          ...PRESENTATIONAL_COMPONENT_PROPS.flatMap((name) =>
            defineFunctionProps(name, () =>
              omitProps(code.type.named(ComponentProps, [code.type.literal('div')]), ['children'])
            )
          ),
          ...defineFunctionProps(
            'ButtonTooltip',
            () => code.type.named('TooltipPrimitive.RootProps'),
            () => [{ name: 'children', type: code.type.named(ReactElement) }]
          ),
          ...defineFunctionProps(
            'VolumePopover',
            () => primitiveProps('PopoverPrimitive.Root', ['children']),
            () => [
              {
                name: 'className',
                optional: true,
                type: code.type.indexed(code.type.named('PopoverPrimitive.PopupProps'), code.type.literal('className')),
              },
              {
                name: 'orientation',
                optional: true,
                type: code.type.indexed(code.type.named(VolumeSliderProps), code.type.literal('orientation')),
              },
            ]
          ),
          ...defineFunctionProps(
            'SettingsMenu',
            () => primitiveProps('MenuPrimitive.Root'),
            () => [
              {
                name: 'children',
                optional: true,
                type: code.type.named(ReactNode),
              },
              {
                name: 'className',
                optional: true,
                type: code.type.indexed(code.type.named('MenuPrimitive.ContentProps'), code.type.literal('className')),
              },
            ]
          ),
          ...defineFunctionProps(
            'Submenu',
            () => primitiveProps('MenuPrimitive.Root'),
            () => [
              {
                name: 'children',
                optional: true,
                type: code.type.named(ReactNode),
              },
              {
                name: 'icon',
                type: code.type.named(ReactNode),
              },
              {
                name: 'label',
                type: code.type.named(ReactNode),
              },
              {
                name: 'selectedLabel',
                type: code.type.named(ReactNode),
              },
              {
                name: 'className',
                optional: true,
                type: code.type.indexed(code.type.named('MenuPrimitive.ContentProps'), code.type.literal('className')),
              },
            ]
          ),
          ...defineFunctionProps(
            'RadioItem',
            () => primitiveProps('MenuPrimitive.RadioItem'),
            () => [
              {
                name: 'children',
                optional: true,
                type: code.type.named(ReactNode),
              },
              {
                name: 'checked',
                optional: true,
                type: code.type.union(code.type.boolean(), code.type.undefined()),
              },
            ]
          ),
          ...SETTINGS_SUBMENU_FUNCTIONS.flatMap((name) =>
            defineFunctionProps(name, () =>
              code.type.named('Omit', [
                code.type.named(SubmenuProps),
                code.type.union(
                  ...['children', 'icon', 'label', 'selectedLabel'].map((property) => code.type.literal(property))
                ),
              ])
            )
          ),
          ...defineFunctionProps('VideoSettingsMenu', () =>
            code.type.named('Omit', [code.type.named(SettingsMenuProps), code.type.literal('children')])
          ),

          ...(options.components?.editable
            ? [
                code.function('MenuChevron').insertBefore(() =>
                  code.statement.interface({
                    name: 'MenuChevronProps',
                    export: true,
                    extends: [
                      code.type.named('Omit', [
                        code.type.named(ComponentProps, [code.type.literal('svg')]),
                        code.type.literal('children'),
                      ]),
                    ],
                    properties: [{ name: 'flipped', optional: true, type: code.type.boolean() }],
                  })
                ),
                code
                  .function('MenuChevron')
                  .setProps(
                    [
                      { name: 'flipped', initializer: code.value.boolean(false) },
                      'className',
                      { name: 'props', spread: true },
                    ],
                    { type: 'MenuChevronProps', initializer: code.value.object() }
                  ),
                code.function('MenuChevron').jsx.element('ChevronIcon').spreadProps('props', { position: 'start' }),
                code
                  .function('MenuChevron')
                  .jsx.props('className')
                  .on('ChevronIcon')
                  .replace(({ value }) => code.value.call(cn, [...classNameValues(value), 'className'])),
              ]
            : []),

          ...STATEFUL_COMPONENTS.map(([name, primitive]) =>
            code
              .function(name)
              .jsx.props('className')
              .on(primitive)
              .replace(({ value }) => composeStateClassName(value))
          ),

          // Public root composition and always-supported Container/Poster APIs.
          rootSkin.insertBefore(() =>
            code.statement.interface({
              name: rootPropsName,
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
          rootSkin.setProps(['children', 'className', 'poster', { name: 'containerProps', spread: true }], {
            type: rootPropsName,
            initializer: code.value.object(),
          }),
          rootSkin.jsx.element('Poster').replace(() =>
            code.jsx.if(
              'poster',
              code.jsx.create('Poster', {
                src: code.value.conditional(posterIsString(), code.value.identifier('poster'), code.value.undefined()),
                render: code.value.conditional(
                  posterIsString(),
                  code.value.undefined(),
                  code.value.identifier('poster')
                ),
              })
            )
          ),
          rootSkin.jsx.element('Container').spreadProps('containerProps'),
          rootSkin.jsx
            .props('className')
            .on('Container')
            .replace(({ value }) => code.value.call(cn, [value, 'className'])),
          code.function('Poster').jsx.element('$.Poster').selfClosing(),
          // Runtime availability and settings state used by the React target.
          volumePopover.prepend(() =>
            code.statement.const(
              'volumeAvailability',
              code.value.call(usePlayer, [
                code.value.arrow(['state'], code.value.property('state', 'volumeAvailability')),
              ])
            )
          ),
          volumePopover.jsx
            .element('$.Popover.Root')
            .replace(({ element }) =>
              code.value.conditional(
                code.value.equal('volumeAvailability', code.value.string('available')),
                element,
                code.jsx.create('MuteButton')
              )
            ),
          code
            .function('QualityMenu')
            .prepend(() => code.statement.const('quality', code.value.call(useQualityOptions, []))),
          code
            .function('AudioTrackMenu')
            .prepend(() => code.statement.const('audioTrack', code.value.call(useAudioTrackOptions, []))),
          code
            .function('PlaybackRateMenu')
            .prepend(() => code.statement.const('playbackRate', code.value.call(usePlaybackRateOptions, []))),
          code
            .function('CaptionsMenu')
            .prepend(() => code.statement.const('captions', code.value.call(useCaptionsOptions, []))),
          ...[
            ['QualityMenu', 'quality', 'hasQuality'],
            ['AudioTrackMenu', 'audioTrack', 'hasAudioTrack'],
            ['PlaybackRateMenu', 'playbackRate', 'hasPlaybackRate'],
            ['CaptionsMenu', 'captions', 'hasCaptions'],
          ].flatMap(([functionName, value, availability]) => [
            code
              .function(functionName!)
              .beforeReturn(() =>
                code.statement.const(
                  availability!,
                  code.value.equal(
                    code.value.property(code.value.optionalProperty(value!, 'state'), 'availability'),
                    code.value.string('available')
                  )
                )
              ),
            code
              .function(functionName!)
              .jsx.element('Submenu')
              .replace(({ element }) => code.value.and(availability!, element)),
          ]),
          code
            .function('VideoSettingsMenu')
            .prepend(() => [
              code.statement.const('quality', code.value.call(useQualityOptions, [])),
              code.statement.const('audioTrack', code.value.call(useAudioTrackOptions, [])),
              code.statement.const('playbackRate', code.value.call(usePlaybackRateOptions, [])),
              code.statement.const('captions', code.value.call(useCaptionsOptions, [])),
            ]),
          code.function('VideoSettingsMenu').beforeReturn(() =>
            code.statement.const(
              'hasSettings',
              ['quality', 'audioTrack', 'playbackRate', 'captions']
                .map((value) =>
                  code.value.equal(
                    code.value.property(code.value.optionalProperty(value, 'state'), 'availability'),
                    code.value.string('available')
                  )
                )
                .reduceRight((right, left) => code.value.or(left, right))
            )
          ),
          code
            .function('VideoSettingsMenu')
            .jsx.element('SettingsMenu')
            .replace(({ element }) => code.value.and('hasSettings', element)),
          // Menu item behavior shared by every settings submenu.
          ...SETTINGS_SUBMENU_FUNCTIONS.map((name) =>
            code.function(name).jsx.element('RadioItem').addProp('checked', code.value.property('item', 'checked'))
          ),
          // Bind the otherwise-empty selected-label outlet to React menu state.
          ...[
            ['QualityMenu', 'quality'],
            ['AudioTrackMenu', 'audioTrack'],
            ['PlaybackRateMenu', 'playbackRate'],
            ['CaptionsMenu', 'captions'],
          ].map(([component, value]) =>
            code
              .function(component!)
              .jsx.props('selectedLabel')
              .on('Submenu')
              .replace(({ value: selectedLabel, factory }) => {
                if (!isJsxElement(selectedLabel) && !isJsxSelfClosingElement(selectedLabel)) {
                  return selectedLabel;
                }

                const jsxEditor = createJsxEditor(factory);

                return jsxEditor.apply(
                  selectedLabel,
                  jsxEditor.tag.replace('span'),
                  jsxEditor.children.set([
                    jsxEditor.create.expression(code.value.optionalProperty(value!, 'selectedLabel')),
                  ])
                );
              })
          ),
          // Canonical class lists are compiler syntax; React receives its configured class utility.
          code.jsx
            .props('className')
            .where(code.value.isArray())
            .replace(({ value }) => code.value.call(cn, code.value.arrayItems(value))),
        ];
      }),
    ],
  };
}

function requiredReactImport(resolveImport: (reference: ImportRef) => ImportRef | false, name: string): ImportRef {
  const reference = resolveImport({ source: '@videojs/react', name });
  if (!reference) throw new Error(`React Skin output requires a target import for \`${name}\`.`);
  return reference;
}
