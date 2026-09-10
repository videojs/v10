import '@app/styles.css';
import { applyCaptionTracks } from '@app/shared/captions';
import { renderChapters } from '@app/shared/html/chapters';
import { renderStoryboard } from '@app/shared/html/storyboard';
import { onSandboxStateChange, readSandboxState, type SandboxState } from '@app/shared/sandbox-listener';
import { installSandboxMirror } from '@app/shared/sandbox-mirror';
import { getChapters, getPosterSrc, getStoryboardSrc, SOURCES } from '@app/shared/sources';
import { escapeHtml } from '@videojs/utils/string';

/**
 * The published theme, pinned, straight from a CDN. It is not a dependency on purpose: the sandbox is uploaded as a
 * standalone StackBlitz template, and this reference panel should not widen what that install has to resolve. The
 * `+esm` bundle carries its own pinned media-chrome, so nothing here reaches the workspace copy.
 *
 * The element needs `w-full`: `aspect-video` and `max-w-*` never set a width, and a theme whose media has not loaded
 * has nothing to size itself from, so it collapses to zero. The ported skin sets the same width in its own stylesheet.
 */
const THEME_MODULE = 'https://cdn.jsdelivr.net/npm/@player.style/instaplay@0.1.2/+esm';

const html = String.raw;

/** The attributes the shell's settings menu controls, matching what `createHtmlSandbox` renders for the other panel. */
function mediaAttrs(state: SandboxState): string {
  return [
    state.autoplay ? 'autoplay' : '',
    state.muted ? 'muted' : '',
    state.loop ? 'loop' : '',
    `preload="${state.preload}"`,
  ]
    .filter(Boolean)
    .join(' ');
}

const state = readSandboxState('html');

const root = document.getElementById('root');
if (!root) throw new Error('The sandbox page has no #root element.');

await import(/* @vite-ignore */ THEME_MODULE);

installSandboxMirror();

function render(): void {
  const url = SOURCES[state.source].url ?? '';
  const poster = getPosterSrc(state.source) ?? '';

  const template = document.createElement('template');

  template.innerHTML = html`
    <media-theme-instaplay class="mx-auto aspect-video w-full max-w-4xl">
      <video slot="media" src="${escapeHtml(url)}" ${mediaAttrs(state)} playsinline crossorigin>
        ${renderChapters(getChapters(state.source))} ${renderStoryboard(getStoryboardSrc(state.source))}
      </video>
      ${poster ? html`<img slot="poster" src="${escapeHtml(poster)}" alt="Video poster" crossorigin />` : ''}
    </media-theme-instaplay>
  `;

  const media = template.content.querySelector('video');

  if (media) applyCaptionTracks(media, state.captions);

  root!.replaceChildren(template.content);
}

render();

onSandboxStateChange((change) => {
  Object.assign(state, change);
  render();
});
