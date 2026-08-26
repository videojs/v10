/** @jsxImportSource vjsc/target */
/* oxlint-disable react/jsx-key -- Target arrays describe generated siblings, not React reconciliation. */

import type coreSchema from '@videojs/core/vjsc';
import {
  type ComponentTarget,
  type ComponentTargetHelpers,
  defineComponentTarget,
  type TemplateTargetDefinition,
} from 'vjsc/target';
import { Host } from 'vjsc/target/jsx-runtime';

type CoreSchema = typeof coreSchema;

const componentParts: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  Controls: {
    Root: 'Controls',
    Backdrop: 'ControlsBackdrop',
    Content: 'ControlsContent',
    Group: 'ControlsGroup',
  },
  ErrorDialog: {
    Root: 'ErrorDialog',
    Backdrop: 'DialogBackdrop',
    Popup: 'DialogPopup',
    Title: 'DialogTitle',
    Description: 'DialogDescription',
    Close: 'DialogClose',
  },
  Menu: {
    Root: 'Menu',
    Trigger: 'MenuItem',
    Popup: 'Menu',
    Content: 'MenuContent',
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
  VolumePopover: {
    Root: 'VolumePopover',
    Trigger: 'VolumePopover',
    Popup: 'VolumePopover',
  },
  VolumeSlider: {
    Root: 'VolumeSlider',
    Track: 'SliderTrack',
    Fill: 'SliderFill',
    Thumb: 'SliderThumb',
    Preview: 'SliderPreview',
    Value: 'SliderValue',
  },
};

const groupedModules: Readonly<Record<string, string>> = {
  MenuCheckboxItem: 'menu',
  MenuContent: 'menu',
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
};

const publicNames: Readonly<Record<string, string>> = {
  AirPlayButton: 'airplay-button',
  PiPButton: 'pip-button',
};

export const htmlComponentTarget: ComponentTarget<CoreSchema> = defineComponentTarget<CoreSchema>()(({
  target,
  element,
}) => {
  const Button = element('button');
  const Div = element('div');
  const Img = element('img');
  const Slot = element('slot');
  const Span = element('span');
  const Sup = element('sup');
  const HtmlTemplate = element('template');

  const I18nText = element('media-text', {
    import: { from: '@videojs/html/i18n', sideEffect: true },
  });

  const optionTemplate: TemplateTargetDefinition = {
    render: ({ children }) => <HtmlTemplate>{children}</HtmlTemplate>,
    parts: {
      label: ({ props }) => <Span data-part="label" {...props} />,
    },
  };

  return {
    source: '@videojs/core/vjsc',
    resolve: ({ component, part }) => {
      const name = part ? componentParts[component]?.[part] : component === 'Container' ? 'MediaContainer' : component;

      return name ? htmlElementTarget(name, element) : undefined;
    },
    components: {
      Menu: ({ props, parts, id }) => {
        const popup = parts.Popup?.one();
        const trigger = parts.Trigger.one();
        const controlledId = id(popup ? 'popup' : 'content');

        if (popup) {
          return [
            <Button commandfor={controlledId} {...trigger.props}>
              {trigger.children}
            </Button>,
            <target.Menu.Popup id={controlledId} {...props.merge(popup.props)}>
              {popup.children}
            </target.Menu.Popup>,
          ];
        }

        const content = parts.Content.one();

        return [
          <target.Menu.Item commandfor={controlledId} {...trigger.props}>
            {trigger.children}
          </target.Menu.Item>,
          <target.Menu.Content id={controlledId} {...content.props}>
            {content.children}
          </target.Menu.Content>,
        ];
      },
      Popover: ({ props, parts }) => [
        parts.Trigger.children,
        <target.Popover.Popup {...props.merge(parts.Popup.props)}>{parts.Popup.children}</target.Popover.Popup>,
      ],
      VolumePopover: ({ props, parts }) => [
        parts.Trigger.children,
        <target.VolumePopover.Popup {...props.merge(parts.Popup.props)}>
          {parts.Popup.children}
        </target.VolumePopover.Popup>,
      ],
      Poster: ({ props }) => (
        <target.Poster {...props}>
          <Slot name="poster">
            <Img alt="" decoding="async" />
          </Slot>
        </target.Poster>
      ),
      Slider: {
        Thumbnail: {
          Root: Div,
        },
      },
      Tooltip: ({ props, parts, id }) => {
        const trigger = id('trigger');

        return [
          <Host id={trigger}>{parts.Trigger.children}</Host>,
          <target.Tooltip.Popup trigger={trigger} {...props.merge(parts.Popup.props)}>
            {parts.Popup.children}
          </target.Tooltip.Popup>,
        ];
      },
    },
    primitives: {
      Box: Div,
      Slot,
      Text: ({ props, children }) =>
        props.has('token') ? <I18nText {...props}>{children}</I18nText> : <Span {...props}>{children}</Span>,
      Template: {
        chapter: {
          render: ({ props, children }) => (
            <HtmlTemplate>
              <Div {...props}>{children}</Div>
            </HtmlTemplate>
          ),
        },
        'quality-option': {
          ...optionTemplate,
          parts: {
            ...optionTemplate.parts,
            tier: ({ props }) => <Sup data-part="tier" {...props} />,
            badge: ({ props }) => <Span data-part="badge" {...props} />,
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
  const publicName = publicNames[name] ?? kebabCase(name === 'MediaContainer' ? 'container' : name);
  const moduleName = groupedModules[name] ?? publicName;
  const source = `@videojs/html/ui/${moduleName}`;

  return element(`media-${publicName}`, { import: { from: source, sideEffect: true } });
}

function kebabCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
