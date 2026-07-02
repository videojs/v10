import type { Skin, Styling } from '@app/types';
import {
  CSS_SKIN_TAGS,
  LIVE_VIDEO_CSS_SKIN_TAGS,
  LIVE_VIDEO_TAILWIND_SKIN_TAGS,
  TAILWIND_SKIN_TAGS,
} from './skin-tags';
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
  if (skin === 'default') {
    const { VideoSkinTailwindElement } = await import('@videojs/html/video/skin.tailwind');
    const { getTailwindStyles } = await import('./tailwind-setup');

    VideoSkinTailwindElement.styles = getTailwindStyles();
  } else {
    const { MinimalVideoSkinTailwindElement } = await import('@videojs/html/video/minimal-skin.tailwind');
    const { getTailwindStyles } = await import('./tailwind-setup');

    MinimalVideoSkinTailwindElement.styles = getTailwindStyles();
  }

  return TAILWIND_SKIN_TAGS[skin].video;
}

async function loadAudioTailwindSkin(skin: Skin): Promise<string> {
  if (skin === 'default') {
    const { AudioSkinTailwindElement } = await import('@videojs/html/audio/skin.tailwind');
    const { getTailwindStyles } = await import('./tailwind-setup');

    AudioSkinTailwindElement.styles = getTailwindStyles();
  } else {
    const { MinimalAudioSkinTailwindElement } = await import('@videojs/html/audio/minimal-skin.tailwind');
    const { getTailwindStyles } = await import('./tailwind-setup');

    MinimalAudioSkinTailwindElement.styles = getTailwindStyles();
  }

  return TAILWIND_SKIN_TAGS[skin].audio;
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
  if (skin === 'default') {
    const { LiveVideoSkinTailwindElement } = await import('@videojs/html/live-video/skin.tailwind');
    const { getTailwindStyles } = await import('./tailwind-setup');

    LiveVideoSkinTailwindElement.styles = getTailwindStyles();
  } else {
    const { MinimalLiveVideoSkinTailwindElement } = await import('@videojs/html/live-video/minimal-skin.tailwind');
    const { getTailwindStyles } = await import('./tailwind-setup');

    MinimalLiveVideoSkinTailwindElement.styles = getTailwindStyles();
  }

  return LIVE_VIDEO_TAILWIND_SKIN_TAGS[skin];
}

type VideoSkinOptions = { live?: boolean };

/**
 * Loads and registers the video skin for the given skin / styling combination
 * and returns its custom element tag name. Pass `live: true` to swap in the
 * `live-video` skin variant (same feature set, trimmed time UI).
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
