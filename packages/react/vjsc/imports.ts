import { camelCase, kebabCase } from '@videojs/utils/string';
import type { ImportRef } from 'vjsc/ast';

const componentModules: Readonly<Record<string, string>> = {
  AirPlayButton: 'airplay-button',
  PiPButton: 'pip-button',
};

/** Resolve public React references to their package-internal source modules. */
export function resolvePackageImport(reference: ImportRef): ImportRef {
  if (reference.source === '@videojs/react') {
    if (reference.name === 'Text') return { ...reference, source: '@/i18n' };
    if (reference.name === 'Container' || reference.name === 'ContainerProps') {
      return { ...reference, source: '@/player/container' };
    }
    if (reference.name === 'Poster' || reference.name === 'PosterProps') {
      return { ...reference, source: '@/ui/poster' };
    }
    if (reference.name === 'usePlayer') return { ...reference, source: '@/player/context' };
    if (reference.name === 'useTranslator') return { ...reference, source: '@/i18n' };
    if (reference.name === 'useQualityOptions') {
      return { ...reference, source: '@/ui/quality/use-quality-options' };
    }
    if (reference.name === 'useAudioTrackOptions') {
      return { ...reference, source: '@/ui/audio-track/use-audio-track-options' };
    }
    if (reference.name === 'usePlaybackRateOptions') {
      return { ...reference, source: '@/ui/playback-rate/use-playback-rate-options' };
    }
    if (reference.name === 'useCaptionsOptions') {
      return { ...reference, source: '@/ui/captions-radio-group/use-captions-options' };
    }
    if (reference.name === 'RenderProp') return { ...reference, source: '@/utils/types' };

    return { ...reference, source: `@/ui/${componentModule(reference.name)}` };
  }

  const iconsSource = '@videojs/react/icons';

  if (reference.source === iconsSource) return { ...reference, source: '@/icons' };
  if (reference.source.startsWith(`${iconsSource}/`)) {
    return { ...reference, source: `@/icons/${reference.source.slice(iconsSource.length + 1)}` };
  }

  return reference;
}

function componentModule(name: string): string {
  return componentModules[name] ?? kebabCase(camelCase(name));
}
