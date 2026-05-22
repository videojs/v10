import { describe, expect, it } from 'vitest';

import { createTranslator, translations } from '../../i18n';
import { resolveControlAttrs } from '../resolve-control-attrs';

describe('resolveControlAttrs', () => {
  const translator = createTranslator(translations, 'en');

  it('resolves aria-label and aria-valuetext with params', () => {
    const core = {
      getAttrs: () => ({
        role: 'slider',
        'aria-label': 'volume',
        'aria-valuetext': 'volumeSliderValueTextMuted',
      }),
      getValueTextParams: () => ({ percent: '50%' }),
    };

    expect(resolveControlAttrs(translator, core, {})).toEqual({
      role: 'slider',
      'aria-label': 'Volume',
      'aria-valuetext': '50%, muted',
    });
  });

  it('resolves time slider range valuetext', () => {
    const core = {
      getAttrs: () => ({
        'aria-valuetext': 'timeSliderValueTextRange',
      }),
      getValueTextParams: () => ({ current: '1 minute', duration: '5 minutes' }),
    };

    expect(resolveControlAttrs(translator, core, {})['aria-valuetext']).toBe('1 minute of 5 minutes');
  });
});
