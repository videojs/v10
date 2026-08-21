// Keep this import first: it lends `@wistia/wistia-player` the browser globals a server runtime lacks and
// the package reads while it evaluates. See `server-shim.ts`.
import './server-shim';

import { WistiaPlayer } from '@wistia/wistia-player';
import { normalizeWistiaPlayer } from './normalize';
import { type WistiaMediaOptionsProps, wistiaMediaOptions } from './options';
import { restoreWistiaGlobals } from './server-shim';
import { type WistiaSource, wistiaPlayerStyle } from './source';

restoreWistiaGlobals();

/**
 * Wistia's own player element: what `<wistia-player>` is, and so the type of the node React renders and
 * hands back. Named from here rather than from `@wistia/wistia-player`, which is the dependency this module
 * exists to keep in one place.
 */
export type { WistiaPlayer };

/**
 * Wistia is the one media here that ships a web component of its own, so this is that component rather than
 * a wrapper around one: the class extends Wistia's `WistiaPlayer`, and the platform packages register it
 * under a tag and attach it to a player store.
 *
 * There are two halves to giving Wistia's player the surface a media has. `normalizeWistiaPlayer` does the
 * one that is not HTML's — the members `HTMLMediaElement` has that Wistia names differently or not at all,
 * and the events it spells in kebab case. This class does the other: the attributes a media element is
 * written with, which Wistia has its own names, its own spellings, and its own defaults for.
 */
export class WistiaMedia extends WistiaPlayer {
  /** The hashed id of the media playing, or a Wistia URL to resolve one from. Installed by the normalizer. */
  declare src: string;
  /** Wistia's own options, `mediaId` among them. Assigning applies every one of them to the player. */
  declare source: WistiaSource | null;
  /** The muted state the player starts in. Installed by the normalizer. */
  declare defaultMuted: boolean;
  declare playsInline: boolean;
  declare loop: boolean;

  static override get observedAttributes(): string[] {
    return [...WistiaPlayer.observedAttributes, ...OPTION_ATTRIBUTES, ...Object.keys(MEDIA_ATTRIBUTES)];
  }

  constructor() {
    super();
    // No cast: this is where Wistia's real class is held to the contract the normalizer describes.
    normalizeWistiaPlayer(this);
  }

  protected override connectedCallback(): void {
    super.connectedCallback?.();
    // Markup that writes none of these still gets them: an absent attribute reports no change for
    // `attributeChangedCallback` to act on, and Wistia's own defaults are not a media element's.
    this.#applyOptions();
  }

  protected override attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (OPTION_ATTRIBUTES.includes(name)) {
      // Wistia writes some of these back from the property setter this is about to reach, so the guard is
      // what stops the two answering each other.
      if (oldValue !== newValue) this.#applyOptions();
      return;
    }

    const apply = MEDIA_ATTRIBUTES[name];
    if (apply) {
      if (oldValue !== newValue) apply(this, newValue as string | null);
      return;
    }

    super.attributeChangedCallback(name, oldValue, newValue);
  }

  /**
   * The player's whole configuration, worked out again from scratch. Cheaper to reason about than keeping it
   * up to date one attribute at a time, and the only way `controls` going away can put the player back the
   * way this media would have had it rather than the way Wistia would.
   */
  #applyOptions(): void {
    const controls = this.hasAttribute('controls');

    Object.assign(
      this,
      wistiaMediaOptions({
        autoplay: this.hasAttribute('autoplay'),
        controls,
        loop: this.hasAttribute('loop'),
        poster: this.getAttribute('poster') ?? undefined,
        preload: (this.getAttribute('preload') ?? undefined) as WistiaMediaOptionsProps['preload'],
      })
    );
    // Wistia's own options outrank the ones a media attribute decided, whenever the source that carried them
    // was set — including before this element was ever connected.
    if (this.source) Object.assign(this, this.source);
    Object.assign(this.style, wistiaPlayerStyle(controls));
  }
}

/**
 * The attributes that configure the player as a whole, so a change to any one of them is worked out through
 * `wistiaMediaOptions` rather than on its own. Wistia observes `autoplay`, `poster`, and `preload` too, and
 * these readings win: `autoplay` is presence rather than the word `"true"`, `preload` falls back the way a
 * media element's does, and `controls` is a group of switches, since Wistia's own `controls` means the
 * player's control instances rather than whether chrome shows.
 */
const OPTION_ATTRIBUTES = ['autoplay', 'controls', 'loop', 'poster', 'preload'];

/**
 * The attributes that mean something on their own.
 *
 * Wistia has no `src`: it names its media by id, so a URL written here is resolved to one. `muted` is the
 * state the player starts in, which is `defaultMuted` rather than the live `muted` a mute button drives —
 * reflecting that one back onto an attribute would fight the viewer, and re-applying it with everything
 * else would too. `playsinline` is remembered and goes no further, since Wistia plays inline regardless.
 */
const MEDIA_ATTRIBUTES: Record<string, (player: WistiaMedia, value: string | null) => void> = {
  muted: (player, value) => {
    player.defaultMuted = value !== null;
  },
  playsinline: (player, value) => {
    player.playsInline = value !== null;
  },
  src: (player, value) => {
    player.src = value ?? '';
  },
};
