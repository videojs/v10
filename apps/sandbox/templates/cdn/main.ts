import '@app/styles.css';
import { renderChapters } from '@app/shared/html/chapters';
import { createHtmlSandboxState, createLatestLoader, renderMediaAttrs } from '@app/shared/html/sandbox-state';
import { CSS_SKIN_TAGS, LIVE_VIDEO_CSS_SKIN_TAGS } from '@app/shared/html/skin-tags';
import { renderStoryboard } from '@app/shared/html/storyboard';
import { loadAudioStylesheets, loadVideoStylesheets } from '@app/shared/html/stylesheets';
import { ensureCdnSandboxLocale } from '@app/shared/i18n/cdn-sandbox-locales';
import type { SandboxLocaleTag } from '@app/shared/i18n/locale-meta';
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
import {
  BACKGROUND_VIDEO_SRC,
  getChapters,
  getPosterSrc,
  getStoryboardSrc,
  HLS_BACKGROUND_VIDEO_SRC,
  isLiveSource,
  SOURCES,
} from '@app/shared/sources';
import type { Preset, Skin } from '@app/types';
import { getI18nTranslations } from '@videojs/html/cdn/i18n';

const html = String.raw;

const params = new URLSearchParams(location.search);
const preset = (params.get('preset') ?? 'video') as Preset;

const state = createHtmlSandboxState(preset === 'audio');
const loadLatest = createLatestLoader();
let locale = getInitialLocale();
let localeApplySeq = 0;

type LitElementLike = HTMLElement & { requestUpdate?: () => void; updateComplete?: Promise<unknown> };

function wrapCdnPlayerI18n(playerTag: string, inner: string): string {
  return html`
    <${playerTag}>
      <media-i18n>
        ${inner}
      </media-i18n>
    </${playerTag}>
  `;
}

async function waitForMediaMetadata(timeoutMs = 15_000): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    const video = document.querySelector('video');
    if (video && video.readyState >= HTMLMediaElement.HAVE_METADATA) return;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

/** Controls only get aria-label after the player store attaches media — poll like e2e. */
async function waitForCdnPlayLabel(expected: string, timeoutMs = 15_000): Promise<string | undefined> {
  await waitForMediaMetadata(timeoutMs);

  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    const provider = document.querySelector('media-i18n') as LitElementLike | null;
    provider?.requestUpdate?.();
    if (provider?.updateComplete) await provider.updateComplete;

    for (const button of document.querySelectorAll('media-play-button')) {
      const el = button as LitElementLike;
      el.requestUpdate?.();
      if (el.updateComplete) await el.updateComplete;
    }

    const playLabel = document.querySelector('media-play-button')?.getAttribute('aria-label');
    if (playLabel === expected) return playLabel;

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }

  return document.querySelector('media-play-button')?.getAttribute('aria-label') ?? undefined;
}

async function syncCdnI18nProvider(tag: SandboxLocaleTag, seq: number): Promise<void> {
  await ensureCdnSandboxLocale(tag);
  if (seq !== localeApplySeq) return;

  const provider = document.querySelector('media-i18n') as LitElementLike | null;
  if (!provider?.requestUpdate) return;

  provider.requestUpdate();
  await provider.updateComplete;
  if (seq !== localeApplySeq) return;

  if (!import.meta.env.DEV || tag === 'en') return;
  if (!document.querySelector('media-play-button')) return;

  const expected = getI18nTranslations(tag)['buttons.play'];
  const playLabel = await waitForCdnPlayLabel(expected);
  if (seq !== localeApplySeq) return;

  if (playLabel !== expected) {
    throw new Error(
      `[videojs/sandbox] CDN controls are "${playLabel ?? '(missing)'}" but registry has "${expected}" for "${tag}". If the registry check passes, wait for media metadata or restart with a clean Vite cache: \`rm -rf apps/sandbox/node_modules/.vite && pnpm dev:sandbox\`.`
    );
  }
}

async function applyLocale(next: SandboxLocaleTag): Promise<void> {
  const seq = ++localeApplySeq;
  await ensureCdnSandboxLocale(next);
  if (seq !== localeApplySeq) return;
  locale = next;
  document.documentElement.lang = locale;
  await syncCdnI18nProvider(locale, seq);
}

// ---------------------------------------------------------------------------
// CDN module loading — mirrors the exact import graph of each CDN bundle.
// ---------------------------------------------------------------------------

