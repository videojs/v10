import type { AnySupportedStyle, Guide, Section, Sidebar, SupportedFramework, SupportedStyle } from '@/types/docs';

import { sidebar } from '../../docs.config';
import { FRAMEWORK_STYLES, isSection, isValidStyleForFramework } from '../../types/docs';

/**
 * Check if an item (Guide or Section) should be shown based on framework and style.
 * If no frameworks are specified, the item is visible to all frameworks.
 * If no styles are specified, the item is visible to all styles.
 *
 * @param item - The guide or section to check
 * @param framework - The currently selected framework
 * @param style - The currently selected style
 * @param isDev - Whether in development mode (defaults to import.meta.env.DEV)
 * @returns true if the item should be visible
 */
export function isItemVisible<F extends SupportedFramework>(
  item: Guide | Section,
  framework: F,
  style: SupportedStyle<F>,
  isDev: boolean = import.meta.env.DEV
): boolean {
  // Filter out dev-only items in production
  if (item.devOnly && !isDev) {
    return false;
  }

  const frameworkMatch = !item.frameworks || item.frameworks.includes(framework);
  const styleMatch = !item.styles || item.styles.includes(style as AnySupportedStyle);
  return frameworkMatch && styleMatch;
}

/**
 * Filter sidebar items based on selected framework and style.
 * Recursively filters sections and guides to only include
 * those that are visible for the given framework and style combination.
 * Removes empty sections after filtering.
 *
 * @param framework - The framework to filter for
 * @param style - The style to filter for
 * @param sidebarToFilter - Optional sidebar to filter (defaults to main sidebar config)
 * @param isDev - Whether in development mode (defaults to import.meta.env.DEV)
 * @returns A new filtered sidebar with only visible content
 */
export function filterSidebar<F extends SupportedFramework>(
  framework: F,
  style: SupportedStyle<F>,
  sidebarToFilter: Sidebar = sidebar,
  isDev: boolean = import.meta.env.DEV
): Sidebar {
  return sidebarToFilter
    .filter((item) => isItemVisible(item, framework, style, isDev))
    .map((item) => {
      if (isSection(item)) {
        const filteredContents = filterSidebar(framework, style, item.contents, isDev);
        return {
          ...item,
          contents: filteredContents,
        };
      }
      // It's a Guide, return as-is
      return item;
    })
    .filter((item) => {
      // Remove sections with no contents after filtering
      if (isSection(item)) {
        return item.contents.length > 0;
      }
      // Keep all guides
      return true;
    });
}

/**
 * Find the first guide in the sidebar that matches the framework and style.
 * Recursively searches through sections and guides in order,
 * returning the slug of the first visible guide found.
 * A test validates that this function always returns a guide for any valid framework/style combo,
 * since the sidebar always includes at least one guide that has no fw/style restrictions.
 *
 * @param framework - The framework to match
 * @param style - The style to match
 * @param sidebarToSearch - Optional sidebar to search (defaults to main sidebar config)
 * @param isDev - Whether in development mode (defaults to import.meta.env.DEV)
 * @returns The slug of the first visible guide, or null if none found
 */
export function findFirstGuide<F extends SupportedFramework>(
  framework: F,
  style: SupportedStyle<F>,
  sidebarToSearch: Sidebar = sidebar,
  isDev: boolean = import.meta.env.DEV
): string {
  if (!isValidStyleForFramework(framework, style as AnySupportedStyle)) {
    throw new Error(`Invalid style "${style}" for framework "${framework}".`);
  }

  for (const item of sidebarToSearch) {
    if (!isItemVisible(item, framework, style, isDev)) {
      continue;
    }

    if (isSection(item)) {
      // Recursively search section contents
      const guide = findFirstGuide(framework, style, item.contents, isDev);
      if (guide) return guide;
    } else {
      // It's a Guide, return its slug
      return item.slug;
    }
  }

  throw new Error(
    `No guide found for valid combination framework "${framework}" and style "${style}". This should never happen.`
  );
}

/**
 * Get all guide slugs from a sidebar (recursively).
 * This function extracts ALL slugs from the provided sidebar structure,
 * including those in nested sections. It does not perform any filtering.
 * Typically used with an already-filtered sidebar to get allowed slugs.
 *
 * @param sidebarToExtract - Optional sidebar to extract from (defaults to main sidebar config)
 * @returns An array of all guide slugs found in the sidebar
 */
export function getAllGuideSlugs(sidebarToExtract: Sidebar = sidebar): string[] {
  const slugs: string[] = [];

  for (const item of sidebarToExtract) {
    if (isSection(item)) {
      // Recursively get slugs from section contents
      slugs.push(...getAllGuideSlugs(item.contents));
    } else {
      // It's a Guide, add its slug
      slugs.push(item.slug);
    }
  }

  return slugs;
}

/**
 * Find a guide by its slug in the sidebar (recursively).
 *
 * @param slug - The slug to find
 * @param sidebarToSearch - Optional sidebar to search (defaults to main sidebar config)
 * @returns The guide object if found, null otherwise
 */
