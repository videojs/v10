/**
 * PostHog event vocabulary and safe capture helpers.
 *
 * The snippet in `src/components/Posthog.astro` is production-only and idle-loaded, so `window.posthog` is absent in
 * development and is the queueing stub until the real script arrives. Every helper here no-ops rather than throwing so
 * call sites never need their own guards.
 *
 * PostHog runs in `cookieless_mode: "always"`. Never call `identify`, `alias`, or any person-property API — there is no
 * durable person to attach them to. Super properties registered here live for one page load only, so they must be
 * re-registered whenever the underlying preference changes.
 */

import type { AnySupportedStyle, SupportedFramework } from '@/types/docs';
import type { InstallMethod, Renderer, Skin, UseCase } from '@/utils/installation/types';

declare global {
  interface Window {
    /**
     * Minimal surface of the PostHog snippet. The pre-load stub exposes the same two methods and queues their calls, so
     * both are safe to invoke before `array.js` finishes loading.
     */
    posthog?: {
      capture?: (event: string, properties?: Record<string, unknown>) => void;
      register?: (properties: Record<string, unknown>) => void;
    };
  }
}

/**
 * Every custom event the site captures. Autocaptured clicks are described declaratively with
 * `data-ph-capture-attribute-*` instead — see `site/AGENTS.md`.
 */
export const ANALYTICS_EVENTS = {
  docsPreferenceChanged: 'docs_preference_changed',
  installOptionChanged: 'install_option_changed',
  codeCopied: 'code_copied',
  searchOpened: 'search_opened',
  searchNoResults: 'search_no_results',
  muxLoginClicked: 'mux_login_clicked',
  muxAuthSucceeded: 'mux_auth_succeeded',
  muxAuthFailed: 'mux_auth_failed',
  muxUploadStarted: 'mux_upload_started',
  muxUploadCompleted: 'mux_upload_completed',
  muxPlaybackIdResolved: 'mux_playback_id_resolved',
  muxUploadFailed: 'mux_upload_failed',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/** Which docs preference changed. */
export type DocsPreference = 'framework' | 'style';

/** Which installation picker changed. */
export type InstallOption = 'renderer' | 'skin' | 'use_case' | 'install_method';

/** Properties each event carries. Keep these stable: dashboards filter on them. */
export interface AnalyticsEventProperties {
  docs_preference_changed: {
    preference: DocsPreference;
    value: SupportedFramework | AnySupportedStyle;
    previous: SupportedFramework | AnySupportedStyle | null;
  };
  install_option_changed: {
    option: InstallOption;
    value: Renderer | Skin | UseCase | InstallMethod;
    previous: Renderer | Skin | UseCase | InstallMethod | null;
  };
  /** `block` is a short, stable id for the copied code block. */
  code_copied: {
    block: string;
    framework?: SupportedFramework;
    install_method?: InstallMethod;
  };
  search_opened: undefined;
  search_no_results: { query: string };
  mux_login_clicked: undefined;
  mux_auth_succeeded: undefined;
  mux_auth_failed: { reason: string };
  mux_upload_started: undefined;
  mux_upload_completed: undefined;
  mux_playback_id_resolved: undefined;
  /** Never carries upload ids, playback ids, or tokens — only the step and a short reason. */
  mux_upload_failed: { stage: string; reason: string };
}

/**
 * Super properties describing the reader's current context, attached to every subsequent event on this page load.
 * Cookieless mode drops them on navigation, so re-register whenever the source preference changes.
 */
export type AnalyticsContext = {
  docs_framework?: SupportedFramework | null;
  docs_style?: AnySupportedStyle | null;
  install_renderer?: Renderer | null;
};

function getPosthog(): Window['posthog'] | null {
  if (typeof window === 'undefined') return null;

  return window.posthog ?? null;
}

/** Capture a custom event. No-ops when PostHog is absent, and never throws. */
export function trackEvent<E extends AnalyticsEventName>(name: E, properties?: AnalyticsEventProperties[E]): void {
  if (import.meta.env.DEV) console.debug('[analytics] capture', name, properties);

  const posthog = getPosthog();
  if (typeof posthog?.capture !== 'function') return;

  try {
    posthog.capture(name, properties);
  } catch (error) {
    if (import.meta.env.DEV) console.debug('[analytics] capture failed', name, error);
  }
}

/** Register super properties for the rest of this page load. No-ops when PostHog is absent, and never throws. */
export function registerAnalyticsContext(properties: AnalyticsContext): void {
  if (import.meta.env.DEV) console.debug('[analytics] register', properties);

  const posthog = getPosthog();
  if (typeof posthog?.register !== 'function') return;

  try {
    posthog.register(properties);
  } catch (error) {
    if (import.meta.env.DEV) console.debug('[analytics] register failed', error);
  }
}
