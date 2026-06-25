import type { FeatureAvailabilityCondition, FeatureAvailabilityFeature, MediaFeatureAvailability } from '@videojs/core';
import { logMissingFeature, selectVolume } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { isString } from '@videojs/utils/predicate';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

type MediaFeatureElementCondition = FeatureAvailabilityCondition | string;

export class MediaFeatureElement extends MediaElement {
  static readonly tagName = 'media-feature';

  static override properties = {
    is: { type: String },
    when: { type: String },
    except: { type: String },
  } satisfies PropertyDeclarationMap<'is' | 'when' | 'except'>;

  is: FeatureAvailabilityFeature | '' = '';
  when: MediaFeatureElementCondition | undefined = undefined;
  except: MediaFeatureElementCondition | undefined = undefined;

  readonly #volumeState = new PlayerController(this, playerContext, selectVolume);
  readonly #slot: HTMLSlotElement;

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = ':host{display:contents}slot[hidden]{display:none}';
    this.#slot = document.createElement('slot');
    this.#slot.hidden = true;
    shadow.append(style, this.#slot);
  }

  override connectedCallback(): void {
    super.connectedCallback();

    if (__DEV__ && this.is && !this.#availability) {
      logMissingFeature(this.localName, this.is);
    }
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const availability = this.#availability;

    if (availability) {
      this.dataset.availability = availability;
    } else {
      delete this.dataset.availability;
    }

    this.#slot.hidden = !this.#matches(availability);
  }

  get #availability(): MediaFeatureAvailability | undefined {
    if (this.is === 'volume') return this.#volumeState.value?.volumeAvailability;
    return undefined;
  }

  #matches(availability: MediaFeatureAvailability | undefined): boolean {
    if (!availability) return false;

    if (this.when) return conditionIncludes(this.when, availability);
    if (this.except) return !conditionIncludes(this.except, availability);

    return false;
  }
}

function conditionIncludes(condition: MediaFeatureElementCondition, availability: MediaFeatureAvailability): boolean {
  if (isString(condition)) {
    return condition.split(/[\s,]+/).includes(availability);
  }

  return condition.includes(availability);
}
