import { PlayButton } from '@videojs/react-preview';
import { PauseIcon, PlayIcon } from '@videojs/react-preview/icons';
import styles from './PlayButton.module.css';

/**
 * Basic PlayButton example demonstrating:
 * - Icon switching based on paused state
 * - CSS Modules for scoped styling
 * - Data attribute selectors for state-based styling
 *
 * Note: This component must be used within a VideoProvider context.
 * See the usage example in the documentation.
 */
export function BasicPlayButton() {
  return (
    <PlayButton className={styles.button}>
      <PlayIcon className={styles.playIcon} />
      <PauseIcon className={styles.pauseIcon} />
    </PlayButton>
  );
}
