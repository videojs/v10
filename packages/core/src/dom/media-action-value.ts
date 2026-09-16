import { isUndefined } from '@videojs/utils/predicate';

import { DEFAULT_SEEK_STEP, DEFAULT_VOLUME_STEP } from '../core/ui/constants';

export function getMediaInputActionValue(
  action: string,
  key: string | undefined,
  value?: number | undefined
): number | undefined {
  if (!isUndefined(value)) return value;

  const normalizedKey = key?.toLowerCase();

  if (action === 'seekStep') {
    return normalizedKey === 'arrowleft' || normalizedKey === 'j' ? -DEFAULT_SEEK_STEP : DEFAULT_SEEK_STEP;
  }

  if (action === 'volumeStep') {
    const step = DEFAULT_VOLUME_STEP / 100;

    return normalizedKey === 'arrowdown' ? -step : step;
  }

  return undefined;
}
