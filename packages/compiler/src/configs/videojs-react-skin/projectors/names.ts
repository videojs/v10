/**
 * Names State Projection
 *
 * Phase 3: Projection (New Architecture)
 * Projects element names from default export
 * Two simple projectors: elementClassName and elementName
 */

import type { StateProjector } from '../../../phases/types';
import { componentNameToClassName, componentNameToSkinElementName } from '../../../utils/component-names';

/**
 * Project element class name from default export
 * Converts React component name to HTML skin class name
 * Removes "Skin" suffix and wraps in MediaSkin...Element pattern
 *
 * @param context - Full categorized context
 * @param _prevState - Previous projection state (unused)
 * @returns Element class name
 *
 * @example
 * projectElementClassName(context, {})
 * // FrostedSkin → "MediaSkinFrostedElement"
 * // MinimalSkin → "MediaSkinMinimalElement"
 * // MySkin → "MediaSkinMyElement"
 */
export const projectElementClassName: StateProjector<string> = (context, _prevState, _config) => {
  return componentNameToClassName(context.defaultExport.componentName);
};

/**
 * Project element tag name from default export
 * Converts React component name to skin custom element tag name
 * Removes "Skin" suffix and converts to kebab-case with media-skin- prefix
 *
 * @param context - Full categorized context
 * @param _prevState - Previous projection state (unused)
 * @returns Element tag name
 *
 * @example
 * projectElementName(context, {})
 * // FrostedSkin → "media-skin-frosted"
 * // MinimalSkin → "media-skin-minimal"
 * // MySkin → "media-skin-my"
 */
export const projectElementName: StateProjector<string> = (context, _prevState, _config) => {
  return componentNameToSkinElementName(context.defaultExport.componentName);
};
