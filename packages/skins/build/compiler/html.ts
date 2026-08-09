import { defineConfig, jsx, transform } from '@videojs/compiler';
import { type DefaultTreeAdapterMap, parseFragment } from 'parse5';
import { type MutableSkinStyleUsage, type SkinStyleManifest, type SkinStyleTarget, skinStyles } from './styles';

export interface CreateCompilerHtmlConfigOptions {
  style: SkinStyleTarget;
  styles: SkinStyleManifest;
  usage?: MutableSkinStyleUsage | undefined;
}

type HtmlElement = DefaultTreeAdapterMap['element'];
type HtmlParent = DefaultTreeAdapterMap['parentNode'];

interface AttributeEdit {
  offset: number;
  source: string;
}

interface HtmlComponentDescriptor {
  modules: readonly string[];
  elements: Readonly<Record<string, string>>;
}

const htmlComponents: Readonly<Record<string, HtmlComponentDescriptor>> = {
  Controls: {
    modules: ['@videojs/html/ui/controls'],
    elements: { 'Controls.Root': 'media-controls', 'Controls.Group': 'media-controls-group' },
  },
  FullscreenButton: {
    modules: ['@videojs/html/ui/fullscreen-button'],
    elements: { FullscreenButtonPrimitive: 'media-fullscreen-button' },
  },
  MuteButton: {
    modules: ['@videojs/html/ui/mute-button'],
    elements: { MuteButtonPrimitive: 'media-mute-button' },
  },
  PlayButton: {
    modules: ['@videojs/html/ui/play-button'],
    elements: { PlayButtonPrimitive: 'media-play-button' },
  },
  Popover: {
    modules: ['@videojs/html/ui/popover'],
    elements: { 'Popover.Popup': 'media-popover' },
  },
  SeekButton: {
    modules: ['@videojs/html/ui/seek-button'],
    elements: { SeekButtonPrimitive: 'media-seek-button' },
  },
  Slider: {
    modules: ['@videojs/html/ui/slider'],
    elements: {
      'Slider.Thumbnail.Root': 'div',
      'Slider.Thumbnail.Image': 'media-slider-thumbnail',
    },
  },
  Text: { modules: [], elements: { Text: 'span' } },
  Time: {
    modules: ['@videojs/html/ui/time'],
    elements: { 'TimePrimitive.Value': 'media-time' },
  },
  TimeSlider: {
    modules: ['@videojs/html/ui/time-slider'],
    elements: {
      'TimeSliderPrimitive.Root': 'media-time-slider',
      'TimeSliderPrimitive.Track': 'media-slider-track',
      'TimeSliderPrimitive.Fill': 'media-slider-fill',
      'TimeSliderPrimitive.Buffer': 'media-slider-buffer',
      'TimeSliderPrimitive.Thumb': 'media-slider-thumb',
      'TimeSliderPrimitive.Preview': 'media-slider-preview',
      'TimeSliderPrimitive.Value': 'media-slider-value',
    },
  },
  Tooltip: {
    modules: ['@videojs/html/ui/tooltip', '@videojs/html/ui/tooltip-group'],
    elements: {
      'Tooltip.Provider': 'media-tooltip-group',
      'TooltipPrimitive.Popup': 'media-tooltip',
      'TooltipPrimitive.Label': 'media-tooltip-label',
      'TooltipPrimitive.Shortcut': 'media-tooltip-shortcut',
    },
  },
  VolumeSlider: {
    modules: ['@videojs/html/ui/volume-slider'],
    elements: {
      'VolumeSliderPrimitive.Root': 'media-volume-slider',
      'VolumeSliderPrimitive.Track': 'media-slider-track',
      'VolumeSliderPrimitive.Fill': 'media-slider-fill',
      'VolumeSliderPrimitive.Thumb': 'media-slider-thumb',
    },
  },
};

const componentTags = Object.fromEntries(
  Object.values(htmlComponents).flatMap(({ elements }) => Object.entries(elements))
);

const iconNames = {
  FullscreenEnterIcon: 'fullscreen-enter',
  FullscreenExitIcon: 'fullscreen-exit',
  PauseIcon: 'pause',
  PlayIcon: 'play',
  RestartIcon: 'restart',
  SeekIcon: 'seek',
  SpinnerIcon: 'spinner',
  VolumeHighIcon: 'volume-high',
  VolumeLowIcon: 'volume-low',
  VolumeOffIcon: 'volume-off',
} as const;

