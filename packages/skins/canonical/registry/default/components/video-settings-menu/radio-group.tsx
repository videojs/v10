import {
  AudioTrackRadioGroup as AudioTrackRadioGroupPrimitive,
  CaptionsRadioGroup as CaptionsRadioGroupPrimitive,
  PlaybackRateRadioGroup as PlaybackRateRadioGroupPrimitive,
  QualityRadioGroup as QualityRadioGroupPrimitive,
} from '@videojs/react';
import { cn, resolveClassName } from '@/components/videojs/utils';

export interface QualityRadioGroupProps extends QualityRadioGroupPrimitive.Props {}

export function QualityRadioGroup({ className, ...props }: QualityRadioGroupProps) {
  return (
    <QualityRadioGroupPrimitive
      {...props}
      className={(state) =>
        cn(
          'relative flex flex-col gap-0.5 [anchor-scope:--media-menu-item-highlight-anchor]',
          resolveClassName(className, state),
        )
      }
    />
  );
}

export interface AudioTrackRadioGroupProps extends AudioTrackRadioGroupPrimitive.Props {}

export function AudioTrackRadioGroup({ className, ...props }: AudioTrackRadioGroupProps) {
  return (
    <AudioTrackRadioGroupPrimitive
      {...props}
      className={(state) =>
        cn(
          'relative flex flex-col gap-0.5 [anchor-scope:--media-menu-item-highlight-anchor]',
          resolveClassName(className, state),
        )
      }
    />
  );
}

export interface PlaybackRateRadioGroupProps extends PlaybackRateRadioGroupPrimitive.Props {}

export function PlaybackRateRadioGroup({ className, ...props }: PlaybackRateRadioGroupProps) {
  return (
    <PlaybackRateRadioGroupPrimitive
      {...props}
      className={(state) =>
        cn(
          'relative flex flex-col gap-0.5 [anchor-scope:--media-menu-item-highlight-anchor]',
          resolveClassName(className, state),
        )
      }
    />
  );
}

export interface CaptionsRadioGroupProps extends CaptionsRadioGroupPrimitive.Props {}

export function CaptionsRadioGroup({ className, ...props }: CaptionsRadioGroupProps) {
  return (
    <CaptionsRadioGroupPrimitive
      {...props}
      className={(state) =>
        cn(
          'relative flex flex-col gap-0.5 [anchor-scope:--media-menu-item-highlight-anchor]',
          resolveClassName(className, state),
        )
      }
    />
  );
}
