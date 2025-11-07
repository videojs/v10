/**
 * Component Name Utilities
 *
 * Utilities for converting between React component names and HTML element names
 */

import { toKebabCase } from './string-transforms';

/**
 * Convert React component name to HTML custom element name
 * Converts PascalCase to kebab-case with media- prefix
 * Handles compound components (TimeSlider.Root, TimeSlider.Track)
 *
 * @param componentName - React component name (e.g., 'PlayButton', 'TimeSlider.Root')
 * @returns HTML element name (e.g., 'media-play-button', 'media-time-slider')
 *
 * @example
 * componentNameToElementName('PlayButton') → 'media-play-button'
 * componentNameToElementName('MediaContainer') → 'media-container'
 * componentNameToElementName('TimeSlider') → 'media-time-slider'
 * componentNameToElementName('TimeSlider.Root') → 'media-time-slider' (Root removed)
 * componentNameToElementName('TimeSlider.Track') → 'media-time-slider-track'
 */
export function componentNameToElementName(componentName: string): string {
  // Handle compound components (e.g., 'TimeSlider.Root', 'TimeSlider.Track')
  if (componentName.includes('.')) {
    const parts = componentName.split('.', 2);
    const base = parts[0];
    const member = parts[1];

    // Both parts must exist for valid compound component
    if (!base || !member) {
      throw new Error(`Invalid compound component name: ${componentName}`);
    }

    // Convert base to kebab-case
    const baseKebab = toKebabCase(base);

    // Root member maps to base element (no suffix)
    if (member === 'Root') {
      return baseKebab.startsWith('media-') ? baseKebab : `media-${baseKebab}`;
    }

    // Other members become suffixes
    const memberKebab = toKebabCase(member);

    const fullName = `${baseKebab}-${memberKebab}`;
    return fullName.startsWith('media-') ? fullName : `media-${fullName}`;
  }

  // Simple component: convert PascalCase to kebab-case
  const kebab = toKebabCase(componentName);

  // Add media- prefix if not already present
  if (kebab.startsWith('media-')) {
    return kebab;
  }

  return `media-${kebab}`;
}

/**
 * Derive skin class name from component name
 * Converts React component name to HTML skin class name
 *
 * @param componentName - React component name (e.g., 'FrostedSkin', 'MinimalSkin')
 * @returns Class name for skin element (e.g., 'MediaSkinFrostedElement', 'MediaSkinMinimalElement')
 *
 * @example
 * componentNameToClassName('FrostedSkin') → 'MediaSkinFrostedElement'
 * componentNameToClassName('MinimalSkin') → 'MediaSkinMinimalElement'
 * componentNameToClassName('MySkin') → 'MediaSkinMyElement'
 */
export function componentNameToClassName(componentName: string): string {
  // Remove "Skin" suffix if present
  const baseName = componentName.endsWith('Skin')
    ? componentName.slice(0, -4)
    : componentName;

  return `MediaSkin${baseName}Element`;
}

/**
 * Derive custom element name for skin from component name
 * Converts React component name to skin custom element tag name
 *
 * @param componentName - React component name (e.g., 'FrostedSkin', 'MinimalSkin')
 * @returns Custom element name (e.g., 'media-skin-frosted', 'media-skin-minimal')
 *
 * @example
 * componentNameToSkinElementName('FrostedSkin') → 'media-skin-frosted'
 * componentNameToSkinElementName('MinimalSkin') → 'media-skin-minimal'
 * componentNameToSkinElementName('MySkin') → 'media-skin-my'
 */
export function componentNameToSkinElementName(componentName: string): string {
  // Remove "Skin" suffix if present
  const baseName = componentName.endsWith('Skin')
    ? componentName.slice(0, -4)
    : componentName;

  // Convert to kebab-case
  const kebab = toKebabCase(baseName);

  return `media-skin-${kebab}`;
}
