import { html, rewrite } from 'vjsc';
import { defineOutput, type StaticCatalogOutputAdapter } from 'vjsc/catalog';
import { extendRegistry } from 'vjsc/components';
import { registry as htmlRegistry } from '../../../html/compiler';
import { registry as iconRegistry } from '../../../icons/compiler/html';

interface HtmlOutputOptions {
  iconSet?: string | undefined;
}

const SETTINGS_SUBMENUS = [
  ['QualityMenu', 'settings-quality-menu'],
  ['AudioTrackMenu', 'settings-audio-menu'],
  ['PlaybackRateMenu', 'settings-speed-menu'],
  ['CaptionsMenu', 'settings-captions-menu'],
] as const;

/** Create the bundled HTML output adapter for a Skin catalog. */
export function htmlOutput(options: HtmlOutputOptions = {}): StaticCatalogOutputAdapter {
  const registry = extendRegistry(htmlRegistry, iconRegistry({ family: options.iconSet ?? 'default' }));

  return defineOutput({
    mode: 'bundle',
    registry,
    compiler: {
      external: (source) => source.startsWith('@videojs/html/'),
      target: html(),
      plugins: [
        rewrite((code) => [
          // Apply Skin-specific menu behavior before registry component lowering.
          code.jsx.element('$.Menu.Root').unwrap({ forwardPropsTo: '$.Menu.Content' }),
          code.function('SettingsMenu').jsx.element('$.Menu.Group').unwrap(),
          code.function('SettingsMenu').jsx.element('$.Menu.Trigger').addProp('commandfor', 'settings-menu'),
          code.function('SettingsMenu').jsx.element('$.Menu.Trigger').addProp('id', 'settings-trigger'),
          code.function('SettingsMenu').jsx.element('$.Menu.Trigger').replace('button'),
          code.function('SettingsMenu').jsx.element('$.Tooltip.Popup').addProp('trigger', 'settings-trigger'),
          code.function('SettingsMenu').jsx.element('$.Menu.Content').addProp('id', 'settings-menu'),
          code
            .function('Submenu')
            .setProps([
              'children',
              'icon',
              'label',
              'selectedLabel',
              'className',
              'menuId',
              { name: 'props', spread: true },
            ]),
          code.function('Submenu').jsx.element('$.Menu.Trigger').addProp('commandfor', code.value.identifier('menuId')),
          code.function('Submenu').jsx.element('$.Menu.Trigger').replace('media-menu-item'),
          code.function('Submenu').jsx.element('$.Menu.Content').addProp('id', code.value.identifier('menuId')),
          ...SETTINGS_SUBMENUS.map(([component, id]) =>
            code.function(component).jsx.element('Submenu').addProp('menuId', id)
          ),
        ]),
      ],
    },
  });
}
