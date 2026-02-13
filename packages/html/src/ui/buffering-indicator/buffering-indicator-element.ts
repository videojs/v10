import { BufferingIndicatorCore, BufferingIndicatorDataAttrs } from '@videojs/core';
import { applyStateDataAttrs, logMissingFeature, selectPlayback } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

export class BufferingIndicatorElement extends MediaElement {
  static readonly tagName = 'media-buffering-indicator';

  static override properties = {
    delay: { type: Number },
  } satisfies PropertyDeclarationMap<keyof BufferingIndicatorCore.Props>;

  delay = BufferingIndicatorCore.defaultProps.delay;

  readonly #core = new BufferingIndicatorCore(() => this.requestUpdate());
  readonly #state = new PlayerController(this, playerContext, selectPlayback);

  override connectedCallback(): void {
    super.connectedCallback();

    if (__DEV__ && !this.#state.value) {
      logMissingFeature(BufferingIndicatorElement.tagName, 'playback');
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#core.destroy();
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.#core.setProps(this);
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const media = this.#state.value;

    if (!media) return;

    applyStateDataAttrs(this, this.#core.getState(media), BufferingIndicatorDataAttrs);
  }
}
