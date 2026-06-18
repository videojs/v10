import type { Translator } from '../../i18n/types';
import type { InputIndicatorLabels } from './status';

/** Maps i18n indicator keys to {@link InputIndicatorLabels} for status / volume feedback. */
export function createInputIndicatorLabels(translator: Translator): InputIndicatorLabels {
  return {
    muted: translator('indicatorMuted'),
    volume: translator('indicatorVolume'),
    volumeWithValue: (value) => translator('indicatorVolumeWithValue', { value }),
    captionsOn: translator('indicatorCaptionsOn'),
    captionsOff: translator('indicatorCaptionsOff'),
    paused: translator('indicatorPaused'),
    playing: translator('indicatorPlaying'),
    fullscreen: translator('indicatorFullscreen'),
    exitFullscreen: translator('indicatorExitFullscreen'),
    pictureInPicture: translator('indicatorPictureInPicture'),
    exitPictureInPicture: translator('indicatorExitPictureInPicture'),
  };
}
