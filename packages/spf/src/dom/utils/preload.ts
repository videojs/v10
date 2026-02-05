/**
 * Preload State Reader
 *
 * Utilities for reading and normalizing HTMLMediaElement preload attribute.
 */

/**
 * Valid preload attribute values.
 */
export type PreloadValue = 'none' | 'metadata' | 'auto';

/**
 * Get the preload state from a media element.
 *
 * Returns the normalized preload value:
 * - 'none': Don't preload anything
 * - 'metadata': Preload only metadata (duration, dimensions)
 * - 'auto': Preload as much as possible
 *
 * Defaults to 'metadata' when:
 * - Attribute is not set (empty string)
 * - Attribute has invalid value
 *
 * This matches the HTML spec recommendation for default behavior.
 *
 * @param element - HTMLMediaElement (video or audio)
 * @returns Normalized preload value
 *
 * @example
 * const video = document.querySelector('video');
 * const preload = getPreload(video);
 * if (preload === 'none') {
 *   // Don't preload anything
 * }
 */
export function getPreload(element: HTMLMediaElement): PreloadValue {
  const value = element.preload.toLowerCase().trim();

  // Validate and return known values
  if (value === 'none' || value === 'metadata' || value === 'auto') {
    return value;
  }

  // Default to metadata for empty or invalid values (spec recommendation)
  return 'metadata';
}
