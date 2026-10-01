import '@app/styles.css';
import { applyCaptionTracks } from '@app/shared/captions';
import { renderChapters } from '@app/shared/html/chapters';
import { renderStoryboard } from '@app/shared/html/storyboard';
import { onSandboxStateChange, readSandboxState, type SandboxState } from '@app/shared/sandbox-listener';
import { installSandboxMirror } from '@app/shared/sandbox-mirror';
import { getChapters, getPosterSrc, getStoryboardSrc, SOURCES } from '@app/shared/sources';
import { escapeHtml } from '@videojs/utils/string';

import { type PlayerStyleTheme, themeModuleUrl, themeTagName } from './config';
import { frameClasses } from './panel-videojs';

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

/**
 * Mount the published theme as the reference to compare against.
 *
 * It loads from a pinned CDN bundle rather than a dependency: the sandbox is uploaded as a standalone StackBlitz
 * template, and a reference panel should not widen what that install has to resolve. The `+esm` bundle carries its own
 * pinned media-chrome, so nothing here reaches the workspace copy.
 *
 * Nothing in this module's import graph touches `@videojs/html`. That is deliberate — see the routing entry.
 */
export async function mountOriginalPanel(theme: PlayerStyleTheme): Promise<void> {
  const state = readSandboxState('html');

  const root = document.getElementById('root');
  if (!root) throw new Error('The sandbox page has no #root element.');

  await import(/* @vite-ignore */ themeModuleUrl(theme));

  installSandboxMirror();

  const tag = themeTagName(theme);
  const mediaTag = theme.player === 'audio' ? 'audio' : 'video';

  function render(): void {
    const url = SOURCES[state.source].url ?? '';
    const poster = getPosterSrc(state.source) ?? '';

    const template = document.createElement('template');

    // `w-full` is load-bearing: `aspect-video` and `max-w-*` never set a width, and a theme whose media has not
    // loaded has nothing to size itself from, so it would collapse to zero.
    template.innerHTML = html`
      <${tag} class="${frameClasses(theme)}">
        <${mediaTag} slot="media" src="${escapeHtml(url)}" ${mediaAttrs(state)} playsinline crossorigin>
          ${renderChapters(getChapters(state.source))} ${renderStoryboard(getStoryboardSrc(state.source))}
        </${mediaTag}>
        ${poster ? html`<img slot="poster" src="${escapeHtml(poster)}" alt="Video poster" crossorigin />` : ''}
      </${tag}>
    `;

    const media = template.content.querySelector(mediaTag);

    if (media) applyCaptionTracks(media, state.captions);

    root!.replaceChildren(template.content);
  }

  render();

  onSandboxStateChange((change) => {
    Object.assign(state, change);
    render();
  });
}
