import type coreSchema from '@videojs/core/vjsc';

import {
  type ComponentTarget,
  type ComponentTargetHelpers,
  defineComponentTarget,
  type TemplateTargetDefinition,
} from '../../../vjsc/src/target/index.ts';
import { Host, jsx } from '../../../vjsc/src/target/jsx-runtime.ts';

type CoreSchema = typeof coreSchema;

const componentParts = {
  Controls: {
    Root: 'Controls',
    Group: 'ControlsGroup',
  },
  ErrorDialog: {
    Root: 'ErrorDialog',
    Popup: 'ErrorDialog',
    Title: 'AlertDialogTitle',
    Description: 'AlertDialogDescription',
    Close: 'AlertDialogClose',
  },
  Menu: {
    Root: 'Menu',
    Trigger: 'MenuItem',
    SubmenuTrigger: 'MenuItem',
    Content: 'Menu',
    Group: 'MenuGroup',
    GroupLabel: 'MenuGroupLabel',
    Item: 'MenuItem',
    ItemIndicator: 'MenuItemIndicator',
    RadioGroup: 'MenuRadioGroup',
    RadioItem: 'MenuRadioItem',
    Separator: 'MenuSeparator',
    CheckboxItem: 'MenuCheckboxItem',
  },
  Popover: {
    Root: 'Popover',
    Trigger: 'Popover',
    Popup: 'Popover',
    Arrow: 'Popover',
  },
  SeekIndicator: {
    Root: 'SeekIndicator',
    Value: 'SeekIndicatorValue',
  },
  Slider: {
    Root: 'Slider',
    Track: 'SliderTrack',
    Fill: 'SliderFill',
    Buffer: 'SliderBuffer',
    Thumb: 'SliderThumb',
    'Thumbnail.Root': 'SliderThumbnail',
    'Thumbnail.Image': 'SliderThumbnail',
    Preview: 'SliderPreview',
    Value: 'SliderValue',
  },
  StatusIndicator: {
    Root: 'StatusIndicator',
    Value: 'StatusIndicatorValue',
  },
  Time: {
    Group: 'TimeGroup',
    Separator: 'TimeSeparator',
    Value: 'Time',
  },
  TimeSlider: {
    Root: 'TimeSlider',
    Track: 'SliderTrack',
    Fill: 'SliderFill',
    Buffer: 'SliderBuffer',
    Thumb: 'SliderThumb',
    Chapters: 'TimeSliderChapters',
    ChapterTitle: 'TimeSliderChapterTitle',
    Preview: 'SliderPreview',
    Value: 'SliderValue',
  },
  Tooltip: {
    Provider: 'TooltipGroup',
    Root: 'Tooltip',
    Trigger: 'Tooltip',
    Popup: 'Tooltip',
    Arrow: 'Tooltip',
    Label: 'TooltipLabel',
    Shortcut: 'TooltipShortcut',
  },
  VolumeIndicator: {
    Root: 'VolumeIndicator',
    Fill: 'VolumeIndicatorFill',
    Value: 'VolumeIndicatorValue',
  },
  VolumeSlider: {
    Root: 'VolumeSlider',
    Track: 'SliderTrack',
    Fill: 'SliderFill',
    Thumb: 'SliderThumb',
    Preview: 'SliderPreview',
    Value: 'SliderValue',
  },
} satisfies Readonly<Record<string, Readonly<Record<string, string>>>>;

const groupedModules = {
  MenuCheckboxItem: 'menu',
  MenuGroup: 'menu',
  MenuGroupLabel: 'menu',
  MenuItem: 'menu',
  MenuItemIndicator: 'menu',
  MenuRadioGroup: 'menu',
  MenuRadioItem: 'menu',
  MenuSeparator: 'menu',
  SliderPreview: 'slider',
  TooltipLabel: 'tooltip',
  TooltipShortcut: 'tooltip',
} satisfies Readonly<Record<string, string>>;

const publicNames = {
  AirPlayButton: 'airplay-button',
  PiPButton: 'pip-button',
} satisfies Readonly<Record<string, string>>;

