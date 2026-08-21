import {
  normalizeWistiaPlayer,
  type WistiaSource,
  wistiaControlProps,
  wistiaPlayerDefaultOptions,
  wistiaPlayerStyle,
} from '@videojs/media/dom/wistia';
import { WistiaPlayer } from '@wistia/wistia-player';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

/**
 * Wistia is the one media here that ships a web component of its own, so `<wistia-video>` is that component
 * rather than a wrapper around one: the class extends Wistia's `WistiaPlayer` and normalizes it.
 *
 * `normalizeWistiaPlayer` does the part that is not HTML's — the members `HTMLMediaElement` has that Wistia
 * names differently or not at all, and the events it spells in kebab case. What is left here is the
 * attribute surface: Wistia observes its own kebab-case attributes, and these are the ones a media element
 * is written with.
 */
class NormalizedWistiaPlayer extends WistiaPlayer {
  /** The hashed id of the media playing, or a Wistia URL to resolve one from. Installed by the normalizer. */
  declare src: string;
  /** Wistia's own options, `mediaId` among them. Assigning applies every one of them to the player. */
  declare source: WistiaSource | null;
  /** The muted state the player starts in. Installed by the normalizer. */
  declare defaultMuted: boolean;
  declare playsInline: boolean;
  declare loop: boolean;

  static override get observedAttributes(): string[] {
    return [...WistiaPlayer.observedAttributes, ...Object.keys(MEDIA_ATTRIBUTES)];
  }

  #appliedDefaults = false;

  constructor() {
    super();
    normalizeWistiaPlayer(this as never);
  }

  protected override connectedCallback(): void {
    super.connectedCallback?.();

    if (this.#appliedDefaults) return;
    this.#appliedDefaults = true;

    Object.assign(this, wistiaPlayerDefaultOptions);
    // The style holds whether or not `controls` says anything, so it is written before that is decided.
    Object.assign(this.style, wistiaPlayerStyle(this.hasAttribute('controls')));
    // Wistia draws its chrome by default where a media element hides it, and an absent attribute reports no
    // change for `attributeChangedCallback` to act on — so with nothing written here, Wistia's default would
    // stand and the controls would show. The first connect is where both defaults land, by which point any
    // attribute has already been read.
    if (!this.hasAttribute('controls')) applyControls(this, false);
    // Anything the consumer asked for before connecting outranks the defaults just written. Assigned rather
    // than set through `source`, which would announce a source change that has not happened.
    if (this.source) Object.assign(this, this.source);
  }

  protected override attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    const apply = MEDIA_ATTRIBUTES[name];
    if (apply) {
      if (oldValue !== newValue) apply(this, newValue as string | null);
      return;
    }
    super.attributeChangedCallback(name, oldValue, newValue);
  }
}

/**
 * The attributes a media element is written with, and what each one does to a Wistia player.
 *
 * Wistia has no `src`: it names its media by id, so a URL written here is resolved to one. `muted` is the
 * state the player starts in, which is `defaultMuted` rather than the live `muted` a mute button drives —
 * reflecting that one back onto an attribute would fight the viewer. And `controls` is a group of switches,
 * since Wistia's own `controls` means the player's control instances rather than whether chrome shows.
 */
const MEDIA_ATTRIBUTES: Record<string, (player: NormalizedWistiaPlayer, value: string | null) => void> = {
  autoplay: (player, value) => {
    player.autoplay = value !== null;
  },
  controls: (player, value) => {
    applyControls(player, value !== null);
  },
  loop: (player, value) => {
    player.loop = value !== null;
  },
  muted: (player, value) => {
    player.defaultMuted = value !== null;
  },
  playsinline: (player, value) => {
    player.playsInline = value !== null;
  },
  poster: (player, value) => {
    player.poster = value ?? '';
  },
  preload: (player, value) => {
    player.preload = (value ?? 'metadata') as NormalizedWistiaPlayer['preload'];
  },
  src: (player, value) => {
    player.src = value ?? '';
  },
};

/** Wistia's chrome, and the style that goes with having it or not. */
function applyControls(player: NormalizedWistiaPlayer, controls: boolean): void {
  Object.assign(player, wistiaControlProps(controls));
  Object.assign(player.style, wistiaPlayerStyle(controls));
}

export class WistiaVideo extends MediaAttachMixin(NormalizedWistiaPlayer) {}
