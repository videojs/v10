import { createJsxEditor, defineConfig, jsx, rewrite } from '@videojs/compiler';
import type { ImportRef } from '@videojs/compiler/ast';
import { type StylePluginOptions, plugin as stylesPlugin } from '@videojs/compiler/styles';
import type { Expression } from 'typescript';

interface CreateCompilerReactConfigOptions {
  styles?: StylePluginOptions | undefined;
  rootComponentName?: string | undefined;
  rootClassName?: string | undefined;
  iconSet?: string | undefined;
  resolveImport?: ReactImportResolver | undefined;
  /** Add editable target props and className forwarding to generated component boundaries. */
  extendComponents?: boolean | undefined;
}

export type ReactImportResolver = (reference: ImportRef) => ImportRef | false;

const SETTINGS_SUBMENU_FUNCTIONS = ['QualityMenu', 'AudioTrackMenu', 'PlaybackRateMenu', 'CaptionsMenu'] as const;

const DIRECT_COMPONENTS = [
  ['AirPlayButton', '$.AirPlayButton', 'AirPlayButtonTarget.Props'],
  ['BufferingIndicator', '$.BufferingIndicator', 'BufferingIndicatorTarget.Props'],
  ['CaptionsButton', '$.CaptionsButton', 'CaptionsButtonTarget.Props'],
  ['CastButton', '$.CastButton', 'CastButtonTarget.Props'],
  ['FullscreenButton', '$.FullscreenButton', 'FullscreenButtonTarget.Props'],
  ['MuteButton', '$.MuteButton', 'MuteButtonTarget.Props'],
  ['PiPButton', '$.PiPButton', 'PiPButtonTarget.Props'],
  ['PlayButton', '$.PlayButton', 'PlayButtonTarget.Props'],
  ['SeekButton', '$.SeekButton', 'SeekButtonTarget.Props'],
  ['SeekIndicator', '$.SeekIndicator.Root', 'SeekIndicatorTarget.RootProps'],
  ['StatusAnnouncer', '$.StatusAnnouncer', 'StatusAnnouncerTarget.Props'],
  ['TimeSlider', '$.TimeSlider.Root', 'TimeSliderTarget.RootProps'],
  ['VolumeSlider', '$.VolumeSlider.Root', 'VolumeSliderTarget.RootProps'],
] as const;

const COMPOSED_COMPONENTS = [
  ['StatusIndicator', '$.StatusIndicator.Root', 'StatusIndicatorTarget.RootProps', ['children', 'actions']],
  ['PlaybackStatusIndicator', '$.StatusIndicator.Root', 'StatusIndicatorTarget.RootProps', ['children', 'actions']],
  ['VolumeIndicator', '$.VolumeIndicator.Root', 'VolumeIndicatorTarget.RootProps', ['children']],
] as const;

const RADIO_GROUP_COMPONENTS = [
  ['QualityRadioGroup', '$.QualityRadioGroup', 'QualityRadioGroupTarget.Props'],
  ['AudioTrackRadioGroup', '$.AudioTrackRadioGroup', 'AudioTrackRadioGroupTarget.Props'],
  ['PlaybackRateRadioGroup', '$.PlaybackRateRadioGroup', 'PlaybackRateRadioGroupTarget.Props'],
  ['CaptionsRadioGroup', '$.CaptionsRadioGroup', 'CaptionsRadioGroupTarget.Props'],
] as const;

