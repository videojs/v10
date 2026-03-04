import { SliderDataAttrs, type StateAttrMap, VolumeSliderCore } from '@videojs/core';
import {
  applyStateDataAttrs,
  createSlider,
  getSliderCSSVars,
  logMissingFeature,
  type SliderApi,
  selectVolume,
} from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';
import { applyStyles, isRTL } from '@videojs/utils/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';
import { sliderContext } from '../slider/slider-context';

export class VolumeSliderElement extends MediaElement {
  static readonly tagName = 'media-volume-slider';

  static override properties = {
    label: { type: String },
    step: { type: Number },
    largeStep: { type: Number, attribute: 'large-step' },
    orientation: { type: String },
    disabled: { type: Boolean },
    thumbAlignment: { type: String, attribute: 'thumb-alignment' },
  } satisfies PropertyDeclarationMap<Exclude<keyof VolumeSliderCore.Props, 'value' | 'min' | 'max'>>;

  label = VolumeSliderCore.defaultProps.label;
  step = VolumeSliderCore.defaultProps.step;
  largeStep = VolumeSliderCore.defaultProps.largeStep;
  orientation = VolumeSliderCore.defaultProps.orientation;
  disabled = VolumeSliderCore.defaultProps.disabled;
  thumbAlignment = VolumeSliderCore.defaultProps.thumbAlignment;

  readonly #core = new VolumeSliderCore();
  readonly #provider = new ContextProvider(this, { context: sliderContext });
  readonly #volumeState = new PlayerController(this, playerContext, selectVolume);

  #slider: SliderApi | null = null;
  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    this.#disconnect = new AbortController();
    const signal = this.#disconnect.signal;

    this.#slider = createSlider({
      getElement: () => this,
      getThumbElement: () => this.querySelector<HTMLElement>('media-slider-thumb'),
      getOrientation: () => this.orientation,
      isRTL: () => isRTL(this),
      isDisabled: () => this.disabled || !this.#volumeState.value,
      getPercent: () => {
        const media = this.#volumeState.value;
        if (!media) return 0;
        return media.volume * 100;
      },
      getStepPercent: () => this.#core.getStepPercent(),
      getLargeStepPercent: () => this.#core.getLargeStepPercent(),
      onValueChange: (percent) => {
        this.#setVolume(percent);
      },
      onValueCommit: (percent) => {
        this.#setVolume(percent);
      },
      onDragStart: () => {
        this.dispatchEvent(new CustomEvent('drag-start', { bubbles: true }));
      },
      onDragEnd: () => {
        this.dispatchEvent(new CustomEvent('drag-end', { bubbles: true }));
      },
    });

    this.#slider.input.subscribe(() => this.requestUpdate(), { signal });

    // Prevent default touch gestures and text selection during interaction.
    this.style.touchAction = 'none';
    this.style.userSelect = 'none';

    if (__DEV__ && !this.#volumeState.value) {
      logMissingFeature(this.localName, this.#volumeState.displayName!);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#slider?.destroy();
    this.#slider = null;
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  protected override willUpdate(_changed: PropertyValues): void {
    super.willUpdate(_changed);
    this.#core.setProps(this);
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);
    if (!this.#slider) return;

    const media = this.#volumeState.value;
    if (!media) return;

    this.#core.setInput(this.#slider.input.current);
    this.#core.setMedia(media);
    const state = this.#core.getState();
    const cssVars = getSliderCSSVars(state);

    applyStyles(this, cssVars);

    // Apply data attributes to root.
    applyStateDataAttrs(this, state, SliderDataAttrs);

    // Provide context to child elements.
    this.#provider.setValue({
      state,
      stateAttrMap: SliderDataAttrs as StateAttrMap<object>,
      pointerValue: this.#core.valueFromPercent(state.pointerPercent),
      thumbAttrs: this.#core.getAttrs(state),
      thumbProps: this.#slider.thumbProps,
      formatValue: (value) => `${Math.round(value)}%`,
    });
  }

  #setVolume(percent: number): void {
    const media = this.#volumeState.value;
    media?.changeVolume(this.#core.valueFromPercent(percent) / 100);
  }
}
