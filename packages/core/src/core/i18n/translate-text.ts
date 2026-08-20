import { resolveText } from './resolve-text';
import type { Text, TextParams } from './text';
import type { Translator } from './translator';
import { interpolate } from './utils';

export function translateText(text: Text | string, params?: TextParams): string;
export function translateText(text: Text | string, translator: Translator | undefined, params?: TextParams): string;
export function translateText(
  text: Text | string,
  translatorOrParams?: Translator | TextParams,
  params?: TextParams
): string {
  if (typeof text === 'string') return text;
  if (typeof translatorOrParams === 'function') {
    return translatorOrParams(text, params);
  }
  return interpolate(resolveText(text), translatorOrParams ?? params);
}
