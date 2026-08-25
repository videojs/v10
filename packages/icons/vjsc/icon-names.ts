import { camelCase, pascalCase } from '@videojs/utils/string';

/** Resolve an SVG filename stem to the identifiers used by every icon target. */
export function iconNames(value: string) {
  if (value === 'airplay-enter') return { pascal: 'AirPlayEnter', camel: 'airPlayEnter' };
  if (value === 'airplay-exit') return { pascal: 'AirPlayExit', camel: 'airPlayExit' };
  return {
    pascal: pascalCase(value),
    camel: camelCase(value),
  } satisfies { pascal: string; camel: string };
}
