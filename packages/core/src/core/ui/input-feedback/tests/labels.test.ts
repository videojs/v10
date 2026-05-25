import { describe, expect, it } from 'vitest';
import { createTranslator, type Translations } from '../../../i18n';

import { createInputIndicatorLabels } from '../labels';

describe('createInputIndicatorLabels', () => {
  it('maps indicator translation keys to input feedback labels', () => {
    const labels = createInputIndicatorLabels(
      createTranslator(
        {
          indicatorMuted: 'Muet',
          indicatorVolume: 'Volume',
          indicatorVolumeWithValue: 'Volume {value}',
          indicatorCaptionsOn: 'Sous-titres activés',
          indicatorCaptionsOff: 'Sous-titres désactivés',
          indicatorPaused: 'En pause',
          indicatorPlaying: 'Lecture en cours',
          indicatorFullscreen: 'Plein écran',
          indicatorExitFullscreen: 'Quitter le plein écran',
          indicatorPictureInPicture: 'Image dans l’image',
          indicatorExitPictureInPicture: 'Quitter l’image dans l’image',
        } satisfies Translations,
        'fr'
      )
    );

    expect(labels.captionsOn).toBe('Sous-titres activés');
    expect(labels.captionsOff).toBe('Sous-titres désactivés');
    expect(labels.paused).toBe('En pause');
    expect(labels.volumeWithValue('80%')).toBe('Volume 80%');
  });
});
