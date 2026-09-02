import type { WistiaSource } from './source';

export * from './helpers';

export type { WistiaPlayer } from './media';

export const WISTIA_PLAYER_TAG = 'wistia-player';

/**
 * An inert Wistia media used when the package is evaluated outside a browser.
 *
 * `@wistia/wistia-player` is the element rather than a library that registers one: it reads `location`, measures the
 * `screen`, binds to the `document` and calls `customElements.define` while it evaluates, and ships no server build
 * that stops short of that. This module is the server build, so nothing here imports it.
 *
 * The members are the ones the normalizer installs on a real player, declared as plain fields: enough for a platform
 * package to subclass this and for a render to read a value back, and no further, since nothing on a server plays.
 */
export class WistiaMedia extends (globalThis.HTMLElement ?? class {}) {
  src = '';
  source: WistiaSource | null = null;
  defaultMuted = false;
  playsInline = true;
  loop = false;

  static get observedAttributes(): string[] {
    return [];
  }
}
