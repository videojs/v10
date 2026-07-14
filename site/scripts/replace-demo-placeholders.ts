import type { Plugin } from 'vite';
import {
  VJS8_DEMO_VIDEO,
  VJS10_DEMO_BACKGROUND_VIDEO_MP4,
  VJS10_DEMO_DASH,
  VJS10_DEMO_POSTER,
  VJS10_DEMO_VIDEO,
  VJS10_MULTI_AUDIO_DEMO_VIDEO,
} from '../src/consts.ts';

const DEMOS_DIRECTORY = '/src/components/docs/demos/';

export const DEMO_PLACEHOLDERS = {
  VJS8_DEMO_VIDEO_HLS: VJS8_DEMO_VIDEO.hls,
  VJS10_DEMO_BACKGROUND_VIDEO_MP4: VJS10_DEMO_BACKGROUND_VIDEO_MP4,
  VJS10_DEMO_DASH: VJS10_DEMO_DASH,
  VJS10_DEMO_POSTER: VJS10_DEMO_POSTER,
  VJS10_DEMO_VIDEO_HLS: VJS10_DEMO_VIDEO.hls,
  VJS10_DEMO_VIDEO_MP4: VJS10_DEMO_VIDEO.mp4,
  VJS10_MULTI_AUDIO_DEMO_VIDEO_HLS: VJS10_MULTI_AUDIO_DEMO_VIDEO.hls,
} as const;

const PLACEHOLDER_PATTERN = /{{([A-Z0-9_]+)}}/g;

/** Resolve the shared media source placeholders used in HTML demo snippets. */
export function replaceDemoPlaceholders(source: string): string {
  return source.replace(PLACEHOLDER_PATTERN, (placeholder, name: string) => {
    const value = DEMO_PLACEHOLDERS[name as keyof typeof DEMO_PLACEHOLDERS];

    if (!value) {
      throw new Error(`Unknown demo placeholder: ${placeholder}`);
    }

    return value;
  });
}

/** Resolve demo placeholders in raw HTML imports for the site build and dev server. */
export function demoPlaceholderPlugin() {
  return {
    name: 'videojs:demo-placeholders',
    enforce: 'pre',
    transform(source, id) {
      const [filePath, query = ''] = id.split('?', 2);

      if (
        !filePath.includes(DEMOS_DIRECTORY) ||
        !filePath.endsWith('.html') ||
        !new URLSearchParams(query).has('raw')
      ) {
        return null;
      }

      return replaceDemoPlaceholders(source);
    },
  } satisfies Plugin;
}
