import { VolumeSliderCore, VolumeSliderDataAttrs } from '@videojs/core';
import {
  applyElementProps,
  applyStateDataAttrs,
  createSlider,
  createWheelStep,
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
import { sliderContext } from '../slider/context';

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
    if (this.destroyed) return;

    this.#disconnect = new AbortController();
    const signal = this.#disconnect.signal;

    const isDisabled = () => this.disabled || !this.#volumeState.value;
    const getPercent = () => (this.#volumeState.value?.volume ?? 0) * 100;
    const getStepPercent = () => this.#core.getStepPercent();
    const setVolume = (percent: number) => this.#setVolume(percent);

    this.#slider = createSlider({
      getElement: () => this,
      getThumbElement: () => this.querySelector<HTMLElement>('media-slider-thumb'),
      getOrientation: () => this.orientation,
      isRTL: () => isRTL(this),
      isDisabled,
      getPercent,
      getStepPercent,
      getLargeStepPercent: () => this.#core.getLargeStepPercent(),
      onValueChange: setVolume,
      onValueCommit: setVolume,
      onDragStart: () => {
        this.dispatchEvent(new CustomEvent('drag-start', { bubbles: true }));
      },
      onDragEnd: () => {
        this.dispatchEvent(new CustomEvent('drag-end', { bubbles: true }));
      },
      adjustPercent: (raw, thumbSize, trackSize) => this.#core.adjustPercentForAlignment(raw, thumbSize, trackSize),
      onResize: () => this.requestUpdate(),
    });

    const wheelProps = createWheelStep({
      isDisabled,
      getPercent,
      getStepPercent,
      onValueChange: setVolume,
    });

    applyElementProps(this, this.#slider.rootProps, { signal });
    applyElementProps(this, wheelProps, { signal });
    applyStyles(this, this.#slider.rootStyle);
    this.#slider.input.subscribe(() => this.requestUpdate(), { signal });

    if (__DEV__ && !this.#volumeState.value) {
      logMissingFeature(this.localName, this.#volumeState.displayName!);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  override destroyCallback(): void {
    this.#slider?.destroy();
    super.destroyCallback();
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

    const cssVars = getSliderCSSVars(this.#slider.adjustForAlignment(state));

    applyStyles(this, cssVars);

    // Apply data attributes to root.
    applyStateDataAttrs(this, state, VolumeSliderDataAttrs);

    // Provide context to child elements.
    this.#provider.setValue({
      state,
      stateAttrMap: VolumeSliderDataAttrs,
      pointerValue: this.#core.valueFromPercent(state.pointerPercent),
      thumbAttrs: this.#core.getAttrs(state),
      thumbProps: this.#slider.thumbProps,
      formatValue: (value) => `${Math.round(value)}%`,
    });
  }

  #setVolume(percent: number): void {
    const media = this.#volumeState.value;
    media?.setVolume(this.#core.valueFromPercent(percent) / 100);
  }
}
