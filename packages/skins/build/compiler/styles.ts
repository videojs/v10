import type { ResolveElementContext, ResolveElementResult } from '@videojs/compiler/tailwind';

/** Map canonical style tokens and fallback element recipes to reviewable role stylesheets. */
export function resolveSkinStyle({ defaultName }: ResolveElementContext): ResolveElementResult {
  return {
    className: `media-${defaultName}`,
    chunk: styleRole(defaultName),
  };
}

function styleRole(name: string): string {
  if (name.includes('button')) return 'buttons';
  if (name.includes('slider') || name.includes('thumbnail') || name === 'spinner-icon') return 'sliders';
  if (name.includes('tooltip') || name.includes('popover') || name === 'surface') return 'popups';
  return 'controls';
}
