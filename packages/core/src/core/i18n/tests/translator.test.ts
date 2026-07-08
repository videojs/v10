import { describe, expect, it } from 'vitest';

import { createTranslator } from '../translator';

describe('createTranslator', () => {
  it('resolves a simple key', () => {
    const t = createTranslator({ Play: 'Start' }, 'en');
    expect(t('Play')).toBe('Start');
  });

  it('interpolates {param} placeholders', () => {
    const t = createTranslator({ 'Seek forward {seconds} seconds': 'Jump {seconds} s' }, 'en');
    expect(t('Seek forward {seconds} seconds', { seconds: 10 })).toBe('Jump 10 s');
  });

  it('falls back to the source phrase when no translation is defined', () => {
    const t = createTranslator({}, 'en');
    expect(t('Play')).toBe('Play');
  });

  it('interpolates the source phrase fallback', () => {
    const t = createTranslator({}, 'en');
    expect(t('Seek forward {seconds} seconds', { seconds: 10 })).toBe('Seek forward 10 seconds');
  });

  it('keeps tokens that are not supplied as params', () => {
    const t = createTranslator({ Play: 'Hi {name}' }, 'en');
    expect(t('Play')).toBe('Hi {name}');
  });

  it('coerces numeric params to strings', () => {
    const t = createTranslator({ 'Playback rate {rate}': 'Speed {rate}' }, 'en');
    expect(t('Playback rate {rate}', { rate: 1.25 })).toBe('Speed 1.25');
  });
});
