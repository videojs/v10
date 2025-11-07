/**
 * Example: Minimal Skin
 *
 * Simple skin with basic controls for testing compilation
 * Uses actual @videojs/react package exports
 */

import type { PropsWithChildren } from 'react';
import { MediaContainer, PlayButton, TimeSlider } from '@videojs/react';

const styles = {
  Container: 'container',
  Controls: 'controls',
  PlayButton: 'play-button',
  SliderRoot: 'slider-root',
  SliderTrack: 'slider-track',
  SliderProgress: 'slider-progress',
};

export default function SimpleSkin({ children }: PropsWithChildren): JSX.Element {
  return (
    <MediaContainer className={styles.Container}>
      {children}
      <div className={styles.Controls}>
        <PlayButton className={styles.PlayButton} />
        <TimeSlider.Root className={styles.SliderRoot}>
          <TimeSlider.Track className={styles.SliderTrack}>
            <TimeSlider.Progress className={styles.SliderProgress} />
          </TimeSlider.Track>
        </TimeSlider.Root>
      </div>
    </MediaContainer>
  );
}
