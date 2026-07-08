import { TimeSliderCore, TimeSliderDataAttrs } from '@videojs/core';
import {
  applyElementProps,
  applyStateDataAttrs,
  createSlider,
  getTimeSliderCSSVars,
  logMissingFeature,
  type SliderApi,
  selectBuffer,
  selectPlayback,
  selectTime,
} from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';
import { applyStyles, isRTL } from '@videojs/utils/dom';
import { formatTime } from '@videojs/utils/time';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';
import { sliderContext } from '../slider/context';

export class TimeSliderElement extends MediaElement {
  static readonly tagName = 'media-time-slider';

  static override properties = {
    label: { type: String },
    changeThrottle: { type: Number, attribute: 'change-throttle' },
    step: { type: Number },
    largeStep: { type: Number, attribute: 'large-step' },
    orientation: { type: String },
    disabled: { type: Boolean },
    thumbAlignment: { type: String, attribute: 'thumb-alignment' },
    pauseOnDrag: { type: Boolean, attribute: 'pause-on-drag' },
  } satisfies PropertyDeclarationMap<Exclude<keyof TimeSliderCore.Props, 'value' | 'min' | 'max'>>;

  label = TimeSliderCore.defaultProps.label;
  changeThrottle = TimeSliderCore.defaultProps.changeThrottle;
  step = TimeSliderCore.defaultProps.step;
  largeStep = TimeSliderCore.defaultProps.largeStep;
  orientation = TimeSliderCore.defaultProps.orientation;
  disabled = TimeSliderCore.defaultProps.disabled;
  thumbAlignment = TimeSliderCore.defaultProps.thumbAlignment;
  pauseOnDrag = TimeSliderCore.defaultProps.pauseOnDrag;

  readonly #core = new TimeSliderCore();
  readonly #provider = new ContextProvider(this, { context: sliderContext });
  readonly #timeState = new PlayerController(this, playerContext, selectTime);
  readonly #bufferState = new PlayerController(this, playerContext, selectBuffer);
  readonly #playbackState = new PlayerController(this, playerContext, selectPlayback);

  #slider: SliderApi | null = null;
  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    this.#disconnect = new AbortController();
    const signal = this.#disconnect.signal;

    this.#slider = createSlider({
      getElement: () => this,
      getThumbElement: () => this.querySelector<HTMLElement>('media-slider-thumb'),
      getOrientation: () => this.orientation,
      isRTL: () => isRTL(this),
      isDisabled: () => this.disabled || !this.#timeState.value,
      getPercent: () => {
        const media = this.#timeState.value;
        if (!media) return 0;
        return this.#core.percentFromValue(media.currentTime);
      },
      getStepPercent: () => this.#core.getStepPercent(),
      getLargeStepPercent: () => this.#core.getLargeStepPercent(),
      onValueCommit: (percent) => {
        const media = this.#timeState.value;
        if (media) media.seek(this.#core.rawValueFromPercent(percent));
      },
      changeThrottle: this.changeThrottle,
      onDragStart: () => {
        this.#core.startDrag(this.#playbackState.value);
        this.dispatchEvent(new CustomEvent('drag-start', { bubbles: true }));
      },
      onDragEnd: () => {
        this.#core.endDrag(this.#playbackState.value);
        this.dispatchEvent(new CustomEvent('drag-end', { bubbles: true }));
      },
      adjustPercent: (raw, thumbSize, trackSize) => this.#core.adjustPercentForAlignment(raw, thumbSize, trackSize),
      onResize: () => this.requestUpdate(),
    });

    applyElementProps(this, this.#slider.rootProps, { signal });
    applyStyles(this, this.#slider.rootStyle);
    this.#slider.input.subscribe(() => this.requestUpdate(), { signal });

    if (__DEV__ && !this.#timeState.value) {
      logMissingFeature(this.localName, this.#timeState.displayName!);
    }
  }

  override disconnectedCallback(): void {
    this.#resumeIfDragPaused();
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  override destroyCallback(): void {
    this.#resumeIfDragPaused();
    this.#slider?.destroy();
    super.destroyCallback();
  }

  // createSlider's destroy() does not fire onDragEnd, so a teardown mid-drag
  // would leave playback paused. Called from both disconnect and destroy paths
  // before super so the PlayerController is still attached.
  #resumeIfDragPaused(): void {
    this.#core.endDrag(this.#playbackState.value);
  }

  protected override willUpdate(_changed: PropertyValues): void {
    super.willUpdate(_changed);
    this.#core.setProps(this);
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);
    if (!this.#slider) return;

    const time = this.#timeState.value;
    const buffer = this.#bufferState.value;
    if (!time) return;

    this.#core.setInput(this.#slider.input.current);
    const media = { ...time, ...(buffer ?? { buffered: [], seekable: [] }) };
    this.#core.setMedia(media);
    const state = this.#core.getState();

    const cssVars = getTimeSliderCSSVars(this.#slider.adjustForAlignment(state));

    applyStyles(this, cssVars);

    // Domain-specific data attributes on root (includes data-seeking).
    applyStateDataAttrs(this, state, TimeSliderDataAttrs);

    // Provide context to child elements with base slider data attrs.
    this.#provider.setValue({
      state,
      stateAttrMap: TimeSliderDataAttrs,
      pointerValue: this.#core.valueFromPercent(state.pointerPercent),
      thumbAttrs: this.#core.getAttrs(state),
      thumbProps: this.#slider.thumbProps,
      formatValue: (value) => formatTime(value, state.duration),
    });
  }
}
