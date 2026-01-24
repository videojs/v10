import { sidebar as defaultSidebar } from '@/docs.config';
import type { AnySupportedStyle, Sidebar, SupportedFramework } from '@/types/docs';
import { DEFAULT_FRAMEWORK, getDefaultStyle, isValidFramework, isValidStyleForFramework } from '@/types/docs';
import {
  findFirstGuide,
  findGuideBySlug,
  getValidFrameworksForGuide,
  getValidStylesForGuide,
  isItemVisible,
} from './sidebar';

/**
 * Build a docs URL from framework, style, and guide slug components.
 */
export function buildDocsUrl(framework: SupportedFramework, style: AnySupportedStyle, guideSlug: string): string {
  return `/docs/framework/${framework}/style/${style}/${guideSlug}`;
}

/**
 * Input for resolveIndexRedirect
 */
export interface IndexRedirectInput {
  preferences: {
    framework: string | null;
    style: string | null;
  };
  params: {
    framework?: string;
    style?: string;
  };
}

/**
 * Output from resolveIndexRedirect
 */
export interface IndexRedirectResult {
  url: string;
  selectedFramework: SupportedFramework;
  selectedStyle: AnySupportedStyle;
  selectedSlug: string;
  reason: string;
}

/**
 * Resolve redirect for index pages (/docs, /docs/framework/X, /docs/framework/X/style/Y).
 * Nothing is pinned - we must select framework, style, AND slug.
 *
 * Logic:
 * 1. If params.framework AND params.style → validate both → find first guide
 * 2. If params.framework only → validate → get style from preference (if valid for framework) or default → find first guide
 * 3. If neither param → get both from preferences or defaults → find first guide
 *
 * @param input - The input containing preferences and params
 * @param sidebar - Optional sidebar to search (defaults to main sidebar config)
 */
export function resolveIndexRedirect(
  input: IndexRedirectInput,
  sidebar: Sidebar = defaultSidebar
): IndexRedirectResult {
  const { preferences, params } = input;

  let selectedFramework: SupportedFramework;
  let selectedStyle: AnySupportedStyle;
  let reason: string;

  // Case 1: Both framework and style in params
  if (params.framework && params.style) {
    if (!isValidFramework(params.framework)) {
      throw new Error(`Invalid framework param: ${params.framework}`);
    }
    if (!isValidStyleForFramework(params.framework, params.style)) {
      throw new Error(`Invalid style param "${params.style}" for framework "${params.framework}"`);
    }
    selectedFramework = params.framework;
    selectedStyle = params.style as AnySupportedStyle;
    reason = 'Using validated params.framework and params.style';
  } else if (params.framework) {
    // Case 2: Only framework in params
    if (!isValidFramework(params.framework)) {
      throw new Error(`Invalid framework param: ${params.framework}`);
    }
    selectedFramework = params.framework;

    // Try to use style preference if valid for this framework
    if (preferences.style && isValidStyleForFramework(selectedFramework, preferences.style)) {
      selectedStyle = preferences.style as AnySupportedStyle;
      reason = 'Using params.framework and preferences.style';
    } else {
      selectedStyle = getDefaultStyle(selectedFramework);
      reason = 'Using params.framework and default style (preference invalid or missing)';
    }
  } else {
    // Case 3: No params - use preferences or defaults
    // Try to use framework preference
    if (preferences.framework && isValidFramework(preferences.framework)) {
      selectedFramework = preferences.framework;

      // Try to use style preference if valid for this framework
      if (preferences.style && isValidStyleForFramework(selectedFramework, preferences.style)) {
        selectedStyle = preferences.style as AnySupportedStyle;
        reason = 'Using preferences.framework and preferences.style';
      } else {
        selectedStyle = getDefaultStyle(selectedFramework);
        reason = 'Using preferences.framework and default style (style preference invalid or missing)';
      }
    } else {
      // Use all defaults
      selectedFramework = DEFAULT_FRAMEWORK;
      selectedStyle = getDefaultStyle(selectedFramework);
      reason = 'Using default framework and default style (no valid preferences)';
    }
  }

  // Find the first guide for the selected framework and style
  const selectedSlug = findFirstGuide(selectedFramework, selectedStyle, sidebar);
  const url = buildDocsUrl(selectedFramework, selectedStyle, selectedSlug);

  return {
    url,
    selectedFramework,
    selectedStyle,
    selectedSlug,
    reason,
  };
}

/**
 * Input for resolveFrameworkChange
 */
export interface FrameworkChangeInput {
  currentFramework: SupportedFramework;
  currentStyle: AnySupportedStyle;
  currentSlug: string;
  newFramework: SupportedFramework;
}

/**
 * Output from resolveFrameworkChange
 */
