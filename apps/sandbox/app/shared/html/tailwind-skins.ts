import type { Skin } from '@app/types';
import { createTemplate, type ShadowStyle } from '@videojs/utils/dom';

import { LIVE_VIDEO_TAILWIND_SKIN_TAGS, TAILWIND_SKIN_TAGS } from './skin-tags';
import { getTailwindStyles } from './tailwind-setup';

// Tailwind HTML skins are no longer exported by @videojs/html. Wrap the ejected source here so it remains testable
// in the sandbox until the compiler owns this compatibility path.
type SkinElementConstructor = CustomElementConstructor & {
  styles?: ShadowStyle;
  template?: HTMLTemplateElement | null;
};

function defineTailwindSkin(
  tagName: string,
  BaseElement: SkinElementConstructor,
  getTemplateHTML: () => string
): string {
  if (customElements.get(tagName)) return tagName;

  class SandboxTailwindSkinElement extends BaseElement {}

  SandboxTailwindSkinElement.styles = getTailwindStyles();
  SandboxTailwindSkinElement.template = createTemplate(getTemplateHTML());
  customElements.define(tagName, SandboxTailwindSkinElement);

  return tagName;
}

export async function loadSandboxVideoTailwindSkin(skin: Skin): Promise<string> {
  const tagName = TAILWIND_SKIN_TAGS[skin].video;
  if (customElements.get(tagName)) return tagName;

  const [{ MinimalVideoSkinElement, VideoSkinElement }, template] = await Promise.all([
    import('@videojs/html/video'),
    skin === 'default'
      ? import('../../../../../site/scripts/ejected-skins/templates/html/video/skin.tailwind')
      : import('../../../../../site/scripts/ejected-skins/templates/html/video/minimal-skin.tailwind'),
    import('@videojs/html/video/ui'),
  ]);
  const BaseElement = skin === 'default' ? VideoSkinElement : MinimalVideoSkinElement;

  return defineTailwindSkin(tagName, BaseElement, template.getTemplateHTML);
}

export async function loadSandboxAudioTailwindSkin(skin: Skin): Promise<string> {
  const tagName = TAILWIND_SKIN_TAGS[skin].audio;
  if (customElements.get(tagName)) return tagName;

  const [{ AudioSkinElement, MinimalAudioSkinElement }, template] = await Promise.all([
    import('@videojs/html/audio'),
    skin === 'default'
      ? import('../../../../../site/scripts/ejected-skins/templates/html/audio/skin.tailwind')
      : import('../../../../../site/scripts/ejected-skins/templates/html/audio/minimal-skin.tailwind'),
    import('@videojs/html/audio/ui'),
  ]);
  const BaseElement = skin === 'default' ? AudioSkinElement : MinimalAudioSkinElement;

  return defineTailwindSkin(tagName, BaseElement, template.getTemplateHTML);
}

export async function loadSandboxLiveVideoTailwindSkin(skin: Skin): Promise<string> {
  const tagName = LIVE_VIDEO_TAILWIND_SKIN_TAGS[skin];
  if (customElements.get(tagName)) return tagName;

  const [{ LiveVideoSkinElement, MinimalLiveVideoSkinElement }, template] = await Promise.all([
    import('@videojs/html/live-video'),
    skin === 'default'
      ? import('../../../../../site/scripts/ejected-skins/templates/html/live-video/skin.tailwind')
      : import('../../../../../site/scripts/ejected-skins/templates/html/live-video/minimal-skin.tailwind'),
    import('@videojs/html/live-video/ui'),
  ]);
  const BaseElement = skin === 'default' ? LiveVideoSkinElement : MinimalLiveVideoSkinElement;

  return defineTailwindSkin(tagName, BaseElement, template.getTemplateHTML);
}
