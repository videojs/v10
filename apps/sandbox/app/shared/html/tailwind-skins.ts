import type { Skin } from '@app/types';
import { ContainerElement } from '@videojs/html';

import { LIVE_AUDIO_TAILWIND_SKIN_TAGS, LIVE_VIDEO_TAILWIND_SKIN_TAGS, TAILWIND_SKIN_TAGS } from './skin-tags';

interface TailwindSkinModule {
  readonly default: string;
}

type SkinLoader = () => Promise<readonly [TailwindSkinModule, unknown]>;

const videoSkins = {
  default: () =>
    Promise.all([
      import('@app/_generated/html/components/videojs/skins/video/skin.html?raw'),
      import('@app/_generated/html/components/videojs/skins/video/skin'),
    ]),
  minimal: () =>
    Promise.all([
      import('@app/_generated/html/components/videojs/skins/video-minimal/skin.html?raw'),
      import('@app/_generated/html/components/videojs/skins/video-minimal/skin'),
    ]),
} satisfies Record<Skin, SkinLoader>;

const liveVideoSkins = {
  default: () =>
    Promise.all([
      import('@app/_generated/html/components/videojs/skins/live-video/skin.html?raw'),
      import('@app/_generated/html/components/videojs/skins/live-video/skin'),
    ]),
  minimal: () =>
    Promise.all([
      import('@app/_generated/html/components/videojs/skins/live-video-minimal/skin.html?raw'),
      import('@app/_generated/html/components/videojs/skins/live-video-minimal/skin'),
    ]),
} satisfies Record<Skin, SkinLoader>;

const audioSkins = {
  default: () =>
    Promise.all([
      import('@app/_generated/html/components/videojs/skins/audio/skin.html?raw'),
      import('@app/_generated/html/components/videojs/skins/audio/skin'),
    ]),
  minimal: () =>
    Promise.all([
      import('@app/_generated/html/components/videojs/skins/audio-minimal/skin.html?raw'),
      import('@app/_generated/html/components/videojs/skins/audio-minimal/skin'),
    ]),
} satisfies Record<Skin, SkinLoader>;

const liveAudioSkins = {
  default: () =>
    Promise.all([
      import('@app/_generated/html/components/videojs/skins/live-audio/skin.html?raw'),
      import('@app/_generated/html/components/videojs/skins/live-audio/skin'),
    ]),
  minimal: () =>
    Promise.all([
      import('@app/_generated/html/components/videojs/skins/live-audio-minimal/skin.html?raw'),
      import('@app/_generated/html/components/videojs/skins/live-audio-minimal/skin'),
    ]),
} satisfies Record<Skin, SkinLoader>;

function defineTailwindSkin(tagName: string, source: string): string {
  if (customElements.get(tagName)) return tagName;

  class SandboxTailwindSkinElement extends ContainerElement {
    #rendered = false;

    override connectedCallback(): void {
      super.connectedCallback();
      this.#render();
    }

    #render(): void {
      if (this.#rendered || !this.isConnected) return;

      this.#rendered = true;

      const template = document.createElement('template');

      template.innerHTML = source;

      const container = template.content.firstElementChild;

      if (!(container instanceof HTMLElement) || container.localName !== 'media-container') {
        throw new Error(`Source-owned skin ${tagName} has no media-container root.`);
      }

      const marker = findMediaMarker(container);
      if (!marker) throw new Error(`Source-owned skin ${tagName} has no media marker.`);

      const poster = this.querySelector(':scope > [slot="poster"]');

      for (const child of [...this.childNodes]) {
        if (child !== poster) marker.before(child);
      }

      marker.remove();

      if (poster instanceof HTMLImageElement) {
        poster.removeAttribute('slot');
        container.querySelector('media-poster img')?.replaceWith(poster);
      }

      container.classList.add(...this.classList);
      container.style.cssText += this.style.cssText;
      this.className = container.className;
      this.style.cssText = container.style.cssText;
      this.replaceChildren(...container.childNodes);
    }
  }

  customElements.define(tagName, SandboxTailwindSkinElement);
  return tagName;
}

function findMediaMarker(root: HTMLElement): Comment | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  let node = walker.nextNode();

  while (node) {
    if (node instanceof Comment && node.textContent.includes('Add a compatible media element here')) return node;

    node = walker.nextNode();
  }

  return null;
}

async function loadTailwindSkin(loader: SkinLoader, tagName: string): Promise<string> {
  if (customElements.get(tagName)) return tagName;

  const [module] = await loader();

  return defineTailwindSkin(tagName, module.default);
}

export function loadSandboxVideoTailwindSkin(skin: Skin): Promise<string> {
  return loadTailwindSkin(videoSkins[skin], TAILWIND_SKIN_TAGS[skin].video);
}

export function loadSandboxAudioTailwindSkin(skin: Skin): Promise<string> {
  return loadTailwindSkin(audioSkins[skin], TAILWIND_SKIN_TAGS[skin].audio);
}

export function loadSandboxLiveVideoTailwindSkin(skin: Skin): Promise<string> {
  return loadTailwindSkin(liveVideoSkins[skin], LIVE_VIDEO_TAILWIND_SKIN_TAGS[skin]);
}

export function loadSandboxLiveAudioTailwindSkin(skin: Skin): Promise<string> {
  return loadTailwindSkin(liveAudioSkins[skin], LIVE_AUDIO_TAILWIND_SKIN_TAGS[skin]);
}
