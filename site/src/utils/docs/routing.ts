import { sidebar as defaultSidebar } from '@/docs.config';
import type { Sidebar, SupportedFramework } from '@/types/docs';
import { DEFAULT_FRAMEWORK, isValidFramework } from '@/types/docs';

import { findFirstGuide, findGuideBySlug, getValidFrameworksForGuide } from './sidebar';

export const CANONICAL_INSTALLATION_SLUGS = new Set([
  'guides/installation',
  'guides/installation-vue',
  'guides/installation-svelte',
  'guides/installation-shadcn',
  'guides/cdn',
]);

/** Build the public URL for a guide, including the canonical installation routes. */
export function buildDocsUrl(framework: SupportedFramework, guideSlug: string): string {
  if (guideSlug === 'guides/installation') return `/docs/guides/installation/${framework}`;

  if (guideSlug === 'guides/installation-vue') return '/docs/guides/installation/vue';

  if (guideSlug === 'guides/installation-svelte') return '/docs/guides/installation/svelte';

  if (guideSlug === 'guides/installation-shadcn') return '/docs/guides/installation/shadcn';

  if (guideSlug === 'guides/cdn') return '/docs/guides/installation/cdn';

  return `/docs/framework/${framework}/${guideSlug}`;
}

/**
 * Build a framework-agnostic docs URL. `/docs` and `/docs/<slug>` are server routes that redirect to the reader's
 * preferred framework, and `resolveDocsHref` upgrades them on the client when the preference is known.
 */
export function buildAgnosticDocsUrl(guideSlug?: string | null): string {
  if (guideSlug === 'guides/installation') return '/docs/guides/installation';

  if (guideSlug === 'guides/installation-vue') return '/docs/guides/installation/vue';

  if (guideSlug === 'guides/installation-svelte') return '/docs/guides/installation/svelte';

  if (guideSlug === 'guides/installation-shadcn') return '/docs/guides/installation/shadcn';

  if (guideSlug === 'guides/cdn') return '/docs/guides/installation/cdn';

  return guideSlug ? `/docs/${guideSlug}` : '/docs';
}

/** Read the explicit framework segment from a docs URL. Framework-agnostic and invalid paths return null. */
export function getFrameworkFromDocsPath(pathname: string): SupportedFramework | null {
  const framework = pathname.match(/^\/docs\/framework\/([^/]+)(?:\/|$)/)?.[1];

  return isValidFramework(framework) ? framework : null;
}

/** Input for resolveDocsHref */
export interface DocsHrefInput {
  /** Guide to link to. `null` means the docs landing page (first guide for the framework). */
  slug: string | null;
  /** Framework in context. `null` when unknown, which yields the agnostic URL. */
  framework: SupportedFramework | null;
}

/**
 * Resolve the href for any docs link from whatever context is available. This is the one entry point shared by the
 * static link components, the server redirect routes, and the client-side enhancer, so all of them agree on where a
 * link goes.
 *
 * - No framework → agnostic `/docs` or `/docs/<slug>` (resolved later by the server or the client)
 * - Framework, no slug → that framework's first guide
 * - Framework and slug → the slug, falling back to another framework if the guide is not available in this one
 */
export function resolveDocsHref(input: DocsHrefInput, sidebar: Sidebar = defaultSidebar): string {
  const { slug, framework } = input;
  if (!framework) return buildAgnosticDocsUrl(slug);

  if (!slug) return buildDocsUrl(framework, findFirstGuide(framework, sidebar));

  return resolveDocsLinkUrl({ targetSlug: slug, contextFramework: framework }, sidebar).url;
}

/** Input for resolveIndexRedirect */
export interface IndexRedirectInput {
  preferences: {
    framework: string | null;
  };
  params: {
    framework?: string;
  };
}

/** Output from resolveIndexRedirect */
export interface IndexRedirectResult {
  url: string;
  selectedFramework: SupportedFramework;
  selectedSlug: string;
  reason: string;
}

/**
 * Resolve redirect for index pages (/docs, /docs/framework/X). Nothing is pinned - we must select framework AND slug.
 *
 * Logic: 1. If params.framework → validate → find first guide 2. If no param → get from preferences or defaults → find
 * first guide
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
  let reason: string;

  if (params.framework) {
    // Framework in params - validate it
    if (!isValidFramework(params.framework)) {
      throw new Error(`Invalid framework param: ${params.framework}`);
    }

    selectedFramework = params.framework;
    reason = 'Using validated params.framework';
  } else {
    // No params - use preferences or defaults
    if (preferences.framework && isValidFramework(preferences.framework)) {
      selectedFramework = preferences.framework;
      reason = 'Using preferences.framework';
    } else {
      // Use all defaults
      selectedFramework = DEFAULT_FRAMEWORK;
      reason = 'Using default framework (no valid preferences)';
    }
  }

  // Find the first guide for the selected framework
  const selectedSlug = findFirstGuide(selectedFramework, sidebar);
  const url = buildDocsUrl(selectedFramework, selectedSlug);

  return {
    url,
    selectedFramework,
    selectedSlug,
    reason,
  };
}

/** Input for resolveFrameworkChange */
export interface FrameworkChangeInput {
  currentFramework: SupportedFramework;
  currentSlug: string;
  newFramework: SupportedFramework;
}

