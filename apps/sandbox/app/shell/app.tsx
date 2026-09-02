import { PLATFORMS, STYLINGS } from '@app/constants';
import { hasTailwindSkin, isMediaId, MEDIA, type MediaId, mediaSources } from '@app/media';
import { DEFAULT_SANDBOX_LOCALE, SANDBOX_LOCALE_TAGS, type SandboxLocaleTag } from '@app/shared/i18n/locale-meta';
import { DEFAULT_PRELOAD, PRELOAD_VALUES, type PreloadValue } from '@app/shared/sandbox-listener';
import { DEFAULT_SOURCE, SOURCES, type SourceId } from '@app/shared/sources';
import type { Platform, Styling } from '@app/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Navbar } from './navbar';
import { Preview } from './preview';

function getPagePath(platform: Platform, media: MediaId): string {
  if (platform === 'cdn') return '/cdn/';

  return `/${platform}-${media}/`;
}

/** `preset` named this parameter before the skins' player presets took the word, so older links still resolve. */
function readMedia(params: URLSearchParams): MediaId {
  const value = params.get('media') ?? params.get('preset');

  return isMediaId(value) ? value : 'video';
}

function readParams() {
  const params = new URLSearchParams(location.search);
  const preload = params.get('preload');
  const media = readMedia(params);

  return {
    platform: (params.get('platform') ?? 'html') as Platform,
    styling: (params.get('styling') ?? 'css') as Styling,
    media,
    skin: (params.get('skin') ?? 'default') as 'default' | 'minimal',
    // An explicit `?source=` wins over where the media lands on entry, so a shared link reaches the source it names.
    source: (params.get('source') ?? MEDIA[media].entrySource ?? DEFAULT_SOURCE) as SourceId,
    autoplay: params.get('autoplay') === '1',
    muted: params.get('muted') === '1',
    loop: params.get('loop') === '1',
    preload: PRELOAD_VALUES.includes(preload as PreloadValue) ? (preload as PreloadValue) : DEFAULT_PRELOAD,
    accentColor: params.get('accent')?.trim() ?? '',
    locale: (() => {
      const value = params.get('locale');

      return SANDBOX_LOCALE_TAGS.includes(value as SandboxLocaleTag)
        ? (value as SandboxLocaleTag)
        : DEFAULT_SANDBOX_LOCALE;
    })(),
  };
}

export function App() {
  const initial = useMemo(readParams, []);
  const [platform, setPlatform] = useState<Platform>(initial.platform);
  const [styling, setStyling] = useState(initial.styling);
  const [media, setMedia] = useState<MediaId>(initial.media);
  const [skin, setSkin] = useState(initial.skin);
  const [source, setSource] = useState(initial.source);
  const [autoplay, setAutoplay] = useState(initial.autoplay);
  const [muted, setMuted] = useState(initial.muted);
  const [loop, setLoop] = useState(initial.loop);
  const [preload, setPreload] = useState<PreloadValue>(initial.preload);
  const [accentColor, setAccentColor] = useState(initial.accentColor);
  const [locale, setLocale] = useState<SandboxLocaleTag>(initial.locale);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previousPreviewState = useRef({ skin, source, autoplay, muted, loop, preload, accentColor });

  const pagePath = getPagePath(platform, media);
  const descriptor = MEDIA[media];
  const availableSources = mediaSources(media, platform);
  const tailwindAvailable = hasTailwindSkin(media, platform);

  // Keep the URL in sync with all state.
  useEffect(() => {
    const params = new URLSearchParams({
      platform,
      styling,
      media,
      skin,
      source,
      autoplay: autoplay ? '1' : '0',
      muted: muted ? '1' : '0',
      loop: loop ? '1' : '0',
      preload,
      locale,
    });

    if (accentColor) params.set('accent', accentColor);

    history.replaceState(null, '', `/?${params}`);
  }, [platform, styling, media, skin, source, autoplay, muted, loop, preload, accentColor, locale]);

  // Initial state is already present in the iframe URL. Stream only subsequent changes so HTML previews do not race
  // several identical async renders during startup. Locale changes are URL-owned by Preview because CDN must reload.
  useEffect(() => {
    const previous = previousPreviewState.current;
    const target = iframeRef.current?.contentWindow;

    if (previous.skin !== skin) target?.postMessage({ type: 'skin-change', skin }, '*');

    if (previous.source !== source) target?.postMessage({ type: 'source-change', source }, '*');

    if (previous.autoplay !== autoplay) target?.postMessage({ type: 'autoplay-change', autoplay }, '*');

    if (previous.muted !== muted) target?.postMessage({ type: 'muted-change', muted }, '*');

    if (previous.loop !== loop) target?.postMessage({ type: 'loop-change', loop }, '*');

    if (previous.preload !== preload) target?.postMessage({ type: 'preload-change', preload }, '*');

    if (previous.accentColor !== accentColor) {
      target?.postMessage({ type: 'accent-color-change', accentColor }, '*');
    }

    previousPreviewState.current = { skin, source, autoplay, muted, loop, preload, accentColor };
  }, [skin, source, autoplay, muted, loop, preload, accentColor]);

  // Constrain the source to what the media offers on this platform.
  useEffect(() => {
    if (!availableSources.includes(source)) setSource(descriptor.fallbackSource ?? DEFAULT_SOURCE);
  }, [availableSources, descriptor.fallbackSource, source]);

  // Land on the media's own source when *switched into*, rather than inheriting whatever the previous media was
  // showing — `readParams` covers the first-mount half. Keyed on entry, so a source picked afterwards sticks. Declared
  // after the constraint so the landing wins when both fire in one pass.
  const previousMedia = useRef(media);

  useEffect(() => {
    const entered = previousMedia.current !== media;

    previousMedia.current = media;

    if (entered && descriptor.entrySource) setSource(descriptor.entrySource);
  }, [media, descriptor.entrySource]);

  useEffect(() => {
    if (!tailwindAvailable && styling === 'tailwind') setStyling('css');
  }, [tailwindAvailable, styling]);

  const handleSourceChange = useCallback((value: string) => setSource(value as SourceId), []);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Navbar
        platform={platform}
        onPlatformChange={setPlatform}
        styling={styling}
        onStylingChange={setStyling}
        media={media}
        onMediaChange={setMedia}
        skin={skin}
        onSkinChange={setSkin}
        source={source}
        onSourceChange={handleSourceChange}
        autoplay={autoplay}
        onAutoplayChange={setAutoplay}
        muted={muted}
        onMutedChange={setMuted}
        loop={loop}
        onLoopChange={setLoop}
        preload={preload}
        onPreloadChange={setPreload}
        locale={locale}
        onLocaleChange={setLocale}
        accentColor={accentColor}
        onAccentColorChange={setAccentColor}
        availableSources={availableSources}
        platforms={PLATFORMS}
        stylings={STYLINGS}
        sources={SOURCES}
      />
      <Preview
        key={`${pagePath}:${media}:${styling}`}
        ref={iframeRef}
        pagePath={pagePath}
        media={media}
        skin={skin}
        styling={styling}
        source={source}
        autoplay={autoplay}
        muted={muted}
        loop={loop}
        preload={preload}
        locale={locale}
        accentColor={accentColor}
        onLoad={() => {
          iframeRef.current?.contentWindow?.postMessage({ type: 'accent-color-change', accentColor }, '*');
        }}
      />
    </div>
  );
}
