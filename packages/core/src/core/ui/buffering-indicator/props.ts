import type { NonNullableObject } from '@videojs/utils/types';

export interface BufferingIndicatorProps {
  /** Delay in milliseconds before the indicator becomes visible. */
  delay?: number | undefined;
}

export const BUFFERING_INDICATOR_DEFAULT_PROPS: NonNullableObject<BufferingIndicatorProps> = {
  delay: 500,
};
