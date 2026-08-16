import { AudioTrackRadioGroup as AudioTrackRadioGroupPrimitive } from '@/ui/audio-track-radio-group';
import { CaptionsRadioGroup as CaptionsRadioGroupPrimitive } from '@/ui/captions-radio-group';
import { PlaybackRateRadioGroup as PlaybackRateRadioGroupPrimitive } from '@/ui/playback-rate-radio-group';
import { QualityRadioGroup as QualityRadioGroupPrimitive } from '@/ui/quality-radio-group';
import { cn } from '@videojs/utils/style';

export interface QualityRadioGroupProps extends QualityRadioGroupPrimitive.Props {}

export function QualityRadioGroup({ className, ...props }: QualityRadioGroupProps) {
  return (
    <QualityRadioGroupPrimitive
      {...props}
      className={(state) => cn('media-radio-group', typeof className === 'function' ? className(state) : className)}
    />
  );
}

export interface AudioTrackRadioGroupProps extends AudioTrackRadioGroupPrimitive.Props {}

export function AudioTrackRadioGroup({ className, ...props }: AudioTrackRadioGroupProps) {
  return (
    <AudioTrackRadioGroupPrimitive
      {...props}
      className={(state) => cn('media-radio-group', typeof className === 'function' ? className(state) : className)}
    />
  );
}

export interface PlaybackRateRadioGroupProps extends PlaybackRateRadioGroupPrimitive.Props {}

export function PlaybackRateRadioGroup({ className, ...props }: PlaybackRateRadioGroupProps) {
  return (
    <PlaybackRateRadioGroupPrimitive
      {...props}
      className={(state) => cn('media-radio-group', typeof className === 'function' ? className(state) : className)}
    />
  );
}

export interface CaptionsRadioGroupProps extends CaptionsRadioGroupPrimitive.Props {}

export function CaptionsRadioGroup({ className, ...props }: CaptionsRadioGroupProps) {
  return (
    <CaptionsRadioGroupPrimitive
      {...props}
      className={(state) => cn('media-radio-group', typeof className === 'function' ? className(state) : className)}
    />
  );
}
