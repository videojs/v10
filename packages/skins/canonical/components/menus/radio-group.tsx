import * as $ from '@videojs/core/components';
import styles from '../../styles/components/menu.styles';

export function QualityRadioGroup({ children }: { children?: unknown }) {
  return <$.QualityRadioGroup className={styles.radioGroup}>{children}</$.QualityRadioGroup>;
}

export function AudioTrackRadioGroup({ children }: { children?: unknown }) {
  return <$.AudioTrackRadioGroup className={styles.radioGroup}>{children}</$.AudioTrackRadioGroup>;
}

export function PlaybackRateRadioGroup({ children }: { children?: unknown }) {
  return <$.PlaybackRateRadioGroup className={styles.radioGroup}>{children}</$.PlaybackRateRadioGroup>;
}

export function CaptionsRadioGroup({ children }: { children?: unknown }) {
  return <$.CaptionsRadioGroup className={styles.radioGroup}>{children}</$.CaptionsRadioGroup>;
}
