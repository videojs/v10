import { SeekIndicator as SeekIndicatorPrimitive } from '@/ui/seek-indicator';
import { ChevronIcon } from '@/icons';

export function SeekIndicator() {
  return (
    <SeekIndicatorPrimitive.Root className="media-seek-indicator">
      <ChevronIcon className="media-seek-indicator-icon" />
      <SeekIndicatorPrimitive.Value className="media-seek-indicator-value" />
    </SeekIndicatorPrimitive.Root>
  );
}
