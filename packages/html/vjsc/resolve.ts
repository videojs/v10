import type { SchemaEntryResolver } from 'vjsc/registry';

const componentParts: Readonly<Record<string, Readonly<Record<string, string>>>> = {
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
};

const groupedModules: Readonly<Record<string, string>> = {
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
};

const publicNames: Readonly<Record<string, string>> = {
  AirPlayButton: 'airplay-button',
  PiPButton: 'pip-button',
};

/** Map one canonical component or part to its public custom-element definition. */
export const resolveHtmlEntry: SchemaEntryResolver = ({ component, part }) => {
  const name = part ? componentParts[component]?.[part] : component === 'Container' ? 'MediaContainer' : component;
  if (!name) return undefined;

  return htmlEntry(name);
};

export function htmlEntry(name: string) {
  const publicName = publicNames[name] ?? kebabCase(name === 'MediaContainer' ? 'container' : name);
  const moduleName = groupedModules[name] ?? publicName;
  const source = name === 'MediaContainer' ? `@videojs/html/media/${moduleName}` : `@videojs/html/ui/${moduleName}`;

  return {
    tagName: `media-${publicName}`,
    import: { from: source, sideEffect: true as const },
  };
}

function kebabCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
