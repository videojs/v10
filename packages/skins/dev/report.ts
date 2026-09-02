import { isString } from '@videojs/utils/predicate';

import type { PreviewOptions } from './options';

const preferenceQueries = [
  ['reduced motion', '(prefers-reduced-motion: reduce)'],
  ['reduced transparency', '(prefers-reduced-transparency: reduce)'],
  ['more contrast', '(prefers-contrast: more)'],
  ['forced colors', '(forced-colors: active)'],
  ['hover', '(hover: hover)'],
  ['coarse pointer', '(pointer: coarse)'],
  ['dark scheme', '(prefers-color-scheme: dark)'],
] as const;

const MAX_ERRORS = 10;
const errors: string[] = [];

/** Record runtime errors so a copied report shows what failed, not only where. */
export function installErrorLog(): void {
  const consoleError = console.error.bind(console);

  window.addEventListener('error', (event) => record(event.message || describe(event.error)));
  window.addEventListener('unhandledrejection', (event) => record(`Unhandled rejection: ${describe(event.reason)}`));
  console.error = (...args: unknown[]) => {
    record(args.map(describe).join(' '));
    consoleError(...args);
  };
}

/** Badges for the preferences the theme reacts to; DevTools rendering emulation flips them live. */
export function createPreferenceBadges(): HTMLElement {
  const section = document.createElement('section');
  const list = document.createElement('ul');
  const hint = document.createElement('p');

  section.className = 'preview-preferences';
  section.ariaLabel = 'Detected preferences';
  hint.className = 'preview-preferences-hint';
  hint.textContent = 'Emulate these from the DevTools Rendering panel; the theme reads them through tokens.';
  list.append(
    ...preferenceQueries.map(([name, query]) => {
      const item = document.createElement('li');
      const media = matchMedia(query);
      const update = () => {
        item.dataset.active = String(media.matches);
        item.textContent = `${name}: ${media.matches ? 'on' : 'off'}`;
      };

      media.addEventListener('change', update);
      update();
      return item;
    })
  );
  section.append(list, hint);

  return section;
}

/** Markdown report of the current preview: URL, build, options, environment, preferences, and recent errors. */
export function buildReport(preview: PreviewOptions, width: number): string {
  const preferences = preferenceQueries
    .map(([name, query]) => `${name} ${matchMedia(query).matches ? 'on' : 'off'}`)
    .join(', ');
  const options = [
    `framework=${preview.framework}`,
    `skin=${preview.skin}`,
    `style=${preview.compare ? 'css+tailwind' : preview.styleMode}`,
    `scheme=${preview.colorScheme}`,
    `dir=${preview.direction}`,
    `media=${preview.mediaId} (${preview.media.label})`,
    `captions=${preview.captionsMode}`,
    `width=${width}px (${formatRem(width)})`,
  ].join(', ');

  return [
    '## Video.js skins preview',
    `- URL: ${location.href}`,
    `- Build: ${__PREVIEW_BRANCH__} @ ${__PREVIEW_COMMIT__}`,
    `- Options: ${options}`,
    `- Browser: ${navigator.userAgent}`,
    `- Viewport: ${innerWidth}x${innerHeight} @ ${devicePixelRatio}x`,
    `- Preferences: ${preferences}`,
    errors.length > 0 ? `- Errors:\n${errors.map((error) => `  - ${error}`).join('\n')}` : '- Errors: none',
  ].join('\n');
}

export function formatRem(width: number): string {
  return `${Math.round((width / 16) * 100) / 100}rem`;
}

function record(message: string): void {
  errors.push(`${new Date().toISOString().slice(11, 19)} ${message}`);

  if (errors.length > MAX_ERRORS) errors.shift();
}

function describe(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;

  return isString(value) ? value : String(value);
}