/** Create the compiler policy for a React Skin target. */
export function createCompilerReactConfig(options: CreateCompilerReactConfigOptions) {
  const rootComponentName = options.rootComponentName ?? 'DefaultVideoSkin';
  const rootPropsName = `${rootComponentName}Props`;
  const iconSet = options.iconSet ?? 'default';
  const resolveImport = (reference: ImportRef): ImportRef | false =>
    options.resolveImport ? options.resolveImport(reference) : reference;
  const containerProps = requiredReactImport(resolveImport, 'ContainerProps');
  const posterProps = requiredReactImport(resolveImport, 'PosterProps');
  const usePlayerRef = requiredReactImport(resolveImport, 'usePlayer');
  const useQualityOptionsRef = requiredReactImport(resolveImport, 'useQualityOptions');
  const useAudioTrackOptionsRef = requiredReactImport(resolveImport, 'useAudioTrackOptions');
  const usePlaybackRateOptionsRef = requiredReactImport(resolveImport, 'usePlaybackRateOptions');
  const useCaptionsOptionsRef = requiredReactImport(resolveImport, 'useCaptionsOptions');
  const cnReference = resolveImport({ source: '@videojs/utils/style', name: 'cn' });
  if (!cnReference) throw new Error('React Skin transform requires a target import for `cn`.');
  const resolveClassNameReference = options.extendComponents
    ? resolveImport({ source: '@videojs/skins/registry', name: 'resolveClassName' })
    : false;
  if (options.extendComponents && !resolveClassNameReference) {
    throw new Error('React Skin transform requires a target import for `resolveClassName`.');
  }
  return defineConfig({
    target: jsx({
      imports: {
        '@videojs/core': (name) =>
          options.extendComponents &&
          ['PopoverProps', 'SeekButtonProps', 'TooltipProps', 'VolumeSliderProps'].includes(name)
            ? false
            : resolveImport({ source: '@videojs/core', name }),
        '@videojs/react': (name) => resolveImport({ source: '@videojs/react', name }),
        '@videojs/icons/components': (name) =>
          resolveImport({
            source: iconSet === 'default' ? '@videojs/react/icons' : `@videojs/react/icons/${iconSet}`,
            name,
          }),
        '@videojs/compiler/components': (name) =>
          name === 'Slot' || name === 'Template' || name === 'Text'
            ? { source: '@videojs/compiler/components', name }
            : resolveImport({
                source: 'react',
                name: name === 'ComponentNode' ? 'ReactElement' : name,
              }),
      },
    }),
    plugins: [
      ...(options.styles ? [stylesPlugin(options.styles)] : []),

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
                      extends: [omitProps('ErrorDialogTarget.PopupProps', ['children'])],
                      properties: [],
                    })
                  ),
                  code
                    .function('ErrorDialog')
                    .setProps(['className', { name: 'props', spread: true }], { type: 'ErrorDialogProps' }),
                  code.function('ErrorDialog').jsx.element('$.ErrorDialog.Popup').spreadProps('props', {
                    position: 'start',
                  }),
                  code
                    .function('ErrorDialog')
                    .jsx.props('className')
                    .on('$.ErrorDialog.Popup')
                    .replace(({ value }) => composeStateClassName(value)),
                  // Popovers and menus forward root behavior plus popup class names.
                  code.interface('VolumePopoverProps').addProperties([
                    {
                      name: 'className',
                      optional: true,
                      type: code.type.indexed(
                        code.type.named('PopoverTarget.PopupProps'),
                        code.type.literal('className')
                      ),
                    },
                  ]),
                  code.interface('VolumePopoverProps').extends('PopoverTarget.RootProps'),
                  code
                    .interface('VolumePopoverProps')
                    .property('side')
                    .setType(() =>
                      code.type.indexed(code.type.named('PopoverTarget.RootProps'), code.type.literal('side'))
                    ),
                  code
                    .interface('VolumePopoverProps')
                    .property('orientation')
                    .setType(() => code.type.union(code.type.literal('horizontal'), code.type.literal('vertical'))),
                  code.function('VolumePopover').addProps(['className', { name: 'props', spread: true }]),
                  code.function('VolumePopover').jsx.element('$.Popover.Root').spreadProps('props'),
                  code
                    .function('VolumePopover')
                    .jsx.props('className')
                    .on('$.Popover.Popup')
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
                      type: code.type.indexed(
                        code.type.named('MenuTarget.ContentProps'),
                        code.type.literal('className')
                      ),
                    },
                  ]),
                  code.interface('SubmenuProps').extends('MenuTarget.RootProps'),
                  code.function('Submenu').addProps(['className', { name: 'props', spread: true }]),
                  code.function('Submenu').jsx.element('$.Menu.Root').spreadProps('props'),
                  code
                    .function('Submenu')
                    .jsx.props('className')
                    .on('$.Menu.Content')
                    .replace(({ value }) => composeStateClassName(value)),
                  code.interface('SettingsMenuProps').addProperties([
                    {
                      name: 'className',
                      optional: true,
                      type: code.type.indexed(
                        code.type.named('MenuTarget.ContentProps'),
                        code.type.literal('className')
                      ),
                    },
                  ]),
                  code.interface('SettingsMenuProps').extends('MenuTarget.RootProps'),
                  code.function('SettingsMenu').addProps(['className', { name: 'props', spread: true }]),
                  code.function('SettingsMenu').jsx.element('$.Menu.Root').spreadProps('props'),
                  code
                    .function('SettingsMenu')
                    .jsx.props('className')
                    .on('$.Menu.Content')
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
                throw new Error('React Skin root transform requires `rootClassName`.');
              }
              return code.value.array([code.value.string(options.rootClassName), 'className']);
            }),
            container.insertBefore(() =>
              code.statement.interface({
                name: 'ContainerProps',
                export: true,
                extends: [code.type.named('ContainerTarget.Props')],
                properties: [],
              })
            ),
            container.setProps(['children', 'className', { name: 'props', spread: true }], {
              type: 'ContainerProps',
            }),
            container.jsx.element('$.Container').spreadProps('props', { position: 'start' }),
            container.jsx
              .props('className')
              .on('$.Container')
              .replace(({ value }) => code.value.array([...classNameValues(value), 'className'])),
            poster.insertBefore(() =>
              code.statement.interface({
                name: 'PosterProps',
                export: true,
                extends: [code.type.named('PosterTarget.Props')],
                properties: [],
              })
            ),
            poster.setProps(['className', { name: 'props', spread: true }], { type: 'PosterProps' }),
            poster.jsx.element('$.Poster').spreadProps('props', { position: 'start' }),
            poster.jsx
              .props('className')
              .on('$.Poster')
              .replace(({ value }) => composeStateClassName(value)),
            poster.jsx.element('$.Poster').selfClosing(),
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
            code.interface('RadioItemProps').extends('MenuTarget.RadioItemProps'),
            code.interface('RadioItemProps').addProperties([{ name: 'checked', type: code.type.boolean() }]),
            code.function('RadioItem').setProps(['checked', 'children', 'className', { name: 'props', spread: true }], {
              type: 'RadioItemProps',
            }),
            code.function('RadioItem').jsx.element('$.Menu.RadioItem').spreadProps('props', { position: 'start' }),
            code
              .function('RadioItem')
              .jsx.props('className')
              .on('$.Menu.RadioItem')
              .replace(({ value }) => composeStateClassName(value)),
            code
              .function('RadioItem')
              .jsx.element('$.Menu.ItemIndicator')
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
            code.variable('SelectedLabel').remove(),
            ...[
              ['QualityMenu', 'quality'],
              ['AudioTrackMenu', 'audioTrack'],
              ['PlaybackRateMenu', 'playbackRate'],
              ['CaptionsMenu', 'captions'],
            ].map(([component, value]) =>
              code
                .function(component!)
                .jsx.element('SelectedLabel')
                .replace(({ element, factory }) => {
                  const jsxEditor = createJsxEditor(factory);

                  return jsxEditor.apply(
                    element,
                    jsxEditor.tag.replace('span'),
                    jsxEditor.children.set([
                      jsxEditor.create.expression(code.value.optionalProperty(value!, 'selectedLabel')),
                    ])
                  );
                })
            ),
            // Normalize canonical class arrays and target-facing prop types last.
            code.jsx
              .props('className')
              .where(code.value.isArray())
              .replace(({ value }) => code.value.call(cn, code.value.arrayItems(value))),
            code.interface('ButtonTooltipProps').replaceExtends('TooltipProps', 'TooltipTarget.RootProps'),
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

function requiredReactImport(resolveImport: (reference: ImportRef) => ImportRef | false, name: string): ImportRef {
  const reference = resolveImport({ source: '@videojs/react', name });
  if (!reference) throw new Error(`React Skin transform requires a target import for \`${name}\`.`);
  return reference;
}
