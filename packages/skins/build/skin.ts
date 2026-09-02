import type { SkinMeta, SkinName } from '../src/meta.ts';

export const skinPresets = ['audio', 'live-audio', 'live-video', 'video'] as const;

export type SkinPreset = (typeof skinPresets)[number];
export type SkinTheme = SkinMeta['style']['theme'];

/** Resolve the public preset shared by a default or Minimal Skin. */
export function skinPreset(name: SkinName): SkinPreset {
  const preset = name.replace(/^(?:default|minimal)-/, '');
  if (!isSkinPreset(preset)) throw new Error(`Unsupported Skin preset: \`${name}\`.`);

  return preset;
}

/** Resolve the stable source-owned directory for a Skin. */
export function skinDirectory(name: SkinName): string {
  const preset = skinPreset(name);

  return name.startsWith('minimal-') ? `skins/${preset}/minimal` : `skins/${preset}`;
}

/** Runtime stylesheet entry carrying the shared tokens plus one preset's tokens, relative to `src/styles`. */
export function skinBaseStylesheet(preset: SkinPreset): string {
  return preset === 'audio' || preset === 'live-audio' ? 'base.audio.css' : 'base.video.css';
}

export function isSkinPreset(value: string): value is SkinPreset {
  return skinPresets.some((preset) => preset === value);
}
