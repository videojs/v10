import { CaptionsRadioGroupCore, PlaybackRateRadioGroupCore } from '@videojs/core';
import {
  applyElementProps,
  applyStateDataAttrs,
  completeMenuItemSelection,
  selectPlaybackRate,
  selectTextTrack,
} from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer, ContextProvider } from '@videojs/element/context';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';
import { menuContext, menuItemSettingContext } from './context';
import { getMenuItemSettingState } from './get-menu-item-setting-state';
import type { MenuItemSettingType } from './menu-item-type';

export class MenuItemElement extends MediaElement {
  static readonly tagName = 'media-menu-item';

  static override properties = {
    disabled: { type: Boolean },
    commandfor: { type: String },
    type: { type: String },
  } satisfies PropertyDeclarationMap<'disabled' | 'commandfor' | 'type'>;

  disabled = false;
  /** ID of a nested `<media-menu>` to open when this item is activated. */
  commandfor: string | undefined = undefined;
  /** Setting kind for submenu triggers (`playback-rate` or `captions`). */
  type: MenuItemSettingType | null = null;

  readonly #playbackRateCore = new PlaybackRateRadioGroupCore();
  readonly #captionsCore = new CaptionsRadioGroupCore();
  readonly #playbackRateMedia = new PlayerController(this, playerContext, selectPlaybackRate);
  readonly #captionsMedia = new PlayerController(this, playerContext, selectTextTrack);
  readonly #ctx = new ContextConsumer(this, { context: menuContext, subscribe: true });
  readonly #settingProvider = new ContextProvider(this, { context: menuItemSettingContext });

  #disconnect: AbortController | null = null;
  #registered = false;
  #cleanupRegistration: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disconnect = new AbortController();
    this.#registered = false;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#cleanupRegistration?.();
    this.#cleanupRegistration = null;
    this.#disconnect?.abort();
    this.#disconnect = null;
    this.#registered = false;
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    this.#syncMenuItemSetting();

    const ctx = this.#ctx.value;
    if (!ctx || !this.#disconnect) return;

    if (!this.#registered) {
      this.#registered = true;

      this.#cleanupRegistration = ctx.menu.registerItem(this);

      applyElementProps(
        this,
        {
          onClick: (event: MouseEvent) => {
            const currentCtx = this.#ctx.value;
            if (!currentCtx || this.disabled) return;

            const target = this.commandfor;
            if (target) {
              currentCtx.menu.push(target, this.id);
            } else {
              this.dispatchEvent(new CustomEvent('select', { bubbles: true }));
              completeMenuItemSelection(currentCtx.menu, currentCtx.parentMenu);
            }
            event.preventDefault();
          },
          onKeyDown: (event: KeyboardEvent) => {
            const currentCtx = this.#ctx.value;
            if (!currentCtx || this.disabled || event.key !== 'ArrowRight') return;

            const target = this.commandfor;
            if (!target) return;

            currentCtx.menu.push(target, this.id);
            event.preventDefault();
          },
          onPointerenter: () => {
            const currentCtx = this.#ctx.value;
            if (!this.disabled) currentCtx?.menu.highlight(this, { focus: false });
          },
        },
        { signal: this.#disconnect.signal }
      );
    }

    const hasSubmenu = Boolean(this.commandfor);
    const topEntry = ctx.navigation.stack[ctx.navigation.stack.length - 1];
    const activeSubMenuId = topEntry?.menuId ?? null;
    const isExpanded = hasSubmenu ? activeSubMenuId === this.commandfor : undefined;

    applyElementProps(this, {
      role: 'menuitem',
      'aria-disabled': this.disabled ? 'true' : undefined,
      ...(hasSubmenu && {
        'aria-haspopup': 'menu',
        'aria-expanded': isExpanded ? 'true' : 'false',
        'data-has-submenu': '',
      }),
    });

    applyStateDataAttrs(this, ctx.state, ctx.stateAttrMap);
  }

  #syncMenuItemSetting(): void {
    if (!this.type || !this.commandfor) {
      this.#settingProvider.setValue(null);
      return;
    }

    const media = this.type === 'playback-rate' ? this.#playbackRateMedia.value : this.#captionsMedia.value;
    if (!media) {
      this.#settingProvider.setValue(null);
      return;
    }

    const setting = getMenuItemSettingState(
      this.type,
      { playbackRate: this.#playbackRateCore, captions: this.#captionsCore },
      media
    );

    applyElementProps(this, { 'data-availability': setting.availability });
    this.#settingProvider.setValue({ type: this.type, ...setting });
  }
}
