import { useStore } from '@nanostores/react';
import { useEffect, useMemo } from 'react';
import { Select, type SelectOption } from '@/components/Select';
import type { Renderer, UseCase } from '@/stores/installation';
import { muxPlaybackId, renderer, sourceUrl, useCase, VALID_RENDERERS } from '@/stores/installation';
import { articleFor, detectRenderer, extractMuxPlaybackId } from '@/utils/installation/detect-renderer';

const RENDERER_LABELS: Record<Renderer, string> = {
  'background-video': 'Background Video',
  cloudflare: 'Cloudflare',
  dash: 'DASH',
  hls: 'HLS',
  'html5-audio': 'HTML5 Audio',
  'html5-video': 'HTML5 Video',
  jwplayer: 'JW Player',
  'mux-audio': 'Mux',
  'mux-background-video': 'Mux Background Video',
  'mux-video': 'Mux',
  spotify: 'Spotify',
  vimeo: 'Vimeo',
  wistia: 'Wistia',
  youtube: 'YouTube',
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

  const options = useMemo(() => buildOptions($useCase), [$useCase]);
  const detection = useMemo(() => detectRenderer($sourceUrl, $useCase), [$sourceUrl, $useCase]);

  // Auto-select renderer when detection or use case changes
  useEffect(() => {
    if (detection) {
      renderer.set(detection.renderer);

      const playbackId = extractMuxPlaybackId($sourceUrl);
      if (playbackId) {
        muxPlaybackId.set(playbackId);
      }
    } else {
      // No valid detection — ensure current renderer is valid for use case
      const current = renderer.get();
      const validRenderers = VALID_RENDERERS[$useCase];
      if (!validRenderers.includes(current)) {
        renderer.set(validRenderers[0]!);
      }
    }
  }, [detection, $sourceUrl, $useCase]);

  const showDetectionMatch = $sourceUrl.trim() && detection && detection.renderer === $renderer;
  const showDetectionSuggestion = $sourceUrl.trim() && detection && detection.renderer !== $renderer;
  const showNoMatch = $sourceUrl.trim() && !detection;

  return (
    <div className="flex flex-col gap-3">
      {/* URL input */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="source-url-input" className="text-sm text-dark-40 dark:text-light-40">
          Enter the URL to a video to auto-detect
        </label>
        <input
          id="source-url-input"
          type="url"
          value={$sourceUrl}
          onChange={(e) => sourceUrl.set(e.target.value)}
          placeholder="https://..."
          className="bg-light-60 dark:bg-dark-90 dark:text-light-100 border border-light-40 dark:border-dark-80 rounded-lg text-sm p-2"
        />
      </div>

      {/* Select dropdown */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="renderer-select" className="text-sm text-dark-40 dark:text-light-40 flex flex-wrap gap-1">
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