async function loadCdnPreset(preset: Preset, skin: Skin, live: boolean) {
  switch (preset) {
    case 'video':
    case 'hlsjs-video':
    case 'mux-video':
    case 'mux-video-spf':
    case 'native-hls-video':
    case 'hls-video':
    case 'dash-video':
      if (live) {
        if (skin === 'minimal') await import('@videojs/html/cdn/live-video-minimal');
        else await import('@videojs/html/cdn/live-video');
      } else {
        if (skin === 'minimal') await import('@videojs/html/cdn/video-minimal');
        else await import('@videojs/html/cdn/video');
      }
      break;
    case 'audio':
    case 'mux-audio':
    case 'mux-audio-spf':
    case 'hls-audio':
      if (skin === 'minimal') await import('@videojs/html/cdn/audio-minimal');
      else await import('@videojs/html/cdn/audio');
      break;
    case 'background-video':
    case 'hls-background-video':
    case 'mux-background-video':
      // Player and skin are shared; the element each one renders is what differs,
      // and that arrives from `loadCdnMedia`.
      await import('@videojs/html/cdn/background');
      break;
  }
}

async function loadCdnMedia(preset: Preset) {
  switch (preset) {
    case 'hlsjs-video':
      await import('@videojs/html/cdn/media/hlsjs-video');
      break;
    case 'mux-video':
      await import('@videojs/html/cdn/media/mux-video');
      break;
    // One preset loads one flavor, so the SPF-backed element is the only claimant
    // and registers as `<mux-video>` — the CDN page is where that rule is visible,
    // since a page picks bundles at runtime rather than by import path.
    case 'mux-video-spf':
      await import('@videojs/html/cdn/media/mux-video/spf');
      break;
    case 'mux-audio':
      await import('@videojs/html/cdn/media/mux-audio');
      break;
    case 'mux-audio-spf':
      await import('@videojs/html/cdn/media/mux-audio/spf');
      break;
    // `<background-video>` rides along inside the `background` bundle above; the
    // SPF-backed tags are their own bundles, so the page loads them the way it
    // loads every other media element. Both tags are one element, and a CDN page
    // loads bundles at runtime — so it loads only the one the preset names.
    case 'hls-background-video':
      await import('@videojs/html/cdn/media/hls-background-video');
      break;
    case 'mux-background-video':
      await import('@videojs/html/cdn/media/mux-background-video');
      break;
    case 'native-hls-video':
      await import('@videojs/html/cdn/media/native-hls-video');
      break;
    case 'hls-video':
      await import('@videojs/html/cdn/media/hls-video');
      break;
    case 'hls-audio':
      await import('@videojs/html/cdn/media/hls-audio');
      break;
    case 'dash-video':
      await import('@videojs/html/cdn/media/dash-video');
      break;
  }
}

// ---------------------------------------------------------------------------
// Rendering — produces the exact HTML markup the installation builder generates.
// ---------------------------------------------------------------------------

function isAudioPreset(preset: Preset): boolean {
  return preset === 'audio' || preset === 'mux-audio' || preset === 'mux-audio-spf' || preset === 'hls-audio';
}

function isBackgroundPreset(preset: Preset): boolean {
  return preset === 'background-video' || preset === 'hls-background-video' || preset === 'mux-background-video';
}

function getPlayerTag(preset: Preset, live: boolean): string {
  if (isBackgroundPreset(preset)) return 'background-video-player';
  if (isAudioPreset(preset)) return live ? 'live-audio-player' : 'audio-player';
  return live ? 'live-video-player' : 'video-player';
}

function getSkinTag(preset: Preset, skin: Skin, live: boolean): string {
  if (isBackgroundPreset(preset)) return 'background-video-skin';
  if (isAudioPreset(preset)) return CSS_SKIN_TAGS[skin].audio;
  if (live) return LIVE_VIDEO_CSS_SKIN_TAGS[skin];
  return CSS_SKIN_TAGS[skin].video;
}

function getMediaTag(preset: Preset): string {
  const tags: Partial<Record<Preset, string>> = {
    'hlsjs-video': 'hlsjs-video',
    'mux-video': 'mux-video',
    'mux-video-spf': 'mux-video',
    'mux-audio': 'mux-audio',
    'mux-audio-spf': 'mux-audio',
    'native-hls-video': 'native-hls-video',
    'hls-video': 'hls-video',
    'hls-audio': 'hls-audio',
    'dash-video': 'dash-video',
    audio: 'audio',
    'background-video': 'background-video',
    'hls-background-video': 'hls-background-video',
    'mux-background-video': 'mux-background-video',
  };

  return tags[preset] ?? 'video';
}

function loadStylesheets(preset: Preset, skin: Skin) {
  if (isAudioPreset(preset)) loadAudioStylesheets(skin);
  else if (!isBackgroundPreset(preset)) loadVideoStylesheets(skin);
  // Background CSS is loaded via dynamic import in loadCdnPreset.
}

