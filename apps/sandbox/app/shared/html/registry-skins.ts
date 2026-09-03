import type { Skin } from '@app/types';
import { ContainerElement } from '@videojs/html';

import { registrySkinTag, type SkinPreset } from './skin-tags';

interface RegistrySkinModule {
  readonly default: string;
}

type SkinLoader = () => Promise<readonly [RegistrySkinModule, unknown]>;

/** The registry's html skins: a template installed as a file beside the module that registers its elements and CSS. */
const registrySkins = {
  'video/default': () =>
    Promise.all([
      import('@app/_generated/html/components/videojs/skins/video/skin.html?raw'),
      import('@app/_generated/html/components/videojs/skins/video/skin'),
    ]),
  'video/minimal': () =>
    Promise.all([
      import('@app/_generated/html/components/videojs/skins/video/minimal/skin.html?raw'),
      import('@app/_generated/html/components/videojs/skins/video/minimal/skin'),
    ]),
  'live-video/default': () =>
    Promise.all([
      import('@app/_generated/html/components/videojs/skins/live-video/skin.html?raw'),
      import('@app/_generated/html/components/videojs/skins/live-video/skin'),
    ]),
  'live-video/minimal': () =>
    Promise.all([
      import('@app/_generated/html/components/videojs/skins/live-video/minimal/skin.html?raw'),
      import('@app/_generated/html/components/videojs/skins/live-video/minimal/skin'),
    ]),
  'audio/default': () =>
    Promise.all([
      import('@app/_generated/html/components/videojs/skins/audio/skin.html?raw'),
      import('@app/_generated/html/components/videojs/skins/audio/skin'),
    ]),
  'audio/minimal': () =>
    Promise.all([
      import('@app/_generated/html/components/videojs/skins/audio/minimal/skin.html?raw'),
      import('@app/_generated/html/components/videojs/skins/audio/minimal/skin'),
    ]),
  'live-audio/default': () =>
    Promise.all([
      import('@app/_generated/html/components/videojs/skins/live-audio/skin.html?raw'),
      import('@app/_generated/html/components/videojs/skins/live-audio/skin'),
    ]),
  'live-audio/minimal': () =>
    Promise.all([
      import('@app/_generated/html/components/videojs/skins/live-audio/minimal/skin.html?raw'),
      import('@app/_generated/html/components/videojs/skins/live-audio/minimal/skin'),
    ]),
} satisfies Record<`${SkinPreset}/${Skin}`, SkinLoader>;

/** A skin shipped as markup: where the page's media goes, and where a slotted poster image goes. */
export interface SkinTemplate {
  readonly markup: string;
  /** The node the media element replaces. */
  readonly media: (container: HTMLElement) => ChildNode | null;
  /** The node a slotted poster replaces, or that is unwrapped to its own children when none is slotted. */
  readonly poster: (container: HTMLElement) => Element | null;
}

/** The registry rewrites the media slot into a comment and renders the poster's fallback image in place. */
const registryTemplate = (markup: string): SkinTemplate => ({
  markup,
  media: findMediaMarker,
  poster: (container) => container.querySelector('media-poster img'),
});

/**
 * Define an element that stamps a skin template around its own children: the media element takes the template's media
 * position, an `<img slot="poster">` child takes the poster's, and the container's classes and attributes move onto the
 * host so the page's frame classes still apply.
 */
export function defineTemplateSkin(tagName: string, source: SkinTemplate): string {
  if (customElements.get(tagName)) return tagName;

  class SandboxTemplateSkinElement extends ContainerElement {
    #rendered = false;

    override connectedCallback(): void {
      super.connectedCallback();
      this.#render();
    }

    #render(): void {
      if (this.#rendered || !this.isConnected) return;

      this.#rendered = true;

      const template = document.createElement('template');

      template.innerHTML = source.markup;

      const container = template.content.firstElementChild;

      if (!(container instanceof HTMLElement) || container.localName !== 'media-container') {
        throw new Error(`Skin ${tagName} has no media-container root.`);
      }

      const marker = source.media(container);
      if (!marker) throw new Error(`Skin ${tagName} has no place for the media element.`);

      const poster = this.querySelector(':scope > [slot="poster"]');

      for (const child of [...this.childNodes]) {
        if (child !== poster) marker.before(child);
      }

      marker.remove();

      const posterTarget = source.poster(container);

      if (poster instanceof HTMLImageElement) {
        poster.removeAttribute('slot');
        posterTarget?.replaceWith(poster);
      } else if (posterTarget instanceof HTMLSlotElement) {
        posterTarget.replaceWith(...posterTarget.childNodes);
      }

      container.classList.add(...this.classList);
      container.style.cssText += this.style.cssText;
      this.className = container.className;
      this.style.cssText = container.style.cssText;

      for (const attribute of ['data-theme', 'data-preset']) {
        const value = container.getAttribute(attribute);

        if (value !== null) this.setAttribute(attribute, value);
      }

      this.replaceChildren(...container.childNodes);
    }
  }

  customElements.define(tagName, SandboxTemplateSkinElement);
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

/** Define and return the element that renders a registry-installed html skin around the page's media. */
export async function loadRegistrySkinTag(preset: SkinPreset, skin: Skin): Promise<string> {
  const tagName = registrySkinTag(preset, skin);
  if (customElements.get(tagName)) return tagName;

  const [module] = await registrySkins[`${preset}/${skin}`]();

  return defineTemplateSkin(tagName, registryTemplate(module.default));
}