/** Output from resolveFrameworkChange */
export interface FrameworkChangeResult {
  url: string;
  shouldReplace: boolean;
  selectedFramework: SupportedFramework;
  selectedSlug: string;
  slugChanged: boolean;
  reason: string;
}

/**
 * Resolve URL when user changes framework selector. newFramework is PINNED (must keep), slug MAY change if not visible.
 *
 * Logic: 1. framework = newFramework (PINNED) 2. If currentSlug visible in newFramework → slug = currentSlug,
 * shouldReplace = true Else → slug = first guide in newFramework, shouldReplace = false
 *
 * @param input - The input containing current state and new framework
 * @param sidebar - Optional sidebar to search (defaults to main sidebar config)
 */
export function resolveFrameworkChange(
  input: FrameworkChangeInput,
  sidebar: Sidebar = defaultSidebar
): FrameworkChangeResult {
  const { currentSlug, newFramework } = input;
  if (!isValidFramework(newFramework)) throw new Error(`Invalid framework: ${newFramework}`);

  const selectedFramework = newFramework; // PINNED

  // Determine the slug to use
  let selectedSlug: string;
  let shouldReplace: boolean;
  let slugChanged: boolean;
  let reason: string;

  const guide = findGuideBySlug(currentSlug, sidebar);
  const validFrameworks = guide ? getValidFrameworksForGuide(guide, sidebar) : [];

  if (guide && validFrameworks.includes(selectedFramework)) {
    // Current slug is visible in the new framework
    selectedSlug = currentSlug;
    shouldReplace = true;
    slugChanged = false;
    reason = 'Changed framework, kept slug (visible in new framework)';
  } else {
    // Current slug is not visible, find first guide
    selectedSlug = findFirstGuide(selectedFramework, sidebar);
    shouldReplace = false;
    slugChanged = true;
    reason = 'Changed framework, changed slug (slug not visible in new framework)';
  }

  const url = buildDocsUrl(selectedFramework, selectedSlug);

  return {
    url,
    shouldReplace,
    selectedFramework,
    selectedSlug,
    slugChanged,
    reason,
  };
}

/** Input for resolveDocsLinkUrl */
export interface DocsLinkInput {
  targetSlug: string;
  contextFramework: SupportedFramework;
}

/** Output from resolveDocsLinkUrl */
export interface DocsLinkResult {
  url: string;
  selectedFramework: SupportedFramework;
  selectedSlug: string;
  priorityLevel: 1 | 2;
  reason: string;
}

/**
 * Resolve the best URL for a guide slug link given current context. targetSlug is PINNED (must keep), framework MAY
 * change.
 *
 * Logic (2-level priority cascade): 1. slug = targetSlug (PINNED) 2. Try to find best framework that supports
 * targetSlug: - Priority 1: If targetSlug visible in contextFramework → use it (best UX) - Priority 2: Use guide's
 * first valid framework
 *
 * @param input - The input containing target slug and context
 * @param sidebar - Optional sidebar to search (defaults to main sidebar config)
 */
export function resolveDocsLinkUrl(input: DocsLinkInput, sidebar: Sidebar = defaultSidebar): DocsLinkResult {
  const { targetSlug, contextFramework } = input;

  const guide = findGuideBySlug(targetSlug, sidebar);
  if (!guide) throw new Error(`No guide found with slug "${targetSlug}"`);

  if (!isValidFramework(contextFramework)) {
    throw new Error(`Invalid context framework: ${contextFramework}`);
  }

  const selectedSlug = targetSlug; // PINNED
  let selectedFramework: SupportedFramework;
  let priorityLevel: 1 | 2;
  let reason: string;

  // Priority 1: Try current framework
  const validFrameworks = getValidFrameworksForGuide(guide, sidebar);

  if (validFrameworks.includes(contextFramework)) {
    selectedFramework = contextFramework;
    priorityLevel = 1;
    reason = 'Priority 1: Kept framework (slug visible in current context)';
  } else {
    // Priority 2: Fallback to guide's first valid framework
    selectedFramework = validFrameworks[0];
    priorityLevel = 2;
    reason = 'Priority 2: Changed framework (slug not visible in current context)';
  }

  const url = buildDocsUrl(selectedFramework, selectedSlug);

  return {
    url,
    selectedFramework,
    selectedSlug,
    priorityLevel,
    reason,
  };
}
