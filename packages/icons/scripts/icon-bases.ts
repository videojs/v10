import { camelCase, pascalCase } from '@videojs/utils/string';

/*
 * Per-icon identifier overrides. Use when an SVG filename can't be split
 * into the desired PascalCase or CamelCase form alone
 * e.g. `airplay` has no separator between `air` and `play`,
 * so `pascalCase('airplay-enter')` yields `AirplayEnter`, not `AirPlayEnter`.
 *
 * Key: SVG filename stem.
 * Value: the PascalCase base (no `Icon` suffix).
 */
const PASCAL_CASE_ICON_NAME_OVERRIDES: Record<string, string> = {
  'airplay-enter': 'AirPlayEnter',
  'airplay-exit': 'AirPlayExit',
};

const CAMEL_CASE_ICON_NAME_OVERRIDES: Record<string, string> = {
  'airplay-enter': 'airPlayEnter',
  'airplay-exit': 'airPlayExit',
};

/**
 * Resolves an SVG filename stem to its PascalCase and camelCase identifier
 * bases checking overrides first.
 */
export function iconBases(varName: string): { pascal: string; camel: string } {
  const pascal = PASCAL_CASE_ICON_NAME_OVERRIDES[varName] ?? pascalCase(varName);
  const camel = CAMEL_CASE_ICON_NAME_OVERRIDES[varName] ?? camelCase(varName);
  return { pascal, camel };
}
