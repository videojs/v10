import { TimeSlider } from '@videojs/react-preview';
import styles from './TimeSlider.module.css';

/**
 * Basic TimeSlider example demonstrating:
 * - Progress and pointer visualization
 * - Horizontal orientation
 * - CSS Modules for scoped styling
 * - Data attribute selectors for state-based styling
 *
 * Note: This component must be used within a VideoProvider context.
 * See the usage example in the documentation.
 */
export function BasicTimeSlider() {
  return (
    <TimeSlider.Root className={styles.root} orientation="horizontal">
      <TimeSlider.Track className={styles.track}>
        <TimeSlider.Progress className={styles.progress} />
        <TimeSlider.Pointer className={styles.pointer} />
      </TimeSlider.Track>
      <TimeSlider.Thumb className={styles.thumb} />
    </TimeSlider.Root>
  );
}
