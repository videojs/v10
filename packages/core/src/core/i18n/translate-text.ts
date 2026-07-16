import { resolveText } from './resolve-text';
import type { Text, TextParams } from './text';
import type { Translator } from './translator';
import { interpolate } from './utils';

export function translateText(text: Text | string, translator?: Translator, params?: TextParams): string {
  if (typeof text === 'string') return text;
  return translator ? translator(text, params) : interpolate(resolveText(text), params);
}
