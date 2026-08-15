import type { SkinDefinition } from '../../canonical/catalog';

/** Derive the classes that identify a generated Skin root. */
export function skinRootClassName(skin: SkinDefinition): string {
  return ['media-skin', skin.scopeClass, `media-theme-${skin.theme}`].join(' ');
}

/** Derive the canonical root component export from a catalog Skin name. */
export function skinRootComponentName(skin: SkinDefinition): string {
  return `${skin.name.replace(/(^|-)([a-z0-9])/g, (_, _separator, character: string) => character.toUpperCase())}Skin`;
}
