import type {
  AudioTrackRadioGroupProps as CoreAudioTrackRadioGroupProps,
  CaptionsRadioGroupProps as CoreCaptionsRadioGroupProps,
  PlaybackRateRadioGroupProps as CorePlaybackRateRadioGroupProps,
  QualityRadioGroupProps as CoreQualityRadioGroupProps,
} from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import type { PropsWithChildren } from 'vjsc/components';

import styles from '../../styles/menus/menu.styles';

export function QualityRadioGroup({ className, ...props }: PropsWithChildren<CoreQualityRadioGroupProps>) {
  return <$.QualityRadioGroup className={[styles.radioGroup, className]} {...props} />;
}

export function AudioTrackRadioGroup({ className, ...props }: PropsWithChildren<CoreAudioTrackRadioGroupProps>) {
  return <$.AudioTrackRadioGroup className={[styles.radioGroup, className]} {...props} />;
}

export function PlaybackRateRadioGroup({ className, ...props }: PropsWithChildren<CorePlaybackRateRadioGroupProps>) {
  return <$.PlaybackRateRadioGroup className={[styles.radioGroup, className]} {...props} />;
}

export function CaptionsRadioGroup({ className, ...props }: PropsWithChildren<CoreCaptionsRadioGroupProps>) {
  return <$.CaptionsRadioGroup className={[styles.radioGroup, className]} {...props} />;
}
