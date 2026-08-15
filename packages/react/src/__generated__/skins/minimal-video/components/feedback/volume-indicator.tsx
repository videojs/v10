import { VolumeIndicator as VolumeIndicatorPrimitive } from '@/ui/volume-indicator';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@/icons/minimal';

export function VolumeIndicator({
  variant = 'default',
}: {
  variant?: 'default' | 'minimal';
} = {}) {
  return (
    <VolumeIndicatorPrimitive.Root
      className={
        variant === 'minimal'
          ? 'media-volume-indicator media-volume-indicator-minimal'
          : 'media-surface media-volume-indicator'
      }
    >
      <VolumeIndicatorPrimitive.Fill
        className={
          variant === 'minimal'
            ? 'media-volume-indicator-fill media-volume-indicator-fill-minimal'
            : 'media-volume-indicator-fill'
        }
      >
        <VolumeHighIcon className="media-volume-indicator-icon media-volume-high-indicator-icon" />
        <VolumeLowIcon className="media-volume-indicator-icon media-volume-low-indicator-icon" />
        <VolumeOffIcon className="media-volume-indicator-icon media-volume-off-indicator-icon" />
        <VolumeIndicatorPrimitive.Value className="media-volume-indicator-value" />
      </VolumeIndicatorPrimitive.Fill>
    </VolumeIndicatorPrimitive.Root>
  );
}
