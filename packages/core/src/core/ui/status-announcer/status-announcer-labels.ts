import { DEFAULT_LOCALE } from '@videojs/utils/i18n';
import { formatTimeAsPhrase } from '@videojs/utils/time';

import type { Translator } from '../../i18n';
import { translateText } from '../../i18n';
import { rateText } from '../../i18n/text/playback';
import { seekedToText } from '../../i18n/text/status';
import { valueText } from '../../i18n/text/volume';
import {
  createInputIndicatorLabels,
  DEFAULT_INPUT_INDICATOR_LABELS,
  type InputIndicatorLabels,
} from '../indicator/indicator-labels';

export interface StatusAnnouncerLabels extends InputIndicatorLabels {
  volumeWithValue: (value: string) => string;
  seekedTo: (time: number) => string;
  playbackRate: (rate: string) => string;
}

export const DEFAULT_STATUS_ANNOUNCER_LABELS: StatusAnnouncerLabels = {
  ...DEFAULT_INPUT_INDICATOR_LABELS,
  volumeWithValue: (value) => translateText(valueText, { value }),
  seekedTo: (time) => translateText(seekedToText, { time: formatTimeAsPhrase(time) }),
  playbackRate: (rate) => translateText(rateText, { rate }),
};

/** Adds the parameterized labels used by status announcements. */
export function createStatusAnnouncerLabels(translator: Translator, locale = DEFAULT_LOCALE): StatusAnnouncerLabels {
  return {
    ...createInputIndicatorLabels(translator),
    volumeWithValue: (value) => translator(valueText, { value }),
    seekedTo: (time) => translator(seekedToText, { time: formatTimeAsPhrase(time, { locale }) }),
    playbackRate: (rate) => translator(rateText, { rate }),
  };
}
