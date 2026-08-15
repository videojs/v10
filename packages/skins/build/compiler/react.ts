import { defineConfig, jsx, rewrite } from '@videojs/compiler';
import {
  anyTag,
  childAsProp,
  type ImportRef,
  lowerTemplateParts,
  lowerTemplates,
  lowerText,
} from '@videojs/compiler/ast';
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
  const usePlayerRef = requiredReactImport(resolveImport, 'usePlayer');
  const useTranslatorRef = requiredReactImport(resolveImport, 'useTranslator');
  const useQualityOptionsRef = requiredReactImport(resolveImport, 'useQualityOptions');
  const useAudioTrackOptionsRef = requiredReactImport(resolveImport, 'useAudioTrackOptions');
  const usePlaybackRateOptionsRef = requiredReactImport(resolveImport, 'usePlaybackRateOptions');
  const useCaptionsOptionsRef = requiredReactImport(resolveImport, 'useCaptionsOptions');
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
      skinStyles({ manifest: options.styles, target: options.style }),
      {
        name: '@videojs/skins:react-text',
        setup: () => ({
          transform: lowerText({
            targetTag: 'span',
            descriptors: ['settingsText', 'qualityText', 'audioText', 'speedText', 'captionsText'],
            lowering: { kind: 'translate', translator: 't' },
          }),
        }),
      },
      {
        name: '@videojs/skins:react-template-parts',
        setup: () => ({
          transform: lowerTemplateParts({
            parts: {
              'QualitySettingsMenu:selected-label': {
                kind: 'value',
                root: 'quality',
                property: 'selectedLabel',
                optionalAccess: true,
              },
              'AudioTrackSettingsMenu:selected-label': {
                kind: 'value',
                root: 'audioTrack',
                property: 'selectedLabel',
                optionalAccess: true,
              },
              'PlaybackRateSettingsMenu:selected-label': {
                kind: 'value',
                root: 'playbackRate',
                property: 'selectedLabel',
                optionalAccess: true,
              },
              'CaptionsSettingsMenu:selected-label': {
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
          const cn = code.import('@videojs/utils/style', 'cn');
          const ReactElement = code.import('react', 'ReactElement', { type: true });
          const ReactNode = code.import('react', 'ReactNode', { type: true });
          const ContainerProps = code.import(containerProps.source, containerProps.name, { type: true });
          const PosterProps = code.import(posterProps.source, posterProps.name, { type: true });
          const usePlayer = code.import(usePlayerRef.source, usePlayerRef.name);
          const defaultVideoSkin = code.function('DefaultVideoSkin');
          const container = code.function('Container');
          const poster = code.function('Poster');
          const volumePopover = code.function('VolumePopover');
          const settingsFunctions = [
            'SettingsMenu',
            'QualitySettingsMenu',
            'AudioTrackSettingsMenu',
            'PlaybackRateSettingsMenu',
            'CaptionsSettingsMenu',
          ];
          const useTranslator = code.import(useTranslatorRef.source, useTranslatorRef.name);
          const useQualityOptions = code.import(useQualityOptionsRef.source, useQualityOptionsRef.name);
          const useAudioTrackOptions = code.import(useAudioTrackOptionsRef.source, useAudioTrackOptionsRef.name);
          const usePlaybackRateOptions = code.import(usePlaybackRateOptionsRef.source, usePlaybackRateOptionsRef.name);
          const useCaptionsOptions = code.import(useCaptionsOptionsRef.source, useCaptionsOptionsRef.name);
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
              .function('QualitySettingsMenu')
              .prepend(() => code.statement.const('quality', code.value.call(useQualityOptions, []))),
            code
              .function('AudioTrackSettingsMenu')
              .prepend(() => code.statement.const('audioTrack', code.value.call(useAudioTrackOptions, []))),
            code
              .function('PlaybackRateSettingsMenu')
              .prepend(() => code.statement.const('playbackRate', code.value.call(usePlaybackRateOptions, []))),
            code
              .function('CaptionsSettingsMenu')
              .prepend(() => code.statement.const('captions', code.value.call(useCaptionsOptions, []))),
            ...[
              ['QualitySettingsMenu', 'quality', 'hasQuality'],
              ['AudioTrackSettingsMenu', 'audioTrack', 'hasAudioTrack'],
              ['PlaybackRateSettingsMenu', 'playbackRate', 'hasPlaybackRate'],
              ['CaptionsSettingsMenu', 'captions', 'hasCaptions'],
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
                .jsx.element('Menu.Root')
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
            ...[
              'QualitySettingsMenu',
              'AudioTrackSettingsMenu',
              'PlaybackRateSettingsMenu',
              'CaptionsSettingsMenu',
            ].map((name) =>
              code
                .function(name)
                .jsx.element('Menu.ItemIndicator')
                .addProp('checked', code.value.property('item', 'checked'))
            ),
            code.variable('OverlayPrimitive').remove(),
            code.jsx.element('OverlayPrimitive').replace('div'),
            code.variable('InputIndicatorOverlayPrimitive').remove(),
            code.jsx.element('InputIndicatorOverlayPrimitive').replace('div'),
            code.variable('PreviewValuePrimitive').remove(),
            code.jsx.element('PreviewValuePrimitive').replace('div'),
            code.variable('HintPrimitive').remove(),
            code.jsx.element('HintPrimitive').replace('span'),
            code.variable('OptionLabelPrimitive').remove(),
            code.jsx.element('OptionLabelPrimitive').replace('span'),
            code.jsx.element('Text').replace('span'),
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
