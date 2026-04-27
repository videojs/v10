import type { Skin, Styling } from '@app/types';
import { CSS_SKIN_TAGS, TAILWIND_SKIN_TAGS } from './skin-tags';
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

export function loadVideoSkinTag(skin: Skin, styling: Styling): Promise<string> {
  return styling === 'tailwind' ? loadVideoTailwindSkin(skin) : loadVideoCssSkin(skin);
}

export function loadAudioSkinTag(skin: Skin, styling: Styling): Promise<string> {
  return styling === 'tailwind' ? loadAudioTailwindSkin(skin) : loadAudioCssSkin(skin);
}
