import '@app/styles.css';
import { MEDIA, mediaSources } from '@app/media';
import { applyCaptionTracks, CAPTIONS_MODES, type CaptionsMode } from '@app/shared/captions';
import { SANDBOX_LOCALE_OPTION_GROUPS, SANDBOX_LOCALE_TAGS, type SandboxLocaleTag } from '@app/shared/i18n/locale-meta';
import { findMediaElement } from '@app/shared/media-element';
import { Chapters } from '@app/shared/react/chapters';
import { VideoPlayer } from '@app/shared/react/players';
import { SandboxI18nProvider } from '@app/shared/react/sandbox-i18n';
import { Storyboard } from '@app/shared/react/storyboard';
import { useLocale } from '@app/shared/react/use-locale';
import { useSandbox } from '@app/shared/react/use-sandbox';
import {
  DEFAULT_SOURCE,
  getChapters,
  getPosterSrc,
  getStoryboardSrc,
  isLiveSource,
  SOURCES,
  type SourceId,
} from '@app/shared/sources';
import { SelectField } from '@app/shell/select';
import { Container } from '@videojs/react';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { RadixSkin } from './skin';

// hls.js plays every on-demand HLS source in the sandbox and exposes renditions and audio tracks, so it is the one
// media here; the Source, Captions, and Language pickers mirror the shell's and travel in the URL.
const MEDIA_ID = 'hlsjs-video';
const SOURCE_IDS = mediaSources(MEDIA_ID, 'react').filter((id) => !isLiveSource(id));
const CAPTIONS_LABELS = { none: 'None', single: 'One track', multiple: 'Two tracks' } as const satisfies Record<
  CaptionsMode,
  string
>;

function isSourceId(value: string | null): value is SourceId {
  // SAFETY: widening only relaxes the `includes` parameter; the predicate is decided by the membership test.
  return value !== null && (SOURCE_IDS as readonly string[]).includes(value);
}

function isCaptionsMode(value: string | null): value is CaptionsMode {
  // SAFETY: same as above.
  return value !== null && (CAPTIONS_MODES as readonly string[]).includes(value);
}

function isLocaleTag(value: string): value is SandboxLocaleTag {
  // SAFETY: same as above.
  return (SANDBOX_LOCALE_TAGS as readonly string[]).includes(value);
}

/** The requested source if hls.js plays it, else the shell's entry or fallback source for hls.js. */
function readSource(): SourceId {
  const requested = new URLSearchParams(window.location.search).get('source');
  if (isSourceId(requested)) return requested;

  const { entrySource, fallbackSource } = MEDIA[MEDIA_ID];

  for (const candidate of [entrySource, fallbackSource, DEFAULT_SOURCE]) {
    if (candidate && isSourceId(candidate)) return candidate;
  }

  return SOURCE_IDS[0] ?? DEFAULT_SOURCE;
}

function readCaptions(): CaptionsMode {
  const requested = new URLSearchParams(window.location.search).get('captions');

  return isCaptionsMode(requested) ? requested : 'none';
}

function writeParam(key: string, value: string) {
  const url = new URL(window.location.href);

  url.searchParams.set(key, value);
  window.history.replaceState(null, '', url);
}

function App() {
  const [source, setSource] = useState(readSource);
  const [captions, setCaptions] = useState(readCaptions);
  const locale = useLocale();
  const { mediaProps } = useSandbox();
  const scopeRef = useRef<HTMLDivElement>(null);
  const { url, source: engineSource } = SOURCES[source];
  // Engines that take a structured `source` (DRM, tokens) get it; the rest take the URL.
  const engineProps = engineSource ? { source: engineSource } : { src: url ?? '' };

  useEffect(() => {
    const element = scopeRef.current ? findMediaElement(scopeRef.current) : undefined;

    if (element) applyCaptionTracks(element, captions);
  }, [source, captions]);

  const selectSource = (next: SourceId) => {
    writeParam('source', next);
    // The message the shell streams to preview pages, so `useSandbox()` consumers stay on the same source.
    window.postMessage({ type: 'source-change', source: next }, '*');
    setSource(next);
  };

  const selectCaptions = (next: CaptionsMode) => {
    writeParam('captions', next);
    setCaptions(next);
  };

  const selectLocale = (next: SandboxLocaleTag) => {
    writeParam('locale', next);
    // `SandboxI18nProvider` follows this message through `useLocale()`.
    window.postMessage({ type: 'locale-change', locale: next }, '*');
  };

  return (
    <SandboxI18nProvider>
      <div className="flex w-full flex-col items-center gap-4">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm">
          <SelectField
            label="Source"
            value={source}
            onChange={(value) => {
              if (isSourceId(value)) selectSource(value);
            }}
            options={SOURCE_IDS.map((id) => ({ value: id, label: SOURCES[id].label }))}
          />
          <SelectField
            label="Captions"
            value={captions}
            onChange={(value) => {
              if (isCaptionsMode(value)) selectCaptions(value);
            }}
            options={CAPTIONS_MODES.map((mode) => ({ value: mode, label: CAPTIONS_LABELS[mode] }))}
          />
          <SelectField
            label="Language"
            value={locale}
            onChange={(value) => {
              if (isLocaleTag(value)) selectLocale(value);
            }}
            optionGroups={SANDBOX_LOCALE_OPTION_GROUPS}
          />
        </div>
        <VideoPlayer poster={getPosterSrc(source)}>
          {/* The packaged skins' frame: 16:9, capped at the shell's width variable, clipped corners. */}
          <div className="relative mx-auto aspect-video w-full max-w-[var(--sandbox-player-width,56rem)] overflow-clip rounded-2xl bg-black text-white">
            <Container className="group/player relative size-full">
              {/* `display: contents` keeps the media a layout child of the player container. */}
              <div ref={scopeRef} className="contents" key={source}>
                <HlsJsVideo {...engineProps} {...mediaProps} className="block size-full" playsInline crossOrigin="">
                  <Chapters tracks={getChapters(source)} />
                  <Storyboard src={getStoryboardSrc(source)} />
                </HlsJsVideo>
              </div>
              <RadixSkin />
            </Container>
          </div>
        </VideoPlayer>
        <p className="max-w-[56rem] text-center text-sm text-neutral-600 dark:text-neutral-400">
          Radix Slider, DropdownMenu with submenus, Tooltip, Popover, Toggle, a player-scoped Dialog, and Radix Icons,
          fed by Video.js state, actions, availability flags, option hooks, text-track cues, and i18n text tokens.
        </p>
      </div>
    </SandboxI18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
