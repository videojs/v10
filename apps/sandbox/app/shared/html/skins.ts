import type { Skin, Styling } from '@app/types';

import { CSS_SKIN_TAGS, LIVE_VIDEO_CSS_SKIN_TAGS } from './skin-tags';
import { loadAudioStylesheets, loadVideoStylesheets } from './stylesheets';

async function loadVideoCssSkin(skin: Skin): Promise<string> {
  if (skin === 'default') {
    await import('@videojs/html/video/skin');
  } else {
    await import('@videojs/html/video/minimal-skin');
  }

  loadVideoStylesheets(skin);

  return CSS_SKIN_TAGS[skin].video;
}

async function loadAudioCssSkin(skin: Skin): Promise<string> {
  if (skin === 'default') {
    await import('@videojs/html/audio/skin');
  } else {
    await import('@videojs/html/audio/minimal-skin');
  }

  loadAudioStylesheets(skin);

  return CSS_SKIN_TAGS[skin].audio;
}

async function loadVideoTailwindSkin(skin: Skin): Promise<string> {
  const { loadSandboxVideoTailwindSkin } = await import('./tailwind-skins');

  return loadSandboxVideoTailwindSkin(skin);
}

async function loadAudioTailwindSkin(skin: Skin): Promise<string> {
  const { loadSandboxAudioTailwindSkin } = await import('./tailwind-skins');

  return loadSandboxAudioTailwindSkin(skin);
}

async function loadLiveVideoCssSkin(skin: Skin): Promise<string> {
  if (skin === 'default') {
    await import('@videojs/html/live-video/skin');
  } else {
    await import('@videojs/html/live-video/minimal-skin');
  }

  loadVideoStylesheets(skin);

  return LIVE_VIDEO_CSS_SKIN_TAGS[skin];
}

async function loadLiveVideoTailwindSkin(skin: Skin): Promise<string> {
  const { loadSandboxLiveVideoTailwindSkin } = await import('./tailwind-skins');

  return loadSandboxLiveVideoTailwindSkin(skin);
}

type VideoSkinOptions = { live?: boolean };

/**
 * Loads and registers the video skin for the given skin / styling combination and returns its custom element tag name.
 * Pass `live: true` to swap in the `live-video` skin variant (same feature set, trimmed time UI).
 */
export function loadVideoSkinTag(
  skin: Skin,
  styling: Styling,
  { live = false }: VideoSkinOptions = {}
): Promise<string> {
  if (live) {
    return styling === 'tailwind' ? loadLiveVideoTailwindSkin(skin) : loadLiveVideoCssSkin(skin);
  }

  return styling === 'tailwind' ? loadVideoTailwindSkin(skin) : loadVideoCssSkin(skin);
}

export function loadAudioSkinTag(skin: Skin, styling: Styling): Promise<string> {
  return styling === 'tailwind' ? loadAudioTailwindSkin(skin) : loadAudioCssSkin(skin);
}
