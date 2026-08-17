import { defineConfig, html, rewrite } from '@videojs/compiler';
import { type StylePluginOptions, plugin as stylesPlugin } from '@videojs/compiler/styles';
import { createComponentTransforms as createHtmlComponentTransforms } from '../../../html/compiler';

interface CreateCompilerHtmlConfigOptions {
  styles?: StylePluginOptions | undefined;
  rootComponentName?: string | undefined;
  rootClassName?: string | undefined;
}

const iconNames = {
  AirPlayEnterIcon: 'airplay-enter',
  AirPlayExitIcon: 'airplay-exit',
  CaptionsOffIcon: 'captions-off',
  CaptionsOnIcon: 'captions-on',
  CastEnterIcon: 'cast-enter',
  CastExitIcon: 'cast-exit',
  CheckIcon: 'check',
  ChevronIcon: 'chevron',
  FullscreenEnterIcon: 'fullscreen-enter',
  FullscreenExitIcon: 'fullscreen-exit',
  GearIcon: 'gear',
  PauseIcon: 'pause',
  PipEnterIcon: 'pip-enter',
  PipExitIcon: 'pip-exit',
  PlayIcon: 'play',
  RestartIcon: 'restart',
  SeekIcon: 'seek',
  SpeechIcon: 'speech',
  SpeedIcon: 'speed',
  SpinnerIcon: 'spinner',
  SwitchesIcon: 'switches',
  VolumeHighIcon: 'volume-high',
  VolumeLowIcon: 'volume-low',
  VolumeOffIcon: 'volume-off',
} as const;

const SETTINGS_SUBMENUS = [
  ['QualityMenu', 'settings-quality-menu'],
  ['AudioTrackMenu', 'settings-audio-menu'],
  ['PlaybackRateMenu', 'settings-speed-menu'],
  ['CaptionsMenu', 'settings-captions-menu'],
] as const;

/** Create the compiler policy for an HTML Skin target. */
export function createCompilerHtmlConfig(options: CreateCompilerHtmlConfigOptions) {
  const rootComponentName = options.rootComponentName ?? 'DefaultVideoSkin';
  return defineConfig({
    external: (source) => source.startsWith('@videojs/html/'),
    target: html({
      imports: {
        '@videojs/icons/components': false,
        '@videojs/compiler/components': false,
      },
    }),
    plugins: [
      ...(options.styles ? [stylesPlugin(options.styles)] : []),

      rewrite(
        (code) => {
          const cn = code.import('@videojs/utils/style', 'cn');
          const rootContainer = code.function(rootComponentName).jsx.element('Container');
          const containerTargetClassName = code.function('Container').jsx.props('className').on('$.Container');
          return [
            // Lower constrained canonical JSX before target element rewrites.
            ...createHtmlComponentTransforms(code),

            // Establish the Skin root, component content slot, and Container API.
            rootContainer.addProp('className', () => {
              if (!options.rootClassName) {
                throw new Error('HTML Skin root transform requires `rootClassName`.');
              }
              return options.rootClassName;
            }),
            containerTargetClassName.replace(({ value }) => code.value.array([value, 'className'])),
            code.function('Container').setProps(['children', 'className']),
            code.jsx.element('Slot').replace('slot'),

            // Target-neutral presentational roles become native HTML elements.
            code.jsx.element('OverlayRoot').replace('div'),
            code.jsx.element('StatusIndicatorGroup').replace('div'),
            code.jsx.element('PreviewValue').replace('div'),
            code.jsx.element('SubmenuHint').replace('span'),
            code.jsx.element('QualityOptionLabel').replace('span'),

            // Apply Skin-specific menu behavior before registry component lowering.
            code.jsx.element('$.Menu.Root').unwrap({ forwardPropsTo: '$.Menu.Content' }),
            code.function('SettingsMenu').jsx.element('$.Menu.Group').unwrap(),
            code.function('SettingsMenu').jsx.element('$.Menu.Trigger').addProp('commandfor', 'settings-menu'),
            code.function('SettingsMenu').jsx.element('$.Menu.Trigger').addProp('id', 'settings-trigger'),
            code.function('SettingsMenu').jsx.element('$.Menu.Trigger').replace('button'),
            code.function('SettingsMenu').jsx.element('$.Tooltip.Popup').addProp('trigger', 'settings-trigger'),
            code.function('SettingsMenu').jsx.element('$.Menu.Content').addProp('id', 'settings-menu'),
            code.function('Submenu').setProps(['children', 'icon', 'label', 'selectedLabel', 'menuId']),
            code
              .function('Submenu')
              .jsx.element('$.Menu.Trigger')
              .addProp('commandfor', code.value.identifier('menuId')),
            code.function('Submenu').jsx.element('$.Menu.Trigger').replace('media-menu-item'),
            code.function('Submenu').jsx.element('$.Menu.Content').addProp('id', code.value.identifier('menuId')),
            ...SETTINGS_SUBMENUS.map(([component, id]) =>
              code.function(component).jsx.element('Submenu').addProp('menuId', id)
            ),

            // Forward authored props before mapping canonical components and icons.
            code.function('MuteButton').addProps([{ name: 'props', spread: true }]),
            code.jsx.element('$.MuteButton').spreadProps('props'),
            ...Object.entries(iconNames).flatMap(([source, name]) => [
              code.jsx.element(source).addProp('name', name),
              code.jsx.element(source).replace('media-icon'),
            ]),

            // Compose class arrays, then emit native HTML attribute and child types.
            code.jsx
              .props('className')
              .on(/^[a-z]/)
              .replace(({ value }) => code.value.call(cn, [value])),
            code.jsx
              .props('className')
              .on(/^[a-z]/)
              .rename('class'),
            code
              .interface('ButtonTooltipProps')
              .property('children')
              .setType(() => code.type.unknown()),
          ];
        },
        { name: '@videojs/skins:html' }
      ),
    ],
  });
}
