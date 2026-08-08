import {
  AudioTrackRadioGroupCore,
  CaptionsRadioGroupCore,
  PlaybackRateRadioGroupCore,
  QualityRadioGroupCore,
} from '@videojs/core';
import {
  type AnyPlayerStore,
  selectAudioTrack,
  selectPlaybackRate,
  selectQuality,
  selectTextTrack,
} from '@videojs/core/dom';
import { translateText } from '@videojs/core/i18n';
import type { PropertyValues } from '@videojs/element';
import { i18nContext } from '../../i18n/context';
import { I18nController } from '../../i18n/controller';
import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';
import { getMenuItemSettingState } from './get-menu-item-setting-state';
import { MenuItemElement } from './menu-item-element';
import { isMenuItemSettingType, type MenuItemSettingType } from './menu-item-type';

type PlaybackRateState = ReturnType<typeof selectPlaybackRate>;
type QualityState = ReturnType<typeof selectQuality>;
type AudioTrackState = ReturnType<typeof selectAudioTrack>;
type TextTrackState = ReturnType<typeof selectTextTrack>;

/** Optional settings integration that renders and publishes a menu item's current value. */
export class MenuItemValueElement extends MediaElement {
  static readonly tagName = 'media-menu-item-value';

  readonly #playbackRateCore = new PlaybackRateRadioGroupCore();
  readonly #qualityCore = new QualityRadioGroupCore();
  readonly #audioTrackCore = new AudioTrackRadioGroupCore();
  readonly #captionsCore = new CaptionsRadioGroupCore();
  readonly #i18n = new I18nController(this, i18nContext);
  #playbackRateValue: PlayerController<AnyPlayerStore, PlaybackRateState> | null = null;
  #qualityValue: PlayerController<AnyPlayerStore, QualityState> | null = null;
  #audioTrackValue: PlayerController<AnyPlayerStore, AudioTrackState> | null = null;
  #captionsValue: PlayerController<AnyPlayerStore, TextTrackState> | null = null;
  #settingItem: MenuItemElement | null = null;
  #settingDisabledItem: MenuItemElement | null = null;
  #observedItem: MenuItemElement | null = null;
  #itemObserver: MutationObserver | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('aria-live', 'off');
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#itemObserver?.disconnect();
    this.#itemObserver = null;
    this.#observedItem = null;
    this.#clearSettingState();
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const item = this.closest(MenuItemElement.tagName);
    this.#observeItem(item instanceof MenuItemElement ? item : null);
    const type = item?.getAttribute('type') ?? null;
    if (!(item instanceof MenuItemElement) || !isMenuItemSettingType(type)) {
      this.#clearSettingState();
      this.textContent = '';
      return;
    }

    const value = this.#getSettingValue(type);
    if (!value) return;
    const setting = getMenuItemSettingState(
      type,
      {
        playbackRate: this.#playbackRateCore,
        quality: this.#qualityCore,
        audioTrack: this.#audioTrackCore,
        captions: this.#captionsCore,
      },
      value
    );
    const unavailable = setting.availability !== 'available';

    if (this.#settingItem !== item) this.#clearSettingState();
    this.#settingItem = item;
    item.setAttribute('data-availability', setting.availability);
    if (unavailable) {
      item.setAttribute('aria-disabled', 'true');
      this.#settingDisabledItem = item;
    } else if (this.#settingDisabledItem === item && !item.disabled) {
      item.removeAttribute('aria-disabled');
      this.#settingDisabledItem = null;
    }

    const label = translateText(setting.label, this.#i18n.value, setting.labelParams);
    if (this.textContent !== label) this.textContent = label;
  }

  #clearSettingState(): void {
    if (this.#settingDisabledItem && !this.#settingDisabledItem.disabled) {
      this.#settingDisabledItem.removeAttribute('aria-disabled');
    }
    this.#settingItem?.removeAttribute('data-availability');
    this.#settingItem = null;
    this.#settingDisabledItem = null;
  }

  #observeItem(item: MenuItemElement | null): void {
    if (this.#observedItem === item) return;
    this.#itemObserver?.disconnect();
    this.#itemObserver = null;
    this.#observedItem = item;
    if (!item || typeof MutationObserver !== 'function') return;

    this.#itemObserver = new MutationObserver(() => this.requestUpdate());
    this.#itemObserver.observe(item, { attributes: true, attributeFilter: ['type'] });
  }

  #getSettingValue(
    type: MenuItemSettingType
  ): PlaybackRateState | QualityState | AudioTrackState | TextTrackState | undefined {
    if (type === 'playback-rate') {
      this.#playbackRateValue ??= new PlayerController(this, playerContext, selectPlaybackRate);
      return this.#playbackRateValue.value;
    }
    if (type === 'quality') {
      this.#qualityValue ??= new PlayerController(this, playerContext, selectQuality);
      return this.#qualityValue.value;
    }
    if (type === 'audio-track') {
      this.#audioTrackValue ??= new PlayerController(this, playerContext, selectAudioTrack);
      return this.#audioTrackValue.value;
    }
    this.#captionsValue ??= new PlayerController(this, playerContext, selectTextTrack);
    return this.#captionsValue.value;
  }
}
