import { SOURCES } from '../../../apps/sandbox/app/shared/sources';
import { errorSource, mediaIds, previewWidth, type PreviewOptions } from './options';

export interface PreviewControls {
  readonly options: HTMLFormElement;
  readonly width: HTMLElement;
}

export function createPreviewControls(
  preview: PreviewOptions,
  setPlayerWidth: (width: number) => void
): PreviewControls {
  return {
    options: createOptions(preview),
    width: createWidthControl(preview.playerWidth, setPlayerWidth),
  };
}

function createOptions(preview: PreviewOptions): HTMLFormElement {
  const form = document.createElement('form');

  form.className = 'preview-controls';
  form.ariaLabel = 'Skin preview options';
  form.append(
    createSelect('framework', 'Framework', preview.framework, [
      ['react', 'React'],
      ['html', 'HTML'],
    ]),
    createSelect('skin', 'Skin', preview.skin, [
      ['default-video', 'Default Video'],
      ['minimal-video', 'Minimal Video'],
      ['default-live-video', 'Default Live Video'],
      ['minimal-live-video', 'Minimal Live Video'],
      ['default-live-audio', 'Default Live Audio'],
      ['minimal-live-audio', 'Minimal Live Audio'],
      ['default-audio', 'Default Audio'],
      ['minimal-audio', 'Minimal Audio'],
    ]),
    createSelect('style', 'Styling', preview.styleMode, [
      ['css', 'CSS'],
      ['tailwind', 'Tailwind'],
    ]),
    createSelect('scheme', 'Color scheme', preview.colorScheme, [
      ['dark', 'Dark'],
      ['light', 'Light'],
    ]),
    createSelect(
      'media',
      'Media',
      preview.mediaId,
      mediaIds.map((id) => [id, id === 'error' ? errorSource.label : SOURCES[id].label])
    ),
    createSelect('captions', 'Captions', preview.captionsMode, [
      ['single', 'Single track'],
      ['multiple', 'Multiple tracks'],
    ]),
    createCopyButton(preview)
  );
  form.addEventListener('change', (event) => {
    if (!(event.target instanceof HTMLSelectElement)) return;

    const next = new URLSearchParams(location.search);

    next.set(event.target.name, event.target.value);
    location.search = next.toString();
  });

  return form;
}

function createWidthControl(initialWidth: number, setPlayerWidth: (width: number) => void): HTMLElement {
  const section = document.createElement('section');
  const header = document.createElement('div');
  const label = document.createElement('label');
  const output = document.createElement('output');
  const range = document.createElement('input');
  const ticks = document.createElement('datalist');
  const presets = document.createElement('div');

  section.className = 'preview-width';
  section.ariaLabel = 'Player width';
  header.className = 'preview-width-header';
  label.htmlFor = 'preview-player-width';
  label.textContent = 'Player width';
  output.htmlFor = 'preview-player-width';
  range.id = 'preview-player-width';
  range.className = 'preview-width-range';
  range.type = 'range';
  range.min = String(previewWidth.min);
  range.max = String(previewWidth.max);
  range.step = '1';
  range.value = String(initialWidth);
  range.setAttribute('list', 'preview-player-breakpoints');
  ticks.id = 'preview-player-breakpoints';
  ticks.append(...previewWidth.presets.map(({ value }) => new Option('', String(value))));
  presets.className = 'preview-width-presets';

  const buttons = previewWidth.presets.map(({ label: text, value }) => {
    const button = document.createElement('button');

    button.type = 'button';
    button.textContent = `${text} · ${value}px`;
    button.addEventListener('click', () => update(value));
    presets.append(button);
    return { button, value };
  });
  const update = (value: number) => {
    const width = Math.min(previewWidth.max, Math.max(previewWidth.min, value));
    const next = new URLSearchParams(location.search);

    range.value = String(width);
    output.value = `${width}px · ${formatRem(width)}`;
    setPlayerWidth(width);

    for (const preset of buttons) preset.button.ariaPressed = String(preset.value === width);

    next.set('width', String(width));
    history.replaceState(null, '', `${location.pathname}?${next}${location.hash}`);
  };

  range.addEventListener('input', () => update(range.valueAsNumber));
  header.append(label, output);
  section.append(header, range, ticks, presets);
  update(initialWidth);

  return section;
}

function createCopyButton(preview: PreviewOptions): HTMLButtonElement {
  const button = document.createElement('button');

  button.className = 'preview-copy';
  button.type = 'button';
  button.textContent = 'Copy details';
  button.addEventListener('click', async () => {
    const width = getPlayerWidth();
    const details = [
      'Video.js skins preview',
      `URL: ${location.href}`,
      `framework=${preview.framework}`,
      `skin=${preview.skin}`,
      `style=${preview.styleMode}`,
      `scheme=${preview.colorScheme}`,
      `media=${preview.mediaId} (${preview.media.label})`,
      `captions=${preview.captionsMode}`,
      `width=${width}px (${formatRem(width)})`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(details);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Copy failed';
    }

    setTimeout(() => {
      button.textContent = 'Copy details';
    }, 3000);
  });

  return button;
}

function createSelect(
  name: string,
  labelText: string,
  value: string,
  options: readonly (readonly [value: string, label: string])[]
): HTMLLabelElement {
  const label = document.createElement('label');
  const text = document.createElement('span');
  const select = document.createElement('select');

  label.className = `preview-control preview-control-${name}`;
  text.textContent = labelText;
  select.name = name;
  select.append(
    ...options.map(([optionValue, optionLabel]) => new Option(optionLabel, optionValue, false, optionValue === value))
  );
  label.append(text, select);

  return label;
}

function getPlayerWidth(): number {
  const root = document.getElementById('root');

  return Number.parseInt(root?.style.getPropertyValue('--preview-player-width') ?? '', 10) || previewWidth.default;
}

function formatRem(width: number): string {
  return `${Math.round((width / 16) * 100) / 100}rem`;
}