export interface FrameworkChangeResult {
  url: string;
  shouldReplace: boolean;
  selectedFramework: SupportedFramework;
  selectedStyle: AnySupportedStyle;
  selectedSlug: string;
  slugChanged: boolean;
  reason: string;
}

/**
 * Resolve URL when user changes framework selector.
 * newFramework is PINNED (must keep), slug MAY change if not visible.
 *
 * Logic:
 * 1. framework = newFramework (PINNED)
 * 2. If currentStyle valid for newFramework → style = currentStyle
 *    Else → style = default style for newFramework
 * 3. If currentSlug visible in (newFramework, style) → slug = currentSlug, shouldReplace = true
 *    Else → slug = first guide in (newFramework, style), shouldReplace = false
 *
 * @param input - The input containing current state and new framework
 * @param sidebar - Optional sidebar to search (defaults to main sidebar config)
 */
export function resolveFrameworkChange(
  input: FrameworkChangeInput,
  sidebar: Sidebar = defaultSidebar
): FrameworkChangeResult {
  const { currentSlug, currentStyle, newFramework } = input;

  if (!isValidFramework(newFramework)) {
    throw new Error(`Invalid framework: ${newFramework}`);
  }

  const selectedFramework = newFramework; // PINNED

  // Determine the style to use
  let selectedStyle: AnySupportedStyle;
  let styleAdjusted = false;

  if (isValidStyleForFramework(newFramework, currentStyle)) {
    selectedStyle = currentStyle;
  } else {
    selectedStyle = getDefaultStyle(newFramework);
    styleAdjusted = true;
  }

  // Determine the slug to use
  let selectedSlug: string;
  let shouldReplace: boolean;
  let slugChanged: boolean;
  let reason: string;

  const guide = findGuideBySlug(currentSlug, sidebar);
  if (guide && isItemVisible(guide, selectedFramework, selectedStyle)) {
    // Current slug is visible in the new framework/style combo
    selectedSlug = currentSlug;
    shouldReplace = true;
    slugChanged = false;
    reason = styleAdjusted
      ? 'Changed framework and style (current style invalid), kept slug (visible)'
      : 'Changed framework, kept style and slug (both valid)';
  } else {
    // Current slug is not visible, find first guide
    selectedSlug = findFirstGuide(selectedFramework, selectedStyle, sidebar);
    shouldReplace = false;
    slugChanged = true;
    reason = styleAdjusted
      ? 'Changed framework and style (current style invalid), changed slug (not visible)'
      : 'Changed framework, kept style, changed slug (slug not visible)';
  }

  const url = buildDocsUrl(selectedFramework, selectedStyle, selectedSlug);

  return {
    url,
    shouldReplace,
    selectedFramework,
    selectedStyle,
    selectedSlug,
    slugChanged,
    reason,
  };
}

/**
 * Input for resolveStyleChange
 */
export interface StyleChangeInput {
  currentFramework: SupportedFramework;
  currentStyle: AnySupportedStyle;
  currentSlug: string;
  newStyle: AnySupportedStyle;
}

/**
 * Output from resolveStyleChange
 */
export interface StyleChangeResult {
  url: string;
  shouldReplace: boolean;
  selectedFramework: SupportedFramework;
  selectedStyle: AnySupportedStyle;
  selectedSlug: string;
  slugChanged: boolean;
  reason: string;
}

/**
 * Resolve URL when user changes style selector.
 * newStyle is PINNED (must keep), slug MAY change if not visible.
 *
 * Logic:
 * 1. framework = currentFramework (stays same)
 * 2. style = newStyle (PINNED)
 * 3. If currentSlug visible in (currentFramework, newStyle) → slug = currentSlug, shouldReplace = true
 *    Else → slug = first guide in (currentFramework, newStyle), shouldReplace = false
 *
 * @param input - The input containing current state and new style
 * @param sidebar - Optional sidebar to search (defaults to main sidebar config)
 */
export function resolveStyleChange(input: StyleChangeInput, sidebar: Sidebar = defaultSidebar): StyleChangeResult {
  const { currentFramework, currentSlug, newStyle } = input;

  if (!isValidStyleForFramework(currentFramework, newStyle)) {
    throw new Error(`Invalid style "${newStyle}" for framework "${currentFramework}"`);
  }

  const selectedFramework = currentFramework; // stays same
  const selectedStyle = newStyle; // PINNED

  // Determine the slug to use
  let selectedSlug: string;
  let shouldReplace: boolean;
  let slugChanged: boolean;
  let reason: string;

  const guide = findGuideBySlug(currentSlug, sidebar);
  if (guide && isItemVisible(guide, selectedFramework, selectedStyle)) {
    // Current slug is visible in the new style
    selectedSlug = currentSlug;
    shouldReplace = true;
    slugChanged = false;
    reason = 'Changed style, kept slug (visible in new style)';
  } else {
    // Current slug is not visible, find first guide
    selectedSlug = findFirstGuide(selectedFramework, selectedStyle, sidebar);
    shouldReplace = false;
    slugChanged = true;
    reason = 'Changed style, changed slug (slug not visible in new style)';
  }

  const url = buildDocsUrl(selectedFramework, selectedStyle, selectedSlug);

  return {
    url,
    shouldReplace,
    selectedFramework,
    selectedStyle,
    selectedSlug,
    slugChanged,
    reason,
  };
}

