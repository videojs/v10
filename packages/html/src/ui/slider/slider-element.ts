import { SliderCore, SliderDataAttrs } from '@videojs/core';
import { applyStateDataAttrs, createSlider, getSliderCSSVars, type SliderApi } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';
import { applyStyles, isRTL } from '@videojs/utils/dom';

import { MediaElement } from '../media-element';
import { sliderContext } from './slider-context';

export class SliderElement extends MediaElement {
  static readonly tagName = 'media-slider';

  static override properties = {
    label: { type: String },
    value: { type: Number },
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
    largeStep: { type: Number, attribute: 'large-step' },
    orientation: { type: String },
    disabled: { type: Boolean },
    thumbAlignment: { type: String, attribute: 'thumb-alignment' },
  } satisfies PropertyDeclarationMap<keyof SliderCore.Props>;

  label = SliderCore.defaultProps.label;
  value = SliderCore.defaultProps.value;
  min = SliderCore.defaultProps.min;
  max = SliderCore.defaultProps.max;
  step = SliderCore.defaultProps.step;
  largeStep = SliderCore.defaultProps.largeStep;
  orientation = SliderCore.defaultProps.orientation;
  disabled = SliderCore.defaultProps.disabled;
  thumbAlignment = SliderCore.defaultProps.thumbAlignment;

  readonly #core = new SliderCore();
  readonly #provider = new ContextProvider(this, { context: sliderContext });

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
      isDisabled: () => this.disabled,
      getPercent: () => this.#core.percentFromValue(this.value),
      getStepPercent: () => this.#core.getStepPercent(),
      getLargeStepPercent: () => this.#core.getLargeStepPercent(),
      onValueChange: (percent) => {
        this.value = this.#core.valueFromPercent(percent);
        this.dispatchEvent(new CustomEvent('value-change', { detail: { value: this.value }, bubbles: true }));
      },
      onValueCommit: (percent) => {
        this.value = this.#core.valueFromPercent(percent);
        this.dispatchEvent(new CustomEvent('value-commit', { detail: { value: this.value }, bubbles: true }));
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

    this.#core.setInput(this.#slider.input.current);
    const state = this.#core.getSliderState(this.value);
    const cssVars = getSliderCSSVars(state);

    applyStyles(this, cssVars);

    // Apply state data attributes to the root element.
    applyStateDataAttrs(this, state, SliderDataAttrs);

    // Provide context to child elements (thumb, value, track, etc.).
    this.#provider.setValue({
      state,
      pointerValue: this.#core.valueFromPercent(state.pointerPercent),
      thumbAttrs: this.#core.getAttrs(state),
      thumbProps: this.#slider.thumbProps,
    });
  }
}
