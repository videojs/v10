import { FullscreenButton } from '@videojs/react-preview';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@videojs/react-preview/icons';
import styles from './FullscreenButton.module.css';

/**
 * Basic FullscreenButton example demonstrating:
 * - Icon switching based on fullscreen state
 * - Data attribute state selectors
 * - Enter/exit fullscreen functionality
 *
 * Note: This component must be used within a VideoProvider context.
 * See the usage example in the documentation.
 */
export function BasicFullscreenButton() {
  return (
    <FullscreenButton className={styles.button}>
      <FullscreenEnterIcon className={styles.fullscreenEnterIcon} />
      <FullscreenExitIcon className={styles.fullscreenExitIcon} />
    </FullscreenButton>
  );
}
