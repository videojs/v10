import { defineSlice } from '@videojs/store';

import type { PlayerTarget } from './media/types';

/** Factory for player feature slices typed against {@link PlayerTarget}. */
export const definePlayerFeature = defineSlice<PlayerTarget>();
