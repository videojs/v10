import type { SkinComponentMeta } from '../../meta';
import { defineRenderTarget } from '../../render-target';
import styles from '../../styles/sliders/slider.styles';

/** Shared slider track. */
export const SliderTrack = defineRenderTarget('SliderTrack', [styles.track]);

/** Shared slider fill. */
export const SliderFill = defineRenderTarget('SliderFill', [styles.fill]);

/** Shared slider buffer. */
export const SliderBuffer = defineRenderTarget('SliderBuffer', [styles.buffer]);

/** Shared slider thumb. */
export const SliderThumb = defineRenderTarget('SliderThumb', [styles.thumb]);

export const meta = {
  name: 'slider',
  type: 'component',
  title: 'Slider Parts',
  description: 'Shared styled parts for slider tracks, progress layers, and thumbs.',
} as const satisfies SkinComponentMeta;