export const htmlComponentTarget: ComponentTarget<CoreSchema> = defineComponentTarget<CoreSchema>()(({
  target,
  element,
}) => {
  const Button = element('button');
  const Div = element('div');
  const Slot = element('slot');
  const Span = element('span');
  const Sup = element('sup');
  const HtmlTemplate = element('template');

  const I18nText = element('media-text', {
    import: { from: '@videojs/html/i18n', sideEffect: true },
  });

  const optionTemplate: TemplateTargetDefinition = {
    render: ({ children }) => jsx(HtmlTemplate, { children }),
    parts: {
      label: ({ props }) => jsx(Span, { 'data-part': 'label', ...props }),
    },
  };

  return {
    source: '@videojs/core/vjsc',
    resolve: ({ component, part }) => {
      const name = part ? getComponentPart(component, part) : component === 'Container' ? 'MediaContainer' : component;
      return name ? htmlElementTarget(name, element) : undefined;
    },
    components: {
      ErrorDialog: {
        Root: ({ children }) => children,
      },
      Menu: {
        Trigger: ({ props, children, id }) => jsx(Button, { commandfor: id('content'), ...props, children }),
        SubmenuTrigger: ({ props, children, id }) =>
          jsx(target.Menu.Item, {
            commandfor: id('content'),
            'data-has-submenu': '',
            ...props,
            children,
          }),
        Content: ({ props, children, id }) => jsx(target.Menu.Content, { id: id('content'), ...props, children }),
        Group: ({ children }) => children,
        Separator: Div,
      },
      Popover: ({ props, parts }) => [
        parts.Trigger.children,
        jsx(target.Popover.Popup, {
          ...props.merge(parts.Popup.props),
          children: parts.Popup.children,
        }),
      ],
      Slider: {
        Thumbnail: {
          Root: Div,
        },
      },
      Tooltip: ({ props, parts, id }) => {
        const trigger = id('trigger');
        return [
          jsx(Host, { id: trigger, children: parts.Trigger.children }),
          jsx(target.Tooltip.Popup, {
            trigger,
            ...props.merge(parts.Popup.props),
            children: parts.Popup.children,
          }),
        ];
      },
    },
    primitives: {
      Group: Div,
      Slot,
      Text: ({ props, children }) =>
        props.has('token') ? jsx(I18nText, { ...props, children }) : jsx(Span, { ...props, children }),
      Template: {
        chapter: {
          render: ({ props, children }) => jsx(HtmlTemplate, { children: jsx(Div, { ...props, children }) }),
        },
        'quality-option': {
          ...optionTemplate,
          parts: {
            ...optionTemplate.parts,
            tier: ({ props }) => jsx(Sup, { 'data-part': 'tier', ...props }),
            badge: ({ props }) => jsx(Span, { 'data-part': 'badge', ...props }),
          },
        },
        'audio-track-option': optionTemplate,
        'playback-rate-option': optionTemplate,
        'captions-option': optionTemplate,
      },
    },
    jsx: {
      importSource: 'vjsc/html-runtime',
      attributes: 'html',
      host: { from: 'vjsc/html-runtime/jsx-runtime', name: 'Host' },
      scope: { from: 'vjsc/html-runtime/jsx-runtime', name: 'Scope' },
    },
  };
});

function htmlElementTarget(name: string, element: ComponentTargetHelpers<CoreSchema>['element']) {
  const publicName = getMappedValue(publicNames, name) ?? kebabCase(name === 'MediaContainer' ? 'container' : name);
  const moduleName = getMappedValue(groupedModules, name) ?? publicName;
  const source = `@videojs/html/ui/${moduleName}`;

  return element(`media-${publicName}`, { import: { from: source, sideEffect: true } });
}

function getComponentPart(component: string, part: string): string | undefined {
  const parts = getMappedValue(componentParts, component);
  return parts ? getMappedValue(parts, part) : undefined;
}

function getMappedValue<Map extends object>(map: Map, key: string): Map[keyof Map] | undefined {
  if (!(key in map)) return undefined;
  // SAFETY: The membership check proves key names a property of map.
  return map[key as keyof Map];
}

function kebabCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
