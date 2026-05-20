import { clamp } from '@videojs/utils/number';
import type { UIWheelEvent } from './event';

/** Options for {@link createWheelStep}. */
export interface WheelStepOptions {
  /** Predicate returning whether the slider is currently disabled. */
  isDisabled: () => boolean;
  /** Accessor for the current 0–100 percent value. */
  getPercent: () => number;
  /** Accessor for the per-step delta as a 0–100 percent. */
  getStepPercent: () => number;
  /** Called with the new value on each wheel event. */
  onValueChange?: ((percent: number) => void) | undefined;
}

/** Event-handler bundle returned by {@link createWheelStep}. */
export interface WheelStepProps {
  /** Wheel handler that steps the slider value. */
  onWheel: (event: UIWheelEvent) => void;
}

/**
 * Build a wheel-step handler that steps a 0–100 percent value on each wheel tick.
 *
 * @param options - Slider accessors and a change callback.
 */
export function createWheelStep(options: WheelStepOptions): WheelStepProps {
  return {
    onWheel(event) {
      if (options.isDisabled()) return;

      const direction = Math.sign(event.deltaY);
      if (direction === 0) return;

      event.preventDefault();

      const stepPercent = options.getStepPercent();
      const currentPercent = options.getPercent();
      const newPercent = clamp(currentPercent - direction * stepPercent, 0, 100);

      options.onValueChange?.(newPercent);
    },
  };
}
