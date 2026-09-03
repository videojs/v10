import type { Platform, SkinSource, Styling } from '@app/types';

/**
 * Authored skins compile only where `packages/skins` is checked out; a StackBlitz preview has the published packages
 * only.
 */
export const WORKSPACE_SKINS: boolean = __WORKSPACE_SKINS__;

/**
 * Registry skins exist where setup could install them: always in the workspace, elsewhere only if the hosted registry
 * answered.
 */
export const REGISTRY_SKINS: boolean = __REGISTRY_SKINS__;

/**
 * The stylings a skin source offers on a platform. The framework packages ship CSS. The registry publishes CSS for both
 * platforms and Tailwind for React only, so the html registry install is a CSS skin. The authored sources compile to
 * either. The CDN bundles are the packages' CSS skins.
 */
export function skinStylings(platform: Platform, source: SkinSource): readonly Styling[] {
  if (platform === 'cdn') return ['css'];

  switch (source) {
    case 'package':
      return ['css'];
    case 'registry':
      return platform === 'react' ? ['css', 'tailwind'] : ['css'];
    case 'authored':
      return ['css', 'tailwind'];
  }
}

/** Whether a source can be loaded at all on a platform, regardless of styling. */
export function skinSourceAvailable(source: SkinSource, platform: Platform): boolean {
  if (platform === 'cdn') return source === 'package';

  switch (source) {
    case 'package':
      return true;
    case 'registry':
      return REGISTRY_SKINS;
    case 'authored':
      return WORKSPACE_SKINS;
  }
}

/**
 * Where skins come from when nothing was asked for: the framework packages for CSS, and for Tailwind the registry on
 * React or the authored sources on html, the only place an html Tailwind skin exists.
 */
export function defaultSkinSource(platform: Platform, styling: Styling): SkinSource {
  if (styling === 'css') return 'package';

  return platform === 'html' ? 'authored' : 'registry';
}

/** Whether any loadable source offers Tailwind on the platform. */
export function tailwindSkinAvailable(platform: Platform): boolean {
  return (['package', 'registry', 'authored'] as const).some(
    (source) => skinSourceAvailable(source, platform) && skinStylings(platform, source).includes('tailwind')
  );
}
