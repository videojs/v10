import '@app/styles.css';
import { createHtmlSandboxState, createLatestLoader, renderMediaAttrs } from '@app/shared/html/sandbox-state';
import { CSS_SKIN_TAGS, LIVE_VIDEO_CSS_SKIN_TAGS } from '@app/shared/html/skin-tags';
import { renderStoryboard } from '@app/shared/html/storyboard';
import { loadAudioStylesheets, loadVideoStylesheets } from '@app/shared/html/stylesheets';
import {
  onAutoplayChange,
  onLoopChange,
  onMutedChange,
  onPreloadChange,
  onSkinChange,
  onSourceChange,
} from '@app/shared/sandbox-listener';
import { BACKGROUND_VIDEO_SRC, getPosterSrc, getStoryboardSrc, isLiveSource, SOURCES } from '@app/shared/sources';
import type { Preset, Skin } from '@app/types';

const html = String.raw;

const params = new URLSearchParams(location.search);
const preset = (params.get('preset') ?? 'video') as Preset;

const state = createHtmlSandboxState(preset === 'audio');
const loadLatest = createLatestLoader();

// ---------------------------------------------------------------------------
// CDN module loading — mirrors the exact import graph of each CDN bundle.
// ---------------------------------------------------------------------------

async function loadCdnPreset(preset: Preset, skin: Skin, live: boolean) {
  switch (preset) {
    case 'video':
    case 'hls-video':
    case 'mux-video':
    case 'native-hls-video':
    case 'simple-hls-video':
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
      if (skin === 'minimal') await import('@videojs/html/cdn/audio-minimal');
      else await import('@videojs/html/cdn/audio');
      break;
    case 'background-video':
      await import('@videojs/html/cdn/background');
      break;
  }
}

async function loadCdnMedia(preset: Preset) {
  switch (preset) {
    case 'hls-video':
      await import('@videojs/html/cdn/media/hls-video');
      break;
    case 'mux-video':
      await import('@videojs/html/cdn/media/mux-video');
      break;
    case 'mux-audio':
      await import('@videojs/html/cdn/media/mux-audio');
      break;
    case 'native-hls-video':
      await import('@videojs/html/cdn/media/native-hls-video');
      break;
    case 'simple-hls-video':
      await import('@videojs/html/cdn/media/simple-hls-video');
      break;
    case 'dash-video':
      await import('@videojs/html/cdn/media/dash-video');
      break;
  }
}

// ---------------------------------------------------------------------------
// Rendering — produces the exact HTML markup the installation builder generates.
// ---------------------------------------------------------------------------

function getPlayerTag(preset: Preset, live: boolean): string {
  if (preset === 'background-video') return 'background-video-player';
  if (preset === 'audio' || preset === 'mux-audio') return live ? 'live-audio-player' : 'audio-player';
  return live ? 'live-video-player' : 'video-player';
}

function getSkinTag(preset: Preset, skin: Skin, live: boolean): string {
  if (preset === 'background-video') return 'background-video-skin';
  if (preset === 'audio' || preset === 'mux-audio') return CSS_SKIN_TAGS[skin].audio;
  if (live) return LIVE_VIDEO_CSS_SKIN_TAGS[skin];
  return CSS_SKIN_TAGS[skin].video;
}

function getMediaTag(preset: Preset): string {
  const tags: Partial<Record<Preset, string>> = {
    'hls-video': 'hls-video',
    'mux-video': 'mux-video',
    'mux-audio': 'mux-audio',
    'native-hls-video': 'native-hls-video',
    'simple-hls-video': 'simple-hls-video',
    'dash-video': 'dash-video',
    audio: 'audio',
    'background-video': 'background-video',
  };

  return tags[preset] ?? 'video';
}

function loadStylesheets(preset: Preset, skin: Skin) {
  if (preset === 'audio' || preset === 'mux-audio') loadAudioStylesheets(skin);
  else if (preset !== 'background-video') loadVideoStylesheets(skin);
  // Background CSS is loaded via dynamic import in loadCdnPreset.
}

function isVideoPreset(preset: Preset): boolean {
  return (
    preset === 'video' ||
    preset === 'hls-video' ||
    preset === 'mux-video' ||
    preset === 'native-hls-video' ||
    preset === 'simple-hls-video' ||
    preset === 'dash-video'
  );
}

function canPlayLive(preset: Preset): boolean {
  return (
    preset === 'hls-video' || preset === 'mux-video' || preset === 'native-hls-video' || preset === 'simple-hls-video'
  );
}

async function render() {
  const live = canPlayLive(preset) && isLiveSource(state.source);

  await loadLatest(async () => {
    await loadCdnPreset(preset, state.skin, live);
    await loadCdnMedia(preset);
  });

  loadStylesheets(preset, state.skin);

  const root = document.getElementById('root')!;
  const playerTag = getPlayerTag(preset, live);
  const skinTag = getSkinTag(preset, state.skin, live);
  const mediaTag = getMediaTag(preset);
  const source = SOURCES[state.source];
  const storyboard = isVideoPreset(preset) ? getStoryboardSrc(state.source) : undefined;
  const poster = isVideoPreset(preset) ? getPosterSrc(state.source) : undefined;

  const sourceAttr = preset === 'background-video' ? `src="${BACKGROUND_VIDEO_SRC}"` : `src="${source.url}"`;
  const mediaAttrs = renderMediaAttrs(state);

  // Background video needs viewport dimensions instead of flex centering.
  if (preset === 'background-video') {
    root.className = '';
    root.style.cssText = 'width: 100vw; height: 100vh;';
  }

  if (preset === 'background-video') {
    root.innerHTML = html`
      <${playerTag}>
        <${skinTag}>
          <${mediaTag} ${sourceAttr}></${mediaTag}>
        </${skinTag}>
      </${playerTag}>
    `;
    return;
  }

  if (preset === 'audio' || preset === 'mux-audio') {
    root.innerHTML = html`
      <div class="w-full max-w-xl mx-auto">
        <${playerTag}>
          <${skinTag}>
            <${mediaTag} ${sourceAttr} ${mediaAttrs}></${mediaTag}>
          </${skinTag}>
        </${playerTag}>
      </div>
    `;
    return;
  }

  root.innerHTML = html`
    <${playerTag}>
      <${skinTag} class="aspect-video max-w-4xl mx-auto">
        <${mediaTag} ${sourceAttr} ${mediaAttrs} playsinline crossorigin="anonymous">
          ${renderStoryboard(storyboard)}
        </${mediaTag}>
        ${poster ? html`<img slot="poster" src="${poster}" alt="Video poster" />` : ''}
      </${skinTag}>
    </${playerTag}>
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
