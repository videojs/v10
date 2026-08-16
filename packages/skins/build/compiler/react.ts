import {
  createJsxEditor,
  DiagnosticError,
  defineConfig,
  diagnosticLocationFromNode,
  jsx,
  rewrite,
  type TransformHelpers,
} from '@videojs/compiler';
import { anyTag, childAsProp, hasJsxAttribute, type ImportRef, type JsxElementLike } from '@videojs/compiler/ast';
import ts, { type Expression } from 'typescript';
import type { SkinStyleManifest } from '../styles/manifest';
import { type SkinStyleTarget, skinStyles } from '../styles/transform';

interface CreateCompilerReactConfigOptions {
  style: SkinStyleTarget;
  styles: SkinStyleManifest;
  rootComponentName?: string | undefined;
  rootClassName?: string | undefined;
  iconSet?: string | undefined;
  resolveImport?: ReactImportResolver | undefined;
  composeClassNames?: boolean | undefined;
  /** Add editable target props and className forwarding to generated component boundaries. */
  extendComponents?: boolean | undefined;
}

export type ReactImportResolver = (reference: ImportRef) => ImportRef | false;

const SETTINGS_SUBMENU_FUNCTIONS = ['QualityMenu', 'AudioTrackMenu', 'PlaybackRateMenu', 'CaptionsMenu'] as const;

const DIRECT_COMPONENTS = [
  ['AirPlayButton', 'AirPlayButtonPrimitive', 'AirPlayButtonPrimitive.Props'],
  ['BufferingIndicator', 'BufferingIndicatorPrimitive', 'BufferingIndicatorPrimitive.Props'],
  ['CaptionsButton', 'CaptionsButtonPrimitive', 'CaptionsButtonPrimitive.Props'],
  ['CastButton', 'CastButtonPrimitive', 'CastButtonPrimitive.Props'],
  ['FullscreenButton', 'FullscreenButtonPrimitive', 'FullscreenButtonPrimitive.Props'],
  ['MuteButton', 'MuteButtonPrimitive', 'MuteButtonPrimitive.Props'],
  ['PiPButton', 'PiPButtonPrimitive', 'PiPButtonPrimitive.Props'],
  ['PlayButton', 'PlayButtonPrimitive', 'PlayButtonPrimitive.Props'],
  ['SeekButton', 'SeekButtonPrimitive', 'SeekButtonPrimitive.Props'],
  ['SeekIndicator', 'SeekIndicatorPrimitive.Root', 'SeekIndicatorPrimitive.RootProps'],
  ['StatusAnnouncer', 'StatusAnnouncerPrimitive', 'StatusAnnouncerPrimitive.Props'],
  ['TimeSlider', 'TimeSliderPrimitive.Root', 'TimeSliderPrimitive.RootProps'],
  ['VolumeSlider', 'VolumeSliderPrimitive.Root', 'VolumeSliderPrimitive.RootProps'],
] as const;

const COMPOSED_COMPONENTS = [
  ['StatusIndicator', 'StatusIndicatorPrimitive.Root', 'StatusIndicatorPrimitive.RootProps', ['children', 'actions']],
  [
    'PlaybackStatusIndicator',
    'StatusIndicatorPrimitive.Root',
    'StatusIndicatorPrimitive.RootProps',
    ['children', 'actions'],
  ],
  ['VolumeIndicator', 'VolumeIndicatorPrimitive.Root', 'VolumeIndicatorPrimitive.RootProps', ['children']],
] as const;

const RADIO_GROUP_COMPONENTS = [
  ['QualityRadioGroup', 'QualityRadioGroupPrimitive', 'QualityRadioGroupPrimitive.Props'],
  ['AudioTrackRadioGroup', 'AudioTrackRadioGroupPrimitive', 'AudioTrackRadioGroupPrimitive.Props'],
  ['PlaybackRateRadioGroup', 'PlaybackRateRadioGroupPrimitive', 'PlaybackRateRadioGroupPrimitive.Props'],
  ['CaptionsRadioGroup', 'CaptionsRadioGroupPrimitive', 'CaptionsRadioGroupPrimitive.Props'],
] as const;

