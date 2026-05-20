import '@app/styles.css';
import { createHtmlSandboxState, createLatestLoader, renderMediaAttrs } from '@app/shared/html/sandbox-state';
import { ensureSandboxLocale, type SandboxLocaleTag } from '@app/shared/i18n/sandbox-locales';
import '@videojs/html/i18n';
import '@videojs/html/video/player';
import { loadVideoSkinTag } from '@app/shared/html/skins';
import { renderStoryboard } from '@app/shared/html/storyboard';
import {
  getInitialLocale,
  onAutoplayChange,
  onLocaleChange,
  onLoopChange,
  onMutedChange,
  onPreloadChange,
  onSkinChange,
  onSourceChange,
} from '@app/shared/sandbox-listener';
import { getPosterSrc, getStoryboardSrc, SOURCES } from '@app/shared/sources';

const html = String.raw;

const state = createHtmlSandboxState();
const loadLatest = createLatestLoader();
let locale = getInitialLocale();

function updateProviderLang(tag: SandboxLocaleTag): void {
  document.querySelector('media-i18n-provider')?.setAttribute('lang', tag);
}

function applyLocale(next: SandboxLocaleTag): void {
  locale = next;
  ensureSandboxLocale(locale);
  updateProviderLang(locale);
}

async function render() {
  ensureSandboxLocale(locale);

  const tag = await loadLatest(() => loadVideoSkinTag(state.skin, state.styling));
  if (!tag) return;

  const storyboard = getStoryboardSrc(state.source);
  const poster = getPosterSrc(state.source);
  const mediaAttrs = renderMediaAttrs(state);

  document.getElementById('root')!.innerHTML = html`
    <media-i18n-provider lang="${locale}">
      <video-player>
        <${tag} class="aspect-video max-w-4xl mx-auto">
          <video src="${SOURCES[state.source].url}" ${mediaAttrs} playsinline crossorigin="anonymous">
            ${renderStoryboard(storyboard)}
          </video>
          ${poster ? html`<img slot="poster" src="${poster}" alt="Video poster" />` : ''}
        </${tag}>
      </video-player>
    </media-i18n-provider>
  `;
}

render();

onSkinChange((skin) => {
  state.skin = skin;
  render();
});

onSourceChange((source) => {
  state.source = source;
  render();
});

onAutoplayChange((autoplay) => {
  state.autoplay = autoplay;
  render();
});

onMutedChange((muted) => {
  state.muted = muted;
  render();
});

onLoopChange((loop) => {
  state.loop = loop;
  render();
});

onPreloadChange((preload) => {
  state.preload = preload;
  render();
});

onLocaleChange((next) => {
  const provider = document.querySelector('media-i18n-provider');
  if (provider) {
    applyLocale(next);
    return;
  }
  locale = next;
  render();
});