export function findGuideBySlug(slug: string, sidebarToSearch: Sidebar = sidebar): Guide | null {
  for (const item of sidebarToSearch) {
    if (isSection(item)) {
      // Recursively search section contents
      const guide = findGuideBySlug(slug, item.contents);
      if (guide) return guide;
    } else if (item.slug === slug) {
      // Found the guide
      return item;
    }
  }
  return null;
}

/**
 * Get the ancestor section labels for a guide by its slug.
 * Returns an array of sidebarLabel strings for all ancestor sections,
 * in order from outermost to innermost. If the guide has no ancestors
 * (i.e., it's at the top level) or if the guide is not found, returns an empty array.
 *
 * @param slug - The slug of the guide to find
 * @param sidebarToSearch - Optional sidebar to search (defaults to main sidebar config)
 * @returns An array of ancestor section labels, or empty array if none or guide not found
 */
export function getSectionsForGuide(slug: string, sidebarToSearch: Sidebar = sidebar): string[] {
  function findInSidebar(items: Sidebar, path: string[]): string[] | null {
    for (const item of items) {
      if (isSection(item)) {
        // Recursively search section contents with updated path
        const result = findInSidebar(item.contents, [...path, item.sidebarLabel]);
        if (result !== null) return result;
      } else if (item.slug === slug) {
        // Found the guide, return the accumulated path
        return path;
      }
    }
    return null;
  }

  return findInSidebar(sidebarToSearch, []) ?? [];
}

/**
 * Get valid styles for a guide, optionally filtered by framework.
 *
 * When framework is provided:
 * - First checks if guide supports the framework (returns empty array if not)
 * - Returns the intersection of styles the framework supports and styles the guide supports
 * - If the guide has no style restrictions, returns all framework styles
 *
 * When framework is omitted:
 * - Returns all styles the guide supports
 * - If the guide has no style restrictions, returns all possible styles across all frameworks
 *
 * @param guide - The guide to check
 * @param framework - Optional framework to check against
 * @returns Array of valid styles for this guide (in the specified framework, if provided)
 */
export function getValidStylesForGuide<F extends SupportedFramework>(
  guide: Guide,
  framework?: F
): F extends undefined ? readonly AnySupportedStyle[] : readonly SupportedStyle<F>[];
export function getValidStylesForGuide<F extends SupportedFramework>(
  guide: Guide,
  framework?: F
): readonly AnySupportedStyle[] {
  // If no framework specified, return all styles the guide supports (or all styles if no restrictions)
  if (framework === undefined) {
    if (!guide.styles) {
      // Guide has no style restrictions, return all possible styles (deduplicated)
      const allStyles = Object.values(FRAMEWORK_STYLES).flat();
      return [...new Set(allStyles)] as readonly AnySupportedStyle[];
    }
    return guide.styles;
  }

  // Framework specified - first check if guide supports this framework
  if (guide.frameworks && !guide.frameworks.includes(framework)) {
    // Guide doesn't support this framework, return empty array
    return [];
  }

  // Framework specified, filter by framework styles
  const frameworkStyles = FRAMEWORK_STYLES[framework];

  // If guide has no style restrictions, all framework styles are valid
  if (!guide.styles) {
    return frameworkStyles;
  }

  // Return intersection of framework styles and guide styles
  return frameworkStyles.filter((s) => guide.styles!.includes(s));
}

/**
 * Get all valid frameworks for a guide.
 * Returns the frameworks the guide is restricted to, or all frameworks if it has no restrictions.
 *
 * @param guide - The guide to check
 * @returns Array of valid frameworks for this guide
 */
export function getValidFrameworksForGuide(guide: Guide): SupportedFramework[] {
  // If guide has no framework restrictions, all frameworks are valid
  if (!guide.frameworks) {
    return Object.keys(FRAMEWORK_STYLES) as SupportedFramework[];
  }

  return guide.frameworks;
}

/**
 * Get the previous and next guides for a given guide slug.
 * Returns the adjacent guides in the filtered sidebar for the given framework and style.
 *
 * @param currentSlug - The slug of the current guide
 * @param framework - The framework to filter for
 * @param style - The style to filter for
 * @returns Object with prev and next guides (null if at start/end)
 */
export function getAdjacentGuides<F extends SupportedFramework>(
  currentSlug: string,
  framework: F,
  style: SupportedStyle<F>
): { prev: Guide | null; next: Guide | null } {
  // Get the filtered sidebar for this framework/style combination
  const filteredSidebar = filterSidebar(framework, style);

  // Flatten the sidebar to get all guides in order
  const allGuides = getAllGuideSlugs(filteredSidebar);

  // Find the current guide's index
  const currentIndex = allGuides.indexOf(currentSlug);

  if (currentIndex === -1) {
    // Current guide not found in filtered sidebar
    return { prev: null, next: null };
  }

  // Get prev and next slugs
  const prevSlug = currentIndex > 0 ? allGuides[currentIndex - 1] : null;
  const nextSlug = currentIndex < allGuides.length - 1 ? allGuides[currentIndex + 1] : null;

  // Look up the guide objects
  const prev = prevSlug ? findGuideBySlug(prevSlug, filteredSidebar) : null;
  const next = nextSlug ? findGuideBySlug(nextSlug, filteredSidebar) : null;

  return { prev, next };
}
