import {
  type ResolveElementContext,
  type ResolveElementResult,
  type StyleProgram,
  tailwind,
} from '@videojs/compiler/tailwind';

export type SkinStyleTarget = { style: 'tailwind' } | { style: 'css'; program: StyleProgram };

/** Create the shared Tailwind policy for a Skin source target. */
export function skinTailwind(target: SkinStyleTarget) {
  return tailwind(
    target.style === 'tailwind'
      ? { mode: 'inline' }
      : {
          mode: 'extract',
          program: target.program,
          resolve: {
            element: resolveSkinStyle,
            token: resolveSkinStyle,
          },
        }
  );
}

/** Map canonical style tokens and fallback elements to public classes and role stylesheets. */
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