function isVideoPreset(preset: Preset): boolean {
  return (
    preset === 'video' ||
    preset === 'hlsjs-video' ||
    preset === 'mux-video' ||
    preset === 'mux-video-spf' ||
    preset === 'native-hls-video' ||
    preset === 'hls-video' ||
    preset === 'dash-video'
  );
}

function canPlayLive(preset: Preset): boolean {
  return (
    preset === 'hlsjs-video' ||
    preset === 'mux-video' ||
    preset === 'mux-video-spf' ||
    preset === 'native-hls-video' ||
    preset === 'hls-video'
  );
}

async function render() {
  const live = canPlayLive(preset) && isLiveSource(state.source);

  const loaded = await loadLatest(async () => {
    await loadCdnPreset(preset, state.skin, live);
    await loadCdnMedia(preset);
    return true;
  });

  if (!loaded) {
    return;
  }

  // Load the locale before rendering, but outside loadLatest so locale errors keep their specific message.
  await ensureCdnSandboxLocale(locale);

  loadStylesheets(preset, state.skin);

  const root = document.getElementById('root')!;
  const playerTag = getPlayerTag(preset, live);
  const skinTag = getSkinTag(preset, state.skin, live);
  const mediaTag = getMediaTag(preset);
  const source = SOURCES[state.source];
  const storyboard = isVideoPreset(preset) ? getStoryboardSrc(state.source) : undefined;
  const poster = isVideoPreset(preset) ? getPosterSrc(state.source) : undefined;

  // Each background preset renders its own fixed source: the native element takes
  // a progressive MP4, the SPF-backed tags need CMAF/fMP4 over HLS. The Mux tag
  // gets the capped URL, which is the whole reason that name is worth keeping —
  // `hls-background-video` is the same element pinning the top rendition on offer.
  const backgroundSrc =
    preset === 'mux-background-video'
      ? `${HLS_BACKGROUND_VIDEO_SRC}?max_resolution=720p`
      : preset === 'hls-background-video'
        ? HLS_BACKGROUND_VIDEO_SRC
        : BACKGROUND_VIDEO_SRC;
  const sourceAttr = isBackgroundPreset(preset) ? `src="${backgroundSrc}"` : `src="${source.url}"`;
  const mediaAttrs = renderMediaAttrs(state);

  // Background video needs viewport dimensions instead of flex centering.
  if (isBackgroundPreset(preset)) {
    root.className = '';
    root.style.cssText = 'width: 100vw; height: 100vh;';
  }

  if (isBackgroundPreset(preset)) {
    root.innerHTML = wrapCdnPlayerI18n(
      playerTag,
      html`
        <${skinTag}>
          <${mediaTag} ${sourceAttr}></${mediaTag}>
        </${skinTag}>
      `
    );
    await syncCdnI18nProvider(locale, localeApplySeq);
    return;
  }

  if (isAudioPreset(preset)) {
    root.innerHTML = html`
      <div class="w-full max-w-xl mx-auto">
        ${wrapCdnPlayerI18n(
          playerTag,
          html`
            <${skinTag}>
              <${mediaTag} ${sourceAttr} ${mediaAttrs}></${mediaTag}>
            </${skinTag}>
          `
        )}
      </div>
    `;
    await syncCdnI18nProvider(locale, localeApplySeq);
    return;
  }

  const skin = html`
    <${skinTag} class="aspect-video max-w-4xl mx-auto">
      <${mediaTag} ${sourceAttr} ${mediaAttrs} playsinline crossorigin="anonymous">
        ${isVideoPreset(preset) ? renderChapters(getChapters(state.source)) : ''}
        ${renderStoryboard(storyboard)}
      </${mediaTag}>
      ${poster ? html`<img slot="poster" src="${poster}" alt="Video poster" />` : ''}
    </${skinTag}>
  `;

  root.innerHTML = wrapCdnPlayerI18n(playerTag, skin);

  await syncCdnI18nProvider(locale, localeApplySeq);

  if (import.meta.env.DEV && !document.querySelector('media-i18n')) {
    throw new Error(
      '[videojs/sandbox] CDN preset requires <media-i18n>. Run pnpm dev:sandbox (or pnpm exec tsx scripts/setup.ts).'
    );
  }
}

async function init(): Promise<void> {
  document.documentElement.lang = locale;
  await render();
}

void init();

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
  const provider = document.querySelector('media-i18n');
  if (provider) {
    void applyLocale(next);
    return;
  }

  const seq = ++localeApplySeq;
  void (async () => {
    await ensureCdnSandboxLocale(next);
    if (seq !== localeApplySeq) return;
    locale = next;
    document.documentElement.lang = locale;
    await render();
  })();
});
