import type { Skin } from '@app/types';

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

async function loadLiveVideoCssSkin(skin: Skin): Promise<string> {
  if (skin === 'default') {
    await import('@videojs/html/live-video/skin');
  } else {
    await import('@videojs/html/live-video/minimal-skin');
  }

  loadVideoStylesheets(skin);

  return LIVE_VIDEO_CSS_SKIN_TAGS[skin];
}

type VideoSkinOptions = { live?: boolean };

/**
 * Loads and registers the video skin for the given skin and returns its custom element tag name. Pass `live: true` to
 * swap in the `live-video` skin variant (same feature set, trimmed time UI).
 */
export function loadVideoSkinTag(skin: Skin, { live = false }: VideoSkinOptions = {}): Promise<string> {
  if (live) {
    return loadLiveVideoCssSkin(skin);
  }

  return loadVideoCssSkin(skin);
}

export function loadAudioSkinTag(skin: Skin): Promise<string> {
  return loadAudioCssSkin(skin);
}
