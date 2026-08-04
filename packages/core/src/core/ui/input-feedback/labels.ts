import { DEFAULT_LOCALE } from '@videojs/utils/i18n';
import { formatTimeAsPhrase } from '@videojs/utils/time';
import type { Translator } from '../../i18n';
import { exitText } from '../../i18n/text/fullscreen';
import { rateText } from '../../i18n/text/playback';
import {
  captionsOffText,
  captionsOnText,
  exitPipText,
  fullscreenText,
  pausedText,
  pipText,
  playingText,
  seekedToText,
} from '../../i18n/text/status';
import { labelText, mutedText, valueText } from '../../i18n/text/volume';
import type { InputIndicatorLabels, StatusAnnouncerLabels } from './status';

/** Maps i18n indicator keys to {@link InputIndicatorLabels} for status / volume feedback. */
export function createInputIndicatorLabels(translator: Translator): InputIndicatorLabels {
  return {
    muted: translator(mutedText),
    volume: translator(labelText),
    captionsOn: translator(captionsOnText),
    captionsOff: translator(captionsOffText),
    paused: translator(pausedText),
    playing: translator(playingText),
    fullscreen: translator(fullscreenText),
    exitFullscreen: translator(exitText),
    pictureInPicture: translator(pipText),
    exitPictureInPicture: translator(exitPipText),
  };
}

/** Adds the parameterized labels used by status announcements. */
export function createStatusAnnouncerLabels(translator: Translator, locale = DEFAULT_LOCALE): StatusAnnouncerLabels {
  return {
    ...createInputIndicatorLabels(translator),
    volumeWithValue: (value) => translator(valueText, { value }),
    seekedTo: (time) => translator(seekedToText, { time: formatTimeAsPhrase(time, { locale }) }),
    playbackRate: (rate) => translator(rateText, { rate }),
  };
}
