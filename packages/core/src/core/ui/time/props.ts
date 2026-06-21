import type { NonNullableObject } from '@videojs/utils/types';

import type { TimeState } from './time-core';

/** Time display type. */
export type TimeType = 'current' | 'duration' | 'remaining';

export interface TimeProps {
  /** Which time value to display. */
  type?: TimeType | undefined;
  /** Symbol prepended to remaining time. */
  negativeSign?: string | undefined;
  /** Custom label for accessibility. */
  label?: string | ((state: TimeState) => string) | undefined;
}

export const TIME_DEFAULT_PROPS: NonNullableObject<TimeProps> = {
  type: 'current',
  negativeSign: '-',
  label: '',
};
