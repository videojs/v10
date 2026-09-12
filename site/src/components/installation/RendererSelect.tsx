import { useStore } from '@nanostores/react';
import { useEffect } from 'react';

import { Select } from '@/components/Select';
import { renderer, sourceUrl, useCase } from '@/stores/installation';
import { ANALYTICS_EVENTS, registerAnalyticsContext, trackEvent } from '@/utils/analytics';
import { articleFor, detectRenderer } from '@/utils/installation/detect-renderer';
import { buildOptions } from '@/utils/installation/renderer-options';
import { getInstallationPreset, type Renderer } from '@/utils/installation/types';

export default function RendererSelect() {
  const $renderer = useStore(renderer);
  const $useCase = useStore(useCase);
  const $sourceUrl = useStore(sourceUrl);

  const options = buildOptions($useCase);
  const detection = detectRenderer($sourceUrl, $useCase);
  const detectedRenderer = detection?.renderer ?? null;

  // Auto-select renderer when the detected renderer or use case changes.
  // Uses the primitive `detectedRenderer` string instead of the `detection`
  // object to avoid re-firing on every render (new object reference each time),
  // which would override manual dropdown selection.
  useEffect(() => {
    if (detectedRenderer) {
      renderer.set(detectedRenderer);
    } else {
      // No valid detection — ensure current renderer is valid for use case
      const current = renderer.get();
      const validRenderers = getInstallationPreset($useCase).renderers;

      if (!validRenderers.includes(current)) {
        renderer.set(validRenderers[0]!);
      }
    }
  }, [detectedRenderer, $useCase]);

  // Covers every path that changes the renderer — manual pick, URL auto-detection, and a finished Mux upload — so the
  // super property never drifts from the store. Super properties are per page load, so re-registering is cheap.
  useEffect(() => {
    registerAnalyticsContext({ install_renderer: $renderer });
  }, [$renderer]);

  const selectRenderer = (value: Renderer) => {
    const previous = renderer.get();
    if (value === previous) return;

    renderer.set(value);
    trackEvent(ANALYTICS_EVENTS.installOptionChanged, { option: 'renderer', value, previous });
  };

  const showDetectionMatch = $sourceUrl.trim() && detection && detection.renderer === $renderer;
  const showDetectionSuggestion = $sourceUrl.trim() && detection && detection.renderer !== $renderer;
  const showNoMatch = $sourceUrl.trim() && !detection;

  return (
    <div className="flex flex-col gap-3">
      {/* URL input */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="source-url-input" className="text-p3">
          Enter the URL to a video to auto-detect
        </label>
        <input
          id="source-url-input"
          type="url"
          value={$sourceUrl}
          onChange={(e) => sourceUrl.set(e.target.value)}
          placeholder="https://..."
          className="bg-manila-50 dark:bg-warm-gray border-manila-75 dark:border-soot text-p3 rounded-xs border p-2"
        />
      </div>

      {/* Select dropdown */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="renderer-select" className="text-p3 flex flex-wrap gap-1">
          {showDetectionMatch ? (
            `This looks like ${articleFor(detection.renderer)} ${detection.label} link`
          ) : showDetectionSuggestion ? (
            <>
              This looks like {articleFor(detection.renderer)} {detection.label} link.
              <button
                type="button"
                onClick={() => selectRenderer(detection.renderer)}
                className="intent:decoration-gold cursor-pointer underline"
              >
                Select {detection.label}
              </button>
            </>
          ) : showNoMatch ? (
            `We couldn't detect the source type — select manually below`
          ) : (
            `or select manually`
          )}
        </label>
        <Select
          value={$renderer}
          onChange={(value) => {
            if (value) selectRenderer(value);
          }}
          options={options}
          aria-label="Select renderer"
        />
      </div>
    </div>
  );
}
