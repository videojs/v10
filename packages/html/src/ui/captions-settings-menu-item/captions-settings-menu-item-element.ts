import { applyElementProps, selectTextTrack } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { isCaptionOrSubtitleTrack } from '@videojs/utils/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MenuItemElement } from '../menu/menu-item-element';

export class CaptionsSettingsMenuItemElement extends MenuItemElement {
  static override readonly tagName = 'media-captions-settings-menu-item';

  readonly #mediaState = new PlayerController(this, playerContext, selectTextTrack);

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const media = this.#mediaState.value;
    if (!media) return;

    const hasCaptionTracks = media.textTrackList.some(isCaptionOrSubtitleTrack);

    applyElementProps(this, {
      'data-availability': hasCaptionTracks ? undefined : 'unavailable',
    });
  }
}
