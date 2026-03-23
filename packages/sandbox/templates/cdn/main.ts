import '@app/styles.css';
import { createHtmlSandboxState, createLatestLoader } from '@app/shared/html/sandbox-state';
import { CSS_SKIN_TAGS } from '@app/shared/html/skin-tags';
import { renderStoryboard } from '@app/shared/html/storyboard';
import { loadAudioStylesheets, loadVideoStylesheets } from '@app/shared/html/stylesheets';
import { onSkinChange, onSourceChange } from '@app/shared/sandbox-listener';
import { BACKGROUND_VIDEO_SRC, getPosterSrc, getStoryboardSrc, SOURCES } from '@app/shared/sources';
import type { Preset, Skin } from '@app/types';

const html = String.raw;

const params = new URLSearchParams(location.search);
const preset = (params.get('preset') ?? 'video') as Preset;

const state = createHtmlSandboxState(preset === 'audio');
const loadLatest = createLatestLoader();

// ---------------------------------------------------------------------------
// CDN module loading — mirrors the exact import graph of each CDN bundle.
// ---------------------------------------------------------------------------

async function loadCdnPreset(preset: Preset, skin: Skin) {
  switch (preset) {
    case 'video':
    case 'hls-video':
    case 'simple-hls-video':
    case 'dash-video':
      if (skin === 'minimal') await import('@videojs/html/cdn/video-minimal');
      else await import('@videojs/html/cdn/video');
      break;
    case 'audio':
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

function getPlayerTag(preset: Preset): string {
  if (preset === 'background-video') return 'background-video-player';
  if (preset === 'audio') return 'audio-player';
  return 'video-player';
}

function getSkinTag(preset: Preset, skin: Skin): string {
  if (preset === 'background-video') return 'background-video-skin';
  if (preset === 'audio') return CSS_SKIN_TAGS[skin].audio;
  return CSS_SKIN_TAGS[skin].video;
}

function getMediaTag(preset: Preset): string {
  const tags: Partial<Record<Preset, string>> = {
    'hls-video': 'hls-video',
    'simple-hls-video': 'simple-hls-video',
    'dash-video': 'dash-video',
    audio: 'audio',
    'background-video': 'background-video',
  };

  return tags[preset] ?? 'video';
}

function loadStylesheets(preset: Preset, skin: Skin) {
  if (preset === 'audio') loadAudioStylesheets(skin);
  else if (preset !== 'background-video') loadVideoStylesheets(skin);
  // Background CSS is loaded via dynamic import in loadCdnPreset.
}

function isVideoPreset(preset: Preset): boolean {
  return preset === 'video' || preset === 'hls-video' || preset === 'simple-hls-video' || preset === 'dash-video';
}

async function render() {
  await loadLatest(async () => {
    await loadCdnPreset(preset, state.skin);
    await loadCdnMedia(preset);
  });

  loadStylesheets(preset, state.skin);

  const root = document.getElementById('root')!;
  const playerTag = getPlayerTag(preset);
  const skinTag = getSkinTag(preset, state.skin);
  const mediaTag = getMediaTag(preset);
  const src = preset === 'background-video' ? BACKGROUND_VIDEO_SRC : SOURCES[state.source].url;
  const storyboard = isVideoPreset(preset) ? getStoryboardSrc(state.source) : undefined;
  const poster = isVideoPreset(preset) ? getPosterSrc(state.source) : undefined;

  // Background video needs viewport dimensions instead of flex centering.
  if (preset === 'background-video') {
    root.className = '';
    root.style.cssText = 'width: 100vw; height: 100vh;';
  }

  if (preset === 'background-video') {
    root.innerHTML = html`
      <${playerTag}>
        <${skinTag}>
          <${mediaTag} src="${src}"></${mediaTag}>
        </${skinTag}>
      </${playerTag}>
    `;
    return;
  }

  if (preset === 'audio') {
    root.innerHTML = html`
      <div class="w-full max-w-xl mx-auto">
        <${playerTag}>
          <${skinTag}>
            <${mediaTag} src="${src}"></${mediaTag}>
          </${skinTag}>
        </${playerTag}>
      </div>
    `;
    return;
  }

  root.innerHTML = html`
    <${playerTag}>
      <${skinTag} class="w-full aspect-video max-w-4xl mx-auto">
        <${mediaTag} src="${src}" playsinline crossorigin="anonymous">
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
