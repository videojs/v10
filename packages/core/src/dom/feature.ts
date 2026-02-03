import { defineSlice } from '@videojs/store';

import type { PlayerTarget } from './media/types';

export const definePlayerFeature = defineSlice<PlayerTarget>();
