import { BufferingIndicator as BufferingIndicatorPrimitive } from '@/ui/buffering-indicator';
import { SpinnerIcon } from '@/icons';

export function BufferingIndicator() {
  return (
    <BufferingIndicatorPrimitive className="media-buffering-indicator">
      <SpinnerIcon className="media-buffering-spinner-icon" />
    </BufferingIndicatorPrimitive>
  );
}
