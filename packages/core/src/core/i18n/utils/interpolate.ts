import type { TextParams } from '../text';

const PLACEHOLDER = /\{([^{}]+)\}/g;

export function interpolate(template: string, params?: TextParams): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER, (match, name: string) => {
    return Object.hasOwn(params, name) ? String(params[name]) : match;
  });
}
