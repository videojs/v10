import { defineConfig, jsx, rewrite } from '@videojs/compiler';
import {
  anyTag,
  childAsProp,
  type ImportRef,
  type JsxElementLike,
  lowerTemplateParts,
  lowerTemplates,
  replaceJsxElementTag,
  singleJsxChildExpression,
} from '@videojs/compiler/ast';
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
      {
        name: '@videojs/skins:react-template-parts',
        setup: () => ({
          transform: lowerTemplateParts({
            parts: {
              'QualityMenu:selected-label': {
                kind: 'value',
                root: 'quality',
                property: 'selectedLabel',
                optionalAccess: true,
              },
              'AudioTrackMenu:selected-label': {
                kind: 'value',
                root: 'audioTrack',
                property: 'selectedLabel',
                optionalAccess: true,
              },
              'PlaybackRateMenu:selected-label': {
                kind: 'value',
                root: 'playbackRate',
                property: 'selectedLabel',
                optionalAccess: true,
              },
              'CaptionsMenu:selected-label': {
                kind: 'value',
                root: 'captions',
                property: 'selectedLabel',
                optionalAccess: true,
              },
              'quality-option:label': { kind: 'value', root: 'item', property: 'label' },
              'quality-option:tier': {
                kind: 'value',
                root: 'item',
                property: 'tier',
                optional: true,
                tag: 'sup',
              },
              'quality-option:badge': { kind: 'value', root: 'item', property: 'badge', optional: true },
              'audio-track-option:label': { kind: 'value', root: 'item', property: 'label' },
              'playback-rate-option:label': { kind: 'value', root: 'item', property: 'label' },
              'captions-option:label': { kind: 'value', root: 'item', property: 'label' },
            },
          }),
        }),
      },
      {
        name: '@videojs/skins:react-templates',
        setup: () => ({
          transform: lowerTemplates({
            templates: {
              chapter: {
                kind: 'render-prop',
                parent: 'TimeSliderPrimitive.Chapters',
                prop: 'renderChapter',
                rootTag: 'div',
              },
              'quality-option': {
                kind: 'render-prop',
                parent: 'QualityRadioGroup',
                prop: 'renderItem',
                parameters: ['props', 'item'],
              },
              'audio-track-option': {
                kind: 'render-prop',
                parent: 'AudioTrackRadioGroup',
                prop: 'renderItem',
                parameters: ['props', 'item'],
              },
              'playback-rate-option': {
                kind: 'render-prop',
                parent: 'PlaybackRateRadioGroup',
                prop: 'renderItem',
                parameters: ['props', 'item'],
              },
              'captions-option': {
                kind: 'render-prop',
                parent: 'CaptionsRadioGroup',
                prop: 'renderItem',
                parameters: ['props', 'item'],
              },
            },
          }),
        }),
      },
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
          const settingsSubmenuFunctions = ['QualityMenu', 'AudioTrackMenu', 'PlaybackRateMenu', 'CaptionsMenu'];
          const settingsFunctions = ['SettingsMenu', ...settingsSubmenuFunctions];
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
          const directComponents = [
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
          const composedComponents = [
            [
              'StatusIndicator',
              'StatusIndicatorPrimitive.Root',
              'StatusIndicatorPrimitive.RootProps',
              ['children', 'actions'],
            ],
            [
              'PlaybackStatusIndicator',
              'StatusIndicatorPrimitive.Root',
              'StatusIndicatorPrimitive.RootProps',
              ['children', 'actions'],
            ],
            ['VolumeIndicator', 'VolumeIndicatorPrimitive.Root', 'VolumeIndicatorPrimitive.RootProps', ['children']],
          ] as const;
          const radioGroupComponents = [
            ['QualityRadioGroup', 'QualityRadioGroupPrimitive', 'QualityRadioGroupPrimitive.Props'],
            ['AudioTrackRadioGroup', 'AudioTrackRadioGroupPrimitive', 'AudioTrackRadioGroupPrimitive.Props'],
            ['PlaybackRateRadioGroup', 'PlaybackRateRadioGroupPrimitive', 'PlaybackRateRadioGroupPrimitive.Props'],
            ['CaptionsRadioGroup', 'CaptionsRadioGroupPrimitive', 'CaptionsRadioGroupPrimitive.Props'],
          ] as const;

          return [
            ...(options.extendComponents
              ? [
                  ...directComponents.flatMap(([name, primitive, primitiveProps]) => {
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
                  ...composedComponents.flatMap(([name, primitive, primitiveProps, omitted]) => {
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
                  code.function('Overlay').jsx.element('OverlayPrimitive').spreadProps('props', { position: 'start' }),
                  code
                    .function('Overlay')
                    .jsx.props('className')
                    .on('OverlayPrimitive')
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
                  ...settingsSubmenuFunctions.flatMap((name) => {
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
                    .jsx.element('StatusIndicatorOverlayPrimitive')
                    .spreadProps('props', { position: 'start' }),
                  code
                    .function('VideoStatusIndicators')
                    .jsx.props('className')
                    .on('StatusIndicatorOverlayPrimitive')
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
            ...radioGroupComponents.flatMap(([name, primitive, primitiveProps]) => {
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
            ...['QualityMenu', 'AudioTrackMenu', 'PlaybackRateMenu', 'CaptionsMenu'].map((name) =>
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
            code.variable('OverlayPrimitive').remove(),
            code.jsx.element('OverlayPrimitive').replace('div'),
            code.variable('StatusIndicatorOverlayPrimitive').remove(),
            code.jsx.element('StatusIndicatorOverlayPrimitive').replace('div'),
            code.variable('PreviewValuePrimitive').remove(),
            code.jsx.element('PreviewValuePrimitive').replace('div'),
            code.variable('HintPrimitive').remove(),
            code.jsx.element('HintPrimitive').replace('span'),
            code.variable('OptionLabelPrimitive').remove(),
            code.jsx.element('OptionLabelPrimitive').replace('span'),
            code.jsx.element('Text').replace(({ element, factory }) => lowerReactText(element, factory)),
            code.jsx.element('Slider.Thumbnail.Root').replace('div'),
            code.jsx.element('Slider.Thumbnail.Image').replace('Slider.Thumbnail'),
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

const textDescriptors = new Set(['settingsText', 'qualityText', 'audioText', 'speedText', 'captionsText']);

function lowerReactText(element: JsxElementLike, factory: ts.NodeFactory): JsxElementLike {
  const descriptor = readTextDescriptor(element);
  return replaceJsxElementTag(element, factory.createIdentifier('span'), factory, {
    ...(descriptor
      ? {
          children: [
            factory.createJsxExpression(
              undefined,
              factory.createCallExpression(factory.createIdentifier('t'), undefined, [descriptor])
            ),
          ],
        }
      : {}),
  });
}

function readTextDescriptor(element: JsxElementLike): ts.Identifier | undefined {
  if (!ts.isJsxElement(element)) return undefined;
  const child = singleJsxChildExpression(element.children);
  return child && ts.isIdentifier(child) && textDescriptors.has(child.text) ? child : undefined;
}

function requiredReactImport(resolveImport: (reference: ImportRef) => ImportRef | false, name: string): ImportRef {
  const reference = resolveImport({ source: '@videojs/react', name });
  if (!reference) throw new Error(`React Skin lowering requires a target import for \`${name}\`.`);
  return reference;
}
