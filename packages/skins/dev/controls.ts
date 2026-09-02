import { SOURCES } from '../../../apps/sandbox/app/shared/sources';
import { errorSource, mediaIds, previewWidth, type PreviewOptions } from './options';
import { buildReport, createPreferenceBadges, formatRem } from './report';

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
    createSelect('dir', 'Direction', preview.direction, [
      ['ltr', 'Left to right'],
      ['rtl', 'Right to left'],
    ]),
    createSelect('compare', 'Compare', preview.compare ? 'styles' : 'off', [
      ['off', 'Off'],
      ['styles', 'CSS vs Tailwind'],
    ]),
    createReportControls(preview),
    createPreferenceBadges()
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

/**
 * Copies a markdown report for bug reports and shows it inline so it can be read or selected when the clipboard is
 * unavailable.
 */
function createReportControls(preview: PreviewOptions): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const button = document.createElement('button');
  const output = document.createElement('pre');

  button.className = 'preview-copy';
  button.type = 'button';
  button.textContent = 'Copy report';
  output.className = 'preview-report';
  output.hidden = true;
  button.addEventListener('click', async () => {
    const report = buildReport(preview, getPlayerWidth());

    output.textContent = report;
    output.hidden = false;

    try {
      await navigator.clipboard.writeText(report);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Select the report below';
    }

    setTimeout(() => {
      button.textContent = 'Copy report';
    }, 3000);
  });
  fragment.append(button, output);

  return fragment;
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
