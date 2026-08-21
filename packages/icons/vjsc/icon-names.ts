import { camelCase, pascalCase } from '@videojs/utils/string';

const PASCAL_CASE_ICON_NAME_OVERRIDES: Record<string, string> = {
  'airplay-enter': 'AirPlayEnter',
  'airplay-exit': 'AirPlayExit',
};

const CAMEL_CASE_ICON_NAME_OVERRIDES: Record<string, string> = {
  'airplay-enter': 'airPlayEnter',
  'airplay-exit': 'airPlayExit',
};

/** Resolve an SVG filename stem to the identifiers used by every icon target. */
export function iconNames(value: string): { pascal: string; camel: string } {
  return {
    pascal: PASCAL_CASE_ICON_NAME_OVERRIDES[value] ?? pascalCase(value),
    camel: CAMEL_CASE_ICON_NAME_OVERRIDES[value] ?? camelCase(value),
  };
}
