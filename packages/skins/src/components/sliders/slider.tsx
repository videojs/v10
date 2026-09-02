import { defineRenderTarget } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/sliders/slider.styles';

/** Shared slider track. */
export const SliderTrack = defineRenderTarget([styles.track]);

/** Shared slider fill. */
export const SliderFill = defineRenderTarget([styles.fill]);

/** Shared slider buffer. */
export const SliderBuffer = defineRenderTarget([styles.buffer]);

/** Shared slider thumb. */
export const SliderThumb = defineRenderTarget([styles.thumb]);

export const meta = {
  name: 'slider',
  type: 'component',
  title: 'Slider Parts',
  description: 'Shared styled parts for slider tracks, progress layers, and thumbs.',
} as const satisfies SkinComponentMeta;
