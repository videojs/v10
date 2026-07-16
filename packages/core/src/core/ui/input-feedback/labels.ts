import type { Translator } from '../../i18n';
import { exitText } from '../../i18n/text/fullscreen';
import {
  captionsOffText,
  captionsOnText,
  exitPipText,
  fullscreenText,
  pausedText,
  pipText,
  playingText,
} from '../../i18n/text/status';
import { labelText, mutedText, valueText } from '../../i18n/text/volume';
import type { InputIndicatorLabels } from './status';

/** Maps i18n indicator keys to {@link InputIndicatorLabels} for status / volume feedback. */
export function createInputIndicatorLabels(translator: Translator): InputIndicatorLabels {
  return {
    muted: translator(mutedText),
    volume: translator(labelText),
    volumeWithValue: (value) => translator(valueText, { value }),
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
