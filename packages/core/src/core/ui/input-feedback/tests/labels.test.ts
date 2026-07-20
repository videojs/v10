import { describe, expect, it } from 'vitest';
import { createTranslator, type Translations } from '../../../i18n';

import { createInputIndicatorLabels } from '../labels';

describe('createInputIndicatorLabels', () => {
  it('maps indicator phrases to input feedback labels', () => {
    const labels = createInputIndicatorLabels(
      createTranslator(
        {
          Muted: 'Muet',
          Volume: 'Volume',
          'Volume {value}': 'Volume {value}',
          'Captions on': 'Sous-titres activés',
          'Captions off': 'Sous-titres désactivés',
          Paused: 'En pause',
          Playing: 'Lecture en cours',
          Fullscreen: 'Plein écran',
          'Exit fullscreen': 'Quitter le plein écran',
          'Picture in picture': 'Image dans l’image',
          'Exit picture in picture': 'Quitter l’image dans l’image',
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
