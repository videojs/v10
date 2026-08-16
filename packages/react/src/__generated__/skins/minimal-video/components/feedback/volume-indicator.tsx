import { VolumeIndicator as VolumeIndicatorPrimitive } from '@/ui/volume-indicator';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@/icons/minimal';

export function VolumeIndicator() {
  return (
    <VolumeIndicatorPrimitive.Root className="media-volume-indicator">
      <VolumeIndicatorPrimitive.Fill className="media-volume-indicator-fill">
        <VolumeHighIcon className="media-volume-indicator-icon media-volume-high-indicator-icon" />
        <VolumeLowIcon className="media-volume-indicator-icon media-volume-low-indicator-icon" />
        <VolumeOffIcon className="media-volume-indicator-icon media-volume-off-indicator-icon" />
        <VolumeIndicatorPrimitive.Value className="media-volume-indicator-value" />
      </VolumeIndicatorPrimitive.Fill>
    </VolumeIndicatorPrimitive.Root>
  );
}
