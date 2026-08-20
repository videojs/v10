import { describe, expect, it } from 'vitest';
import { translateText } from '../translate-text';
import { createTranslator } from '../translator';

const greetingText = {
  key: 'greeting',
  text: 'Hello {name}',
} as const;

describe('translateText', () => {
  it('accepts params without a translator', () => {
    expect(translateText(greetingText, { name: 'Avery' })).toBe('Hello Avery');
  });

  it('accepts a translator and params', () => {
    const translator = createTranslator({ greeting: 'Hi {name}' }, 'en');

    expect(translateText(greetingText, translator, { name: 'Avery' })).toBe('Hi Avery');
  });

  it('accepts explicit undefined for the optional translator', () => {
    expect(translateText(greetingText, undefined, { name: 'Avery' })).toBe('Hello Avery');
  });
});
