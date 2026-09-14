import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { ANALYTICS_EVENTS, registerAnalyticsContext, trackEvent } from '../analytics';

beforeEach(() => {
  // The helpers log through console.debug in dev, which vitest also runs as.
  vi.spyOn(console, 'debug').mockImplementation(() => {});
});

afterEach(() => {
  delete window.posthog;
  vi.restoreAllMocks();
});

describe('trackEvent', () => {
  it('no-ops when PostHog is absent', () => {
    expect(() => trackEvent(ANALYTICS_EVENTS.searchOpened)).not.toThrow();
  });

  it('no-ops when the snippet has not attached capture yet', () => {
    window.posthog = {};

    expect(() => trackEvent(ANALYTICS_EVENTS.searchOpened)).not.toThrow();
  });

  it('forwards the event name and properties to capture', () => {
    const capture = vi.fn();

    window.posthog = { capture };

    trackEvent(ANALYTICS_EVENTS.searchNoResults, { query: 'chapters' });

    expect(capture).toHaveBeenCalledWith('search_no_results', { query: 'chapters' });
  });

  it('captures property-less events with undefined properties', () => {
    const capture = vi.fn();

    window.posthog = { capture };

    trackEvent(ANALYTICS_EVENTS.muxLoginClicked);

    expect(capture).toHaveBeenCalledWith('mux_login_clicked', undefined);
  });

  it('swallows errors thrown by capture', () => {
    const capture = vi.fn(() => {
      throw new Error('posthog exploded');
    });

    window.posthog = { capture };

    expect(() => trackEvent(ANALYTICS_EVENTS.searchOpened)).not.toThrow();
    expect(capture).toHaveBeenCalled();
  });
});

describe('registerAnalyticsContext', () => {
  it('no-ops when PostHog is absent', () => {
    expect(() => registerAnalyticsContext({ docs_framework: 'react' })).not.toThrow();
  });

  it('forwards super properties to register', () => {
    const register = vi.fn();

    window.posthog = { register };

    registerAnalyticsContext({ docs_framework: 'react', docs_style: 'css' });

    expect(register).toHaveBeenCalledWith({ docs_framework: 'react', docs_style: 'css' });
  });

  it('swallows errors thrown by register', () => {
    const register = vi.fn(() => {
      throw new Error('posthog exploded');
    });

    window.posthog = { register };

    expect(() => registerAnalyticsContext({ install_renderer: 'hls' })).not.toThrow();
  });
});
