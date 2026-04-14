import { clamp } from '@videojs/utils/number';
import type { UIWheelEvent } from './event';

export interface WheelStepOptions {
  isDisabled: () => boolean;
  getPercent: () => number;
  getStepPercent: () => number;
  onValueChange?: ((percent: number) => void) | undefined;
}

export interface WheelStepProps {
  onWheel: (event: UIWheelEvent) => void;
}

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