/** Create the compiler policy for a React Skin projection. */
export function createCompilerReactConfig(options: CreateCompilerReactConfigOptions) {
  const rootComponentName = options.rootComponentName ?? 'DefaultVideoSkin';
  const rootPropsName = `${rootComponentName}Props`;
  const iconSet = options.iconSet ?? 'default';
  const resolveImport = (reference: ImportRef): ImportRef | false =>
    options.resolveImport ? options.resolveImport(reference) : reference;
  const containerProps = requiredReactImport(resolveImport, 'ContainerProps');
  const posterProps = requiredReactImport(resolveImport, 'PosterProps');
  const usePlayerRef = requiredReactImport(resolveImport, 'usePlayer');
  const useTranslatorRef = requiredReactImport(resolveImport, 'useTranslator');
  const useQualityOptionsRef = requiredReactImport(resolveImport, 'useQualityOptions');
  const useAudioTrackOptionsRef = requiredReactImport(resolveImport, 'useAudioTrackOptions');
  const usePlaybackRateOptionsRef = requiredReactImport(resolveImport, 'usePlaybackRateOptions');
  const useCaptionsOptionsRef = requiredReactImport(resolveImport, 'useCaptionsOptions');
  const cnReference = resolveImport({ source: '@videojs/utils/style', name: 'cn' });
  if (!cnReference) throw new Error('React Skin lowering requires a target import for `cn`.');
  const resolveClassNameReference = options.extendComponents
    ? resolveImport({ source: '@videojs/skins/registry', name: 'resolveClassName' })
    : false;
  if (options.extendComponents && !resolveClassNameReference) {
    throw new Error('React Skin lowering requires a target import for `resolveClassName`.');
  }
  return defineConfig({
    target: jsx({
      imports: {
        '@videojs/core': (name) =>
          options.extendComponents &&
          ['PopoverProps', 'SeekButtonProps', 'TooltipProps', 'VolumeSliderProps'].includes(name)
            ? false
            : resolveImport({ source: '@videojs/core', name }),
        '@videojs/core/components': (name) => resolveImport({ source: '@videojs/react', name }),
        '@videojs/icons/components': (name) =>
          resolveImport({
            source: iconSet === 'default' ? '@videojs/react/icons' : `@videojs/react/icons/${iconSet}`,
            name,
          }),
        '@videojs/jsx': (name) =>
          name === 'Slot' || name === 'Template'
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
      skinStyles({
        manifest: options.styles,
        target: options.style,
        composeClassNames: options.composeClassNames,
      }),
      rewrite(
        (code) => {
          const cn = code.import(cnReference.source, cnReference.name);
          const resolveClassName = resolveClassNameReference
            ? code.import(resolveClassNameReference.source, resolveClassNameReference.name)
            : undefined;
          const ReactElement = code.import('react', 'ReactElement', { type: true });
          const ReactNode = code.import('react', 'ReactNode', { type: true });
          const ComponentProps = code.import('react', 'ComponentProps', { type: true });
          const ContainerProps = code.import(containerProps.source, containerProps.name, { type: true });
          const PosterProps = code.import(posterProps.source, posterProps.name, { type: true });
          const SettingsMenuProps = code.import('./settings-menu', 'SettingsMenuProps', { type: true });
          const usePlayer = code.import(usePlayerRef.source, usePlayerRef.name);
          const rootSkin = code.function(rootComponentName);
          const container = code.function('Container');
          const poster = code.function('Poster');
          const volumePopover = code.function('VolumePopover');
          const settingsFunctions = ['SettingsMenu', ...SETTINGS_SUBMENU_FUNCTIONS];
          const useTranslator = code.import(useTranslatorRef.source, useTranslatorRef.name);
          const useQualityOptions = code.import(useQualityOptionsRef.source, useQualityOptionsRef.name);
          const useAudioTrackOptions = code.import(useAudioTrackOptionsRef.source, useAudioTrackOptionsRef.name);
          const usePlaybackRateOptions = code.import(usePlaybackRateOptionsRef.source, usePlaybackRateOptionsRef.name);
          const useCaptionsOptions = code.import(useCaptionsOptionsRef.source, useCaptionsOptionsRef.name);
          const posterIsString = () => code.value.equal(code.value.typeOf('poster'), code.value.string('string'));
          const classNameValues = (value: Expression): Expression[] => {
            const items = code.value.arrayItems(value);
            return items.length > 0 ? items : [value];
          };
          const composeStateClassName = (value: Expression) =>
            resolveClassName
              ? code.value.arrow(
                  ['state'],
                  code.value.call(cn, [
                    ...classNameValues(value),
                    code.value.call(resolveClassName, ['className', 'state']),
                  ])
                )
              : code.value.arrow(
                  ['state'],
                  code.value.call(cn, [
                    ...classNameValues(value),
                    code.value.conditional(
                      code.value.equal(code.value.typeOf('className'), code.value.string('function')),
                      code.value.call('className', ['state']),
                      code.value.identifier('className')
                    ),
                  ])
                );
          const omitProps = (type: string, omitted: readonly string[]) =>
            code.type.named('Omit', [
              code.type.named(type),
              code.type.union(...omitted.map((name) => code.type.literal(name))),
            ]);
          return [
            // Lower constrained canonical JSX before target component rewrites.
            ...createReactTemplatePartTransforms(code),
            ...createReactTemplateTransforms(code),

            // Registry output opts into editable props on every component boundary.
            ...(options.extendComponents
              ? [
                  // Components backed by one target primitive.
                  ...DIRECT_COMPONENTS.flatMap(([name, primitive, primitiveProps]) => {
                    const propsName = `${name}Props`;
                    const component = code.function(name);
                    return [
                      component.insertBefore(() =>
                        code.statement.interface({
                          name: propsName,
                          export: true,
                          extends: [omitProps(primitiveProps, ['children'])],
                          properties: [],
                        })
                      ),
                      component.setProps(['className', { name: 'props', spread: true }], { type: propsName }),
                      ...(name === 'SeekButton' || name === 'VolumeSlider'
                        ? []
                        : [component.jsx.element(primitive).spreadProps('props', { position: 'start' })]),
                      component.jsx
                        .props('className')
                        .on(primitive)
                        .replace(({ value }) => composeStateClassName(value)),
                    ];
                  }),
                  // Components that own children or behavioral props internally.
                  ...COMPOSED_COMPONENTS.flatMap(([name, primitive, primitiveProps, omitted]) => {
                    const propsName = `${name}Props`;
                    const component = code.function(name);
                    return [
                      component.insertBefore(() =>
                        code.statement.interface({
                          name: propsName,
                          export: true,
                          extends: [omitProps(primitiveProps, omitted)],
                          properties: [],
                        })
                      ),
                      component.setProps(['className', { name: 'props', spread: true }], {
                        type: propsName,
                      }),
                      component.jsx.element(primitive).spreadProps('props', { position: 'start' }),
                      component.jsx
                        .props('className')
                        .on(primitive)
                        .replace(({ value }) => composeStateClassName(value)),
                    ];
                  }),
                  // Presentational roots and dialogs expose their rendered target element.
                  code.function('Overlay').insertBefore(() =>
                    code.statement.interface({
                      name: 'OverlayProps',
                      export: true,
                      extends: [
                        code.type.named('Omit', [
                          code.type.named(ComponentProps, [code.type.literal('div')]),
                          code.type.literal('children'),
                        ]),
                      ],
                      properties: [],
                    })
                  ),
                  code
                    .function('Overlay')
                    .setProps(['className', { name: 'props', spread: true }], { type: 'OverlayProps' }),
                  code.function('Overlay').jsx.element('OverlayRoot').spreadProps('props', { position: 'start' }),
                  code
                    .function('Overlay')
                    .jsx.props('className')
                    .on('OverlayRoot')
                    .replace(({ value }) => code.value.call(cn, [...classNameValues(value), 'className'])),
                  code.function('ErrorDialog').insertBefore(() =>
                    code.statement.interface({
                      name: 'ErrorDialogProps',
                      export: true,
                      extends: [omitProps('ErrorDialogPrimitive.PopupProps', ['children'])],
                      properties: [],
                    })
                  ),
                  code
                    .function('ErrorDialog')
                    .setProps(['className', { name: 'props', spread: true }], { type: 'ErrorDialogProps' }),
                  code.function('ErrorDialog').jsx.element('ErrorDialogPrimitive.Popup').spreadProps('props', {
                    position: 'start',
                  }),
                  code
                    .function('ErrorDialog')
                    .jsx.props('className')
                    .on('ErrorDialogPrimitive.Popup')
                    .replace(({ value }) => composeStateClassName(value)),
                  // Popovers and menus forward root behavior plus popup class names.
                  code.interface('VolumePopoverProps').addProperties([
                    {
                      name: 'className',
                      optional: true,
                      type: code.type.indexed(code.type.named('Popover.PopupProps'), code.type.literal('className')),
                    },
                  ]),
                  code.interface('VolumePopoverProps').extends('Popover.RootProps'),
                  code
                    .interface('VolumePopoverProps')
                    .property('side')
                    .setType(() => code.type.indexed(code.type.named('Popover.RootProps'), code.type.literal('side'))),
                  code
                    .interface('VolumePopoverProps')
                    .property('orientation')
                    .setType(() => code.type.union(code.type.literal('horizontal'), code.type.literal('vertical'))),
                  code.function('VolumePopover').addProps(['className', { name: 'props', spread: true }]),
                  code.function('VolumePopover').jsx.element('Popover.Root').spreadProps('props'),
                  code
                    .function('VolumePopover')
                    .jsx.props('className')
                    .on('Popover.Popup')
                    .replace(({ value }) => composeStateClassName(value)),
                  ...SETTINGS_SUBMENU_FUNCTIONS.flatMap((name) => {
                    const propsName = `${name}Props`;
                    const component = code.function(name);
                    const submenuProps = code.import('./submenu', 'SubmenuProps', { type: true });
                    return [
                      component.insertBefore(() =>
                        code.statement.interface({
                          name: propsName,
                          export: true,
                          extends: [
                            code.type.named('Omit', [
                              code.type.named(submenuProps),
                              code.type.union(
                                ...['children', 'icon', 'label', 'selectedLabel'].map((property) =>
                                  code.type.literal(property)
                                )
                              ),
                            ]),
                          ],
                          properties: [],
                        })
                      ),
                      component.setProps([{ name: 'props', spread: true }], {
                        type: propsName,
                        initializer: code.value.object(),
                      }),
                      component.jsx.element('Submenu').spreadProps('props', { position: 'start' }),
                    ];
                  }),
                  code.interface('SubmenuProps').addProperties([
                    {
                      name: 'className',
                      optional: true,
                      type: code.type.indexed(code.type.named('Menu.ContentProps'), code.type.literal('className')),
                    },
                  ]),
                  code.interface('SubmenuProps').extends('Menu.RootProps'),
                  code.function('Submenu').addProps(['className', { name: 'props', spread: true }]),
                  code.function('Submenu').jsx.element('Menu.Root').spreadProps('props'),
                  code
                    .function('Submenu')
                    .jsx.props('className')
                    .on('Menu.Content')
                    .replace(({ value }) => composeStateClassName(value)),
                  code.interface('SettingsMenuProps').addProperties([
                    {
                      name: 'className',
                      optional: true,
                      type: code.type.indexed(code.type.named('Menu.ContentProps'), code.type.literal('className')),
                    },
                  ]),
                  code.interface('SettingsMenuProps').extends('Menu.RootProps'),
                  code.function('SettingsMenu').addProps(['className', { name: 'props', spread: true }]),
                  code.function('SettingsMenu').jsx.element('Menu.Root').spreadProps('props'),
                  code
                    .function('SettingsMenu')
                    .jsx.props('className')
                    .on('Menu.Content')
                    .replace(({ value }) => composeStateClassName(value)),
                  code.function('VideoSettingsMenu').insertBefore(() =>
                    code.statement.interface({
                      name: 'VideoSettingsMenuProps',
                      export: true,
                      extends: [
                        code.type.named('Omit', [code.type.named(SettingsMenuProps), code.type.literal('children')]),
                      ],
                      properties: [],
                    })
                  ),
                  code.function('VideoSettingsMenu').setProps([{ name: 'props', spread: true }], {
                    type: 'VideoSettingsMenuProps',
                    initializer: code.value.object(),
                  }),
                  code.function('VideoSettingsMenu').jsx.element('SettingsMenu').spreadProps('props'),
                  // Internal menu and feedback pieces remain editable in registry output.
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
                    .replace(({ value }) => code.value.call(cn, [value, 'className'])),
                  code.function('VideoStatusIndicators').insertBefore(() =>
                    code.statement.interface({
                      name: 'VideoStatusIndicatorsProps',
                      export: true,
                      extends: [
                        code.type.named('Omit', [
                          code.type.named(ComponentProps, [code.type.literal('div')]),
                          code.type.literal('children'),
                        ]),
                      ],
                      properties: [],
                    })
                  ),
                  code.function('VideoStatusIndicators').setProps(['className', { name: 'props', spread: true }], {
                    type: 'VideoStatusIndicatorsProps',
                    initializer: code.value.object(),
                  }),
                  code
                    .function('VideoStatusIndicators')
                    .jsx.element('StatusIndicatorGroup')
                    .spreadProps('props', { position: 'start' }),
                  code
                    .function('VideoStatusIndicators')
                    .jsx.props('className')
                    .on('StatusIndicatorGroup')
                    .replace(({ value }) => code.value.call(cn, [...classNameValues(value), 'className'])),
                  code.function('VideoHotkeys').insertBefore(() =>
                    code.statement.interface({
                      name: 'VideoHotkeysProps',
                      export: true,
                      properties: [{ name: 'disabled', optional: true, type: code.type.boolean() }],
                    })
                  ),
                  code
                    .function('VideoHotkeys')
                    .setProps([{ name: 'disabled', initializer: code.value.boolean(false) }], {
                      type: 'VideoHotkeysProps',
                      initializer: code.value.object(),
                    }),
                  code
                    .function('VideoHotkeys')
                    .jsx.element('Hotkey')
                    .addProp('disabled', code.value.identifier('disabled')),
                  code.function('VideoGestures').insertBefore(() =>
                    code.statement.interface({
                      name: 'VideoGesturesProps',
                      export: true,
                      properties: [{ name: 'disabled', optional: true, type: code.type.boolean() }],
                    })
                  ),
                  code
                    .function('VideoGestures')
                    .setProps([{ name: 'disabled', initializer: code.value.boolean(false) }], {
                      type: 'VideoGesturesProps',
                      initializer: code.value.object(),
                    }),
                  code
                    .function('VideoGestures')
                    .jsx.element('Gesture')
                    .addProp('disabled', code.value.identifier('disabled')),
                ]
              : []),

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
            rootSkin.jsx.element('Slot').replace(() => code.jsx.expression(code.value.identifier('children'))),
            rootSkin.jsx.element('Poster').replace(() =>
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
            rootSkin.jsx.element('Container').spreadProps('containerProps', { position: 'start' }),
            rootSkin.jsx.element('Container').addProp('className', () => {
              if (!options.rootClassName) {
                throw new Error('React Skin root lowering requires `rootClassName`.');
              }
              return code.value.array([code.value.string(options.rootClassName), 'className']);
            }),
            container.insertBefore(() =>
              code.statement.interface({
                name: 'ContainerProps',
                export: true,
                extends: [code.type.named('ContainerPrimitive.Props')],
                properties: [],
              })
            ),
            container.setProps(['children', 'className', { name: 'props', spread: true }], {
              type: 'ContainerProps',
            }),
            container.jsx.element('ContainerPrimitive').spreadProps('props', { position: 'start' }),
            container.jsx
              .props('className')
              .on('ContainerPrimitive')
              .replace(({ value }) => code.value.array([...classNameValues(value), 'className'])),
            poster.insertBefore(() =>
              code.statement.interface({
                name: 'PosterProps',
                export: true,
                extends: [code.type.named('PosterPrimitive.Props')],
                properties: [],
              })
            ),
            poster.setProps(['className', { name: 'props', spread: true }], { type: 'PosterProps' }),
            poster.jsx.element('PosterPrimitive').spreadProps('props', { position: 'start' }),
            poster.jsx
              .props('className')
              .on('PosterPrimitive')
              .replace(({ value }) => composeStateClassName(value)),
            poster.jsx.element('PosterPrimitive').selfClosing(),
            ...RADIO_GROUP_COMPONENTS.flatMap(([name, primitive, primitiveProps]) => {
              const propsName = `${name}Props`;
              const component = code.function(name);
              return [
                component.insertBefore(() =>
                  code.statement.interface({
                    name: propsName,
                    export: true,
                    extends: [code.type.named(primitiveProps)],
                    properties: [],
                  })
                ),
                component.setProps(['className', { name: 'props', spread: true }], { type: propsName }),
                component.jsx.element(primitive).spreadProps('props', { position: 'start' }),
                component.jsx
                  .props('className')
                  .on(primitive)
                  .replace(({ value }) => composeStateClassName(value)),
                component.jsx.element(primitive).selfClosing(),
              ];
            }),
            // Runtime availability and settings state used by the React projection.
            volumePopover.prepend(() =>
              code.statement.const(
                'volumeAvailability',
                code.value.call(usePlayer, [
                  code.value.arrow(['state'], code.value.property('state', 'volumeAvailability')),
                ])
              )
            ),
            volumePopover.jsx
              .element('Popover.Root')
              .replace(({ element }) =>
                code.value.conditional(
                  code.value.equal('volumeAvailability', code.value.string('available')),
                  element,
                  code.jsx.create('MuteButton')
                )
              ),
            ...settingsFunctions.map((name) =>
              code.function(name).prepend(() => code.statement.const('t', code.value.call(useTranslator, [])))
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
            code.interface('RadioItemProps').extends('Menu.RadioItemProps'),
            code.interface('RadioItemProps').addProperties([{ name: 'checked', type: code.type.boolean() }]),
            code.function('RadioItem').setProps(['checked', 'children', 'className', { name: 'props', spread: true }], {
              type: 'RadioItemProps',
            }),
            code.function('RadioItem').jsx.element('Menu.RadioItem').spreadProps('props', { position: 'start' }),
            code
              .function('RadioItem')
              .jsx.props('className')
              .on('Menu.RadioItem')
              .replace(({ value }) => composeStateClassName(value)),
            code
              .function('RadioItem')
              .jsx.element('Menu.ItemIndicator')
              .addProp('checked', code.value.identifier('checked')),
            // Target-neutral presentational roles become native React elements.
            code.variable('OverlayRoot').remove(),
            code.jsx.element('OverlayRoot').replace('div'),
            code.variable('StatusIndicatorGroup').remove(),
            code.jsx.element('StatusIndicatorGroup').replace('div'),
            code.variable('PreviewValue').remove(),
            code.jsx.element('PreviewValue').replace('div'),
            code.variable('SubmenuHint').remove(),
            code.jsx.element('SubmenuHint').replace('span'),
            code.variable('QualityOptionLabel').remove(),
            code.jsx.element('QualityOptionLabel').replace('span'),
            code.jsx.element('Text').replace(({ element, factory }) => lowerReactText(element, factory)),
            code.jsx.element('Slider.Thumbnail.Root').replace('div'),
            code.jsx.element('Slider.Thumbnail.Image').replace('Slider.Thumbnail'),
            // Normalize canonical class arrays and target-facing prop types last.
            code.jsx
              .props('className')
              .where(code.value.isArray())
              .replace(({ value }) => code.value.call(cn, code.value.arrayItems(value))),
            code.interface('ButtonTooltipProps').replaceExtends('TooltipProps', 'TooltipPrimitive.RootProps'),
            code
              .interface('SettingsMenuProps')
              .property('children')
              .setType(() => code.type.named(ReactNode)),
            code
              .interface('SubmenuProps')
              .property('children')
              .setType(() => code.type.named(ReactNode)),
            ...['icon', 'label', 'selectedLabel'].map((property) =>
              code
                .interface('SubmenuProps')
                .property(property)
                .setType(() => code.type.named(ReactNode))
            ),
            code
              .interface('RadioItemProps')
              .property('children')
              .setType(() => code.type.named(ReactNode)),
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

interface ReactTemplatePart {
  name: string;
  root: string;
  property?: string | undefined;
  optionalAccess?: boolean | undefined;
  optional?: boolean | undefined;
  tag?: string | undefined;
}

interface ReactTemplate {
  name: string;
  parent: string;
  prop: string;
  parameters: readonly string[];
  rootTag?: string | undefined;
}

function createReactTemplatePartTransforms(code: TransformHelpers) {
  const selectedLabelParts: ReadonlyArray<ReactTemplatePart & { scope: string }> = [
    { scope: 'QualityMenu', name: 'selected-label', root: 'quality', property: 'selectedLabel', optionalAccess: true },
    {
      scope: 'AudioTrackMenu',
      name: 'selected-label',
      root: 'audioTrack',
      property: 'selectedLabel',
      optionalAccess: true,
    },
    {
      scope: 'PlaybackRateMenu',
      name: 'selected-label',
      root: 'playbackRate',
      property: 'selectedLabel',
      optionalAccess: true,
    },
    {
      scope: 'CaptionsMenu',
      name: 'selected-label',
      root: 'captions',
      property: 'selectedLabel',
      optionalAccess: true,
    },
  ];
  const itemParts: readonly ReactTemplatePart[] = [
    { name: 'label', root: 'item', property: 'label' },
    { name: 'tier', root: 'item', property: 'tier', optional: true, tag: 'sup' },
    { name: 'badge', root: 'item', property: 'badge', optional: true },
  ];

  return [
    ...selectedLabelParts.map(({ scope, ...part }) =>
      code
        .function(scope)
        .jsx.element('Template.Part')
        .replace(({ element, factory }) => lowerReactTemplatePart(element, part, factory))
    ),
    ...itemParts.map((part) =>
      code.jsx
        .element('Template.Part')
        .replace(({ element, factory }) => lowerReactTemplatePart(element, part, factory))
    ),
    code.jsx
      .element('Template.Part')
      .replace(({ element }) =>
        failTemplate(
          element,
          `No React lowering is configured for <Template.Part name="${readRequiredName(element)}">.`
        )
      ),
  ];
}

function createReactTemplateTransforms(code: TransformHelpers) {
  const templates: readonly ReactTemplate[] = [
    {
      name: 'chapter',
      parent: 'TimeSliderPrimitive.Chapters',
      prop: 'renderChapter',
      parameters: ['props'],
      rootTag: 'div',
    },
    { name: 'quality-option', parent: 'QualityRadioGroup', prop: 'renderItem', parameters: ['props', 'item'] },
    { name: 'audio-track-option', parent: 'AudioTrackRadioGroup', prop: 'renderItem', parameters: ['props', 'item'] },
    {
      name: 'playback-rate-option',
      parent: 'PlaybackRateRadioGroup',
      prop: 'renderItem',
      parameters: ['props', 'item'],
    },
    { name: 'captions-option', parent: 'CaptionsRadioGroup', prop: 'renderItem', parameters: ['props', 'item'] },
  ];

  return [
    ...templates.map((template) =>
      code.jsx
        .element(template.parent)
        .replace(({ element, factory }) => lowerReactTemplate(element, template, factory))
    ),
    code.jsx
      .element('Template')
      .replace(({ element }) =>
        failTemplate(element, `No React lowering is configured for <Template name="${readRequiredName(element)}">.`)
      ),
  ];
}

function lowerReactTemplatePart(element: JsxElementLike, part: ReactTemplatePart, factory: ts.NodeFactory): ts.Node {
  const jsx = createJsxEditor(factory);
  if (readRequiredName(element) !== part.name) return element;
  let rendered = jsx.children.onlyElement(element);
  if (part.tag) rendered = jsx.apply(rendered, jsx.tag.replace(part.tag));
  const root = factory.createIdentifier(part.root);
  const value = part.property
    ? part.optionalAccess
      ? factory.createPropertyAccessChain(root, factory.createToken(ts.SyntaxKind.QuestionDotToken), part.property)
      : factory.createPropertyAccessExpression(root, part.property)
    : root;
  rendered = jsx.apply(rendered, jsx.children.set([jsx.create.expression(value)]));
  return part.optional
    ? factory.createJsxExpression(
        undefined,
        factory.createConditionalExpression(
          value,
          factory.createToken(ts.SyntaxKind.QuestionToken),
          rendered,
          factory.createToken(ts.SyntaxKind.ColonToken),
          factory.createNull()
        )
      )
    : rendered;
}

function lowerReactTemplate(parent: JsxElementLike, template: ReactTemplate, factory: ts.NodeFactory): JsxElementLike {
  const jsx = createJsxEditor(factory);
  const extracted = jsx.children.extractOne(
    parent,
    (child) => jsx.tag.name(child) === 'Template' && readRequiredName(child) === template.name
  );
  if (!extracted) return parent;
  if (hasJsxAttribute(ts.isJsxElement(parent) ? parent.openingElement.attributes : parent.attributes, template.prop)) {
    failTemplate(parent, `<${template.parent}> already declares \`${template.prop}\`.`);
  }
  const authored = extracted.child;
  const root = createReactTemplateRoot(authored, template, factory);
  const callback = factory.createArrowFunction(
    undefined,
    undefined,
    template.parameters.map((name) => factory.createParameterDeclaration(undefined, undefined, name)),
    undefined,
    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    factory.createParenthesizedExpression(root)
  );
  return jsx.apply(
    parent,
    jsx.props.set(template.prop, callback),
    jsx.children.set(extracted.rest),
    jsx.selfCloseIfEmpty()
  );
}

function createReactTemplateRoot(
  authored: ts.JsxElement,
  template: ReactTemplate,
  factory: ts.NodeFactory
): JsxElementLike {
  const jsx = createJsxEditor(factory);
  let root: JsxElementLike;
  if (template.rootTag) {
    root = jsx.apply(authored, jsx.props.remove('name'), jsx.tag.replace(template.rootTag));
  } else {
    root = jsx.children.onlyElement(authored);
  }
  return jsx.apply(root, jsx.props.spread(factory.createIdentifier(template.parameters[0]!), 'start'));
}

function readRequiredName(element: JsxElementLike): string {
  const jsx = createJsxEditor(ts.factory);
  const name = jsx.props.staticString(element, 'name');
  if (name === undefined) failTemplate(element, `<${jsx.tag.name(element)}> requires a static \`name\` prop.`);
  if (name === null || name.length === 0)
    failTemplate(element, `<${jsx.tag.name(element)} name> must be a string literal.`);
  return name;
}

function failTemplate(node: ts.Node, message: string): never {
  throw new DiagnosticError(message, {
    ...diagnosticLocationFromNode(node),
    diagnosticCode: 'jsx-template-invalid',
  });
}

const textDescriptors = new Set(['settingsText', 'qualityText', 'audioText', 'speedText', 'captionsText']);

function lowerReactText(element: JsxElementLike, factory: ts.NodeFactory): JsxElementLike {
  const jsx = createJsxEditor(factory);
  const descriptor = readTextDescriptor(element);
  return jsx.apply(
    element,
    jsx.tag.replace('span'),
    ...(descriptor
      ? [
          jsx.children.set([
            jsx.create.expression(factory.createCallExpression(factory.createIdentifier('t'), undefined, [descriptor])),
          ]),
        ]
      : [])
  );
}

function readTextDescriptor(element: JsxElementLike): ts.Identifier | undefined {
  const child = createJsxEditor(ts.factory).children.singleExpression(element);
  return child && ts.isIdentifier(child) && textDescriptors.has(child.text) ? child : undefined;
}

function requiredReactImport(resolveImport: (reference: ImportRef) => ImportRef | false, name: string): ImportRef {
  const reference = resolveImport({ source: '@videojs/react', name });
  if (!reference) throw new Error(`React Skin lowering requires a target import for \`${name}\`.`);
  return reference;
}
