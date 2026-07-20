import type { Translator } from '../../i18n/types';
import type { InputIndicatorLabels } from './status';

/** Maps i18n indicator keys to {@link InputIndicatorLabels} for status / volume feedback. */
export function createInputIndicatorLabels(translator: Translator): InputIndicatorLabels {
  return {
    muted: translator('Muted'),
    volume: translator('Volume'),
    volumeWithValue: (value) => translator('Volume {value}', { value }),
    captionsOn: translator('Captions on'),
    captionsOff: translator('Captions off'),
    paused: translator('Paused'),
    playing: translator('Playing'),
    fullscreen: translator('Fullscreen'),
    exitFullscreen: translator('Exit fullscreen'),
    pictureInPicture: translator('Picture in picture'),
    exitPictureInPicture: translator('Exit picture in picture'),
  };
}
