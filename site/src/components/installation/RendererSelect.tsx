import { useStore } from '@nanostores/react';
import { useEffect } from 'react';
import { Select, type SelectOption } from '@/components/Select';
import type { Renderer, UseCase } from '@/stores/installation';
import { renderer, sourceUrl, useCase, VALID_RENDERERS } from '@/stores/installation';
import { articleFor, detectRenderer } from '@/utils/installation/detect-renderer';

const RENDERER_LABELS: Record<Renderer, string> = {
  'background-video': 'Background Video',
  // cloudflare: 'Cloudflare',
  // dash: 'DASH',
  hls: 'HLS',
  'html5-audio': 'HTML5 Audio',
  'html5-video': 'HTML5 Video',
  // jwplayer: 'JW Player',
  // 'mux-audio': 'Mux',
  // 'mux-background-video': 'Mux Background Video',
  // 'mux-video': 'Mux',
  // spotify: 'Spotify',
  // vimeo: 'Vimeo',
  // wistia: 'Wistia',
  // youtube: 'YouTube',
};

function buildOptions(useCase: UseCase): SelectOption<Renderer>[] {
  return VALID_RENDERERS[useCase].map((r) => ({
    value: r,
    label: RENDERER_LABELS[r],
  }));
}

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
      const validRenderers = VALID_RENDERERS[$useCase];
      if (!validRenderers.includes(current)) {
        renderer.set(validRenderers[0]!);
      }
    }
  }, [detectedRenderer, $useCase]);

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
          className="bg-manila-50 dark:bg-warm-gray border border-manila-75 dark:border-soot rounded-xs text-p3 p-2"
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
                onClick={() => renderer.set(detection.renderer)}
                className="cursor-pointer underline intent:no-underline"
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
            if (value) renderer.set(value);
          }}
          options={options}
          aria-label="Select renderer"
        />
      </div>
    </div>
  );
}