/** Create the compiler policy for an HTML Skin projection. */
export function createCompilerHtmlConfig(styleTarget: CreateCompilerHtmlConfigOptions) {
  return defineConfig({
    target: jsx({
      imports: {
        '@videojs/core/components': false,
        '@videojs/icons/components': false,
        '@videojs/jsx': false,
      },
    }),
    plugins: [
      skinStyles({ manifest: styleTarget.styles, target: styleTarget.style, usage: styleTarget.usage }),
      transform(
        (code) => {
          const cn = code.import('@videojs/utils/style', 'cn');

          return [
            code.jsx.element('Popover.Root').unwrap({ forwardPropsTo: 'Popover.Popup' }),
            code.jsx.element('Popover.Trigger').unwrap(),
            code.jsx.element('TooltipPrimitive.Root').unwrap({ forwardPropsTo: 'TooltipPrimitive.Popup' }),
            code.jsx.element('TooltipPrimitive.Trigger').unwrap(),
            ...Object.entries(componentTags).map(([source, target]) => code.jsx.element(source).replace(target)),
            ...Object.entries(iconNames).flatMap(([source, name]) => [
              code.jsx.element(source).addProp('name', name),
              code.jsx.element(source).replace('media-icon'),
            ]),
            code.jsx.props('className').replace(({ value }) => code.value.call(cn, [value])),
            code.jsx.props('className').rename('class'),
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

/** Finish relationships that only exist after the full Skin component tree has been composed. */
export function finalizeCompilerHtml(source: string): string {
  const root = parseFragment(source, { sourceCodeLocationInfo: true });
  const usedIds = collectIds(root);
  const edits: AttributeEdit[] = [];

  visitParents(root, (parent) => {
    for (let index = 0; index < parent.childNodes.length; index++) {
      const popup = asElement(parent.childNodes[index]);
      if (!popup || (popup.tagName !== 'media-tooltip' && popup.tagName !== 'media-popover')) continue;
      const trigger = previousElement(parent, index);
      if (!trigger) throw new Error(`<${popup.tagName}> must immediately follow its trigger in generated HTML.`);

      const popupId = attribute(popup, 'id') ?? uniquePopupId(trigger, popup, usedIds);
      const commandFor = attribute(trigger, 'commandfor');
      if (commandFor && commandFor !== popupId) {
        throw new Error(`<${trigger.tagName}> already targets \`${commandFor}\`, not generated popup \`${popupId}\`.`);
      }
      if (!attribute(popup, 'id')) edits.push(addAttribute(popup, 'id', popupId));
      if (!commandFor) edits.push(addAttribute(trigger, 'commandfor', popupId));
    }
  });

  return edits
    .sort((a, b) => b.offset - a.offset)
    .reduce((html, edit) => `${html.slice(0, edit.offset)}${edit.source}${html.slice(edit.offset)}`, source);
}

export function resolveHtmlElementImports(componentSymbols: readonly string[]): string[] {
  const symbols = new Set(componentSymbols);
  const imports = new Set<string>();

  for (const symbol of symbols) {
    if (symbol === 'Slider' && (symbols.has('TimeSlider') || symbols.has('VolumeSlider'))) continue;
    for (const source of htmlComponents[symbol]?.modules ?? []) imports.add(source);
  }

  return [...imports].sort();
}

function collectIds(root: HtmlParent): Set<string> {
  const ids = new Set<string>();
  visitParents(root, (parent) => {
    for (const child of parent.childNodes) {
      const element = asElement(child);
      const id = element ? attribute(element, 'id') : undefined;
      if (id) ids.add(id);
    }
  });
  return ids;
}

function visitParents(parent: HtmlParent, visit: (parent: HtmlParent) => void): void {
  visit(parent);
  for (const child of parent.childNodes) {
    const element = asElement(child);
    if (element) visitParents(element, visit);
  }
}

function previousElement(parent: HtmlParent, index: number): HtmlElement | undefined {
  for (let previous = index - 1; previous >= 0; previous--) {
    const element = asElement(parent.childNodes[previous]);
    if (element) return element;
  }
  return undefined;
}

function asElement(node: DefaultTreeAdapterMap['childNode'] | undefined): HtmlElement | undefined {
  return node && 'tagName' in node ? node : undefined;
}

function attribute(element: HtmlElement, name: string): string | undefined {
  return element.attrs.find((attr) => attr.name === name)?.value;
}

function uniquePopupId(trigger: HtmlElement, popup: HtmlElement, used: Set<string>): string {
  const kind = popup.tagName === 'media-tooltip' ? 'tooltip' : 'popover';
  let control = trigger.tagName.replace(/^media-/, '').replace(/-button$/, '');
  if (control === 'seek') control = Number(attribute(trigger, 'seconds')) < 0 ? 'seek-backward' : 'seek-forward';
  if (control === 'mute' && kind === 'popover') control = 'volume';

  const base = `${control}-${kind}`;
  let id = base;
  let suffix = 2;
  while (used.has(id)) id = `${base}-${suffix++}`;
  used.add(id);
  return id;
}

function addAttribute(element: HtmlElement, name: string, value: string): AttributeEdit {
  const startTag = element.sourceCodeLocation?.startTag;
  if (!startTag) throw new Error(`Cannot locate generated <${element.tagName}> start tag.`);
  return { offset: startTag.endOffset - 1, source: ` ${name}="${value}"` };
}
