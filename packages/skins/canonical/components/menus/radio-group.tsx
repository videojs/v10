import {
  AudioTrackRadioGroup as AudioTrackRadioGroupPrimitive,
  CaptionsRadioGroup as CaptionsRadioGroupPrimitive,
  PlaybackRateRadioGroup as PlaybackRateRadioGroupPrimitive,
  QualityRadioGroup as QualityRadioGroupPrimitive,
} from '@videojs/core/components';
import styles from '../../styles/components/menu.styles';

export function QualityRadioGroup({ children }: { children?: unknown }) {
  return <QualityRadioGroupPrimitive className={styles.radioGroup}>{children}</QualityRadioGroupPrimitive>;
}

export function AudioTrackRadioGroup({ children }: { children?: unknown }) {
  return <AudioTrackRadioGroupPrimitive className={styles.radioGroup}>{children}</AudioTrackRadioGroupPrimitive>;
}

export function PlaybackRateRadioGroup({ children }: { children?: unknown }) {
  return <PlaybackRateRadioGroupPrimitive className={styles.radioGroup}>{children}</PlaybackRateRadioGroupPrimitive>;
}

export function CaptionsRadioGroup({ children }: { children?: unknown }) {
  return <CaptionsRadioGroupPrimitive className={styles.radioGroup}>{children}</CaptionsRadioGroupPrimitive>;
}
