import type { SkinDefinition } from '../../canonical/catalog';

/** Derive the classes that identify a generated Skin root. */
export function skinRootClassName(skin: SkinDefinition): string {
  return ['media-skin', skin.scopeClass, `media-theme-${skin.theme}`].join(' ');
}