/**
 * Input for resolveDocsLinkUrl
 */
export interface DocsLinkInput {
  targetSlug: string;
  contextFramework: SupportedFramework;
  contextStyle: AnySupportedStyle;
}

/**
 * Output from resolveDocsLinkUrl
 */
export interface DocsLinkResult {
  url: string;
  selectedFramework: SupportedFramework;
  selectedStyle: AnySupportedStyle;
  selectedSlug: string;
  priorityLevel: 1 | 2 | 3 | 4;
  reason: string;
}

/**
 * Resolve the best URL for a guide slug link given current context.
 * targetSlug is PINNED (must keep), framework and style MAY change.
 *
 * Logic (4-level priority cascade):
 * 1. slug = targetSlug (PINNED)
 * 2. Try to find best (framework, style) that supports targetSlug:
 *    - Priority 1: If targetSlug visible in (contextFramework, contextStyle) → use both (best UX)
 *    - Priority 2: If targetSlug visible in (contextFramework, X) for some style X → use (contextFramework, guide's first valid style for contextFramework)
 *    - Priority 3: If targetSlug visible in (X, contextStyle) for some framework X → use (guide's first framework that supports contextStyle, contextStyle)
 *    - Priority 4: Use (guide's first valid framework, guide's first valid style for that framework)
 *
 * @param input - The input containing target slug and context
 * @param sidebar - Optional sidebar to search (defaults to main sidebar config)
 */
export function resolveDocsLinkUrl(input: DocsLinkInput, sidebar: Sidebar = defaultSidebar): DocsLinkResult {
  const { targetSlug, contextFramework, contextStyle } = input;

  const guide = findGuideBySlug(targetSlug, sidebar);
  if (!guide) {
    throw new Error(`No guide found with slug "${targetSlug}"`);
  }

  if (!isValidFramework(contextFramework)) {
    throw new Error(`Invalid context framework: ${contextFramework}`);
  }

  if (!isValidStyleForFramework(contextFramework, contextStyle)) {
    throw new Error(`Invalid context style "${contextStyle}" for framework "${contextFramework}"`);
  }

  const selectedSlug = targetSlug; // PINNED
  let selectedFramework: SupportedFramework;
  let selectedStyle: AnySupportedStyle;
  let priorityLevel: 1 | 2 | 3 | 4;
  let reason: string;

  // Priority 1: Try current framework + current style
  const validStylesForContextFramework = getValidStylesForGuide(guide, contextFramework);
  if (validStylesForContextFramework.includes(contextStyle as any)) {
    selectedFramework = contextFramework;
    selectedStyle = contextStyle;
    priorityLevel = 1;
    reason = 'Priority 1: Kept both framework and style (slug visible in current context)';
  } else if (validStylesForContextFramework.length > 0) {
    // Priority 2: Try current framework + guide's first valid style for that framework
    selectedFramework = contextFramework;
    selectedStyle = validStylesForContextFramework[0];
    priorityLevel = 2;
    reason = 'Priority 2: Kept framework, changed style (slug not visible with current style)';
  } else {
    // Priority 3: Try guide's first valid framework that supports current style
    const validFrameworks = getValidFrameworksForGuide(guide);
    const frameworkThatSupportsContextStyle = validFrameworks.find((fw) =>
      getValidStylesForGuide(guide, fw).includes(contextStyle as any)
    );

    if (frameworkThatSupportsContextStyle) {
      selectedFramework = frameworkThatSupportsContextStyle;
      selectedStyle = contextStyle;
      priorityLevel = 3;
      reason = 'Priority 3: Changed framework, kept style (slug not visible with current framework)';
    } else {
      // Priority 4: Fallback - use guide's first valid framework + its first valid style
      const fallbackFramework = validFrameworks[0];
      const fallbackStyle = getValidStylesForGuide(guide, fallbackFramework)[0];
      selectedFramework = fallbackFramework;
      selectedStyle = fallbackStyle;
      priorityLevel = 4;
      reason = 'Priority 4: Changed both framework and style (slug not visible in current context)';
    }
  }

  const url = buildDocsUrl(selectedFramework, selectedStyle, selectedSlug);

  return {
    url,
    selectedFramework,
    selectedStyle,
    selectedSlug,
    priorityLevel,
    reason,
  };
}
