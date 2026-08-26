import { VJS10_HTML_CDN_BASE } from '../../src/consts';

export type MediaType = 'video' | 'audio';
export type SkinVariant = 'default' | 'minimal';
export type SkinStyle = 'css' | 'tailwind';

interface SkinMetadata {
  id: string;
  name: string;
  platform: 'html' | 'react';
  style: SkinStyle;
  mediaType: MediaType;
  group: string;
  variant: SkinVariant;
  live: boolean;
}

export interface HtmlSkinDef extends SkinMetadata {
  platform: 'html';
  template: string;
  css?: string;
  iconSet: SkinVariant;
}

export interface ReactSkinDef extends SkinMetadata {
  platform: 'react';
  source: string;
  css?: string;
}

export type SkinDef = HtmlSkinDef | ReactSkinDef;

export const HTML_CDN_BASE = VJS10_HTML_CDN_BASE;
export const DEMO_VIDEO_SRC = 'https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4';
export const DEMO_POSTER_SRC = 'https://image.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/thumbnail.webp';
export const DEMO_LIVE_SRC = 'https://stream.mux.com/v69RSHhFelSm4701snP22dYz2jICy4E4FUyk02rW4gxRM.m3u8';
export const DEMO_LIVE_POSTER_SRC =
  'https://image.mux.com/v69RSHhFelSm4701snP22dYz2jICy4E4FUyk02rW4gxRM/thumbnail.webp';

export const LIVE_MEDIA = {
  video: { subpath: 'hlsjs-video', tag: 'hlsjs-video', component: 'HlsJsVideo' },
  audio: { subpath: 'mux-audio', tag: 'mux-audio', component: 'MuxAudio' },
} as const satisfies Record<MediaType, { subpath: string; tag: string; component: string }>;

export interface EjectedSkinEntry {
  id: string;
  name: string;
  platform: 'html' | 'react';
  style: SkinStyle;
  html?: string;
  tsx?: Record<string, string>;
  jsx?: Record<string, string>;
  css?: string;
}

const MEDIA_TYPES: MediaType[] = ['video', 'audio'];
const SKIN_VARIANTS: SkinVariant[] = ['default', 'minimal'];
const LIVE_MODES = [false, true];

function titleCase(value: string): string {
  return `${value[0]!.toUpperCase()}${value.slice(1)}`;
}

function getGroup(mediaType: MediaType, live: boolean): string {
  return live ? `live-${mediaType}` : mediaType;
}

function getId(
  platform: SkinDef['platform'],
  style: SkinStyle,
  variant: SkinVariant,
  mediaType: MediaType,
  live: boolean
): string {
  const base = `${variant}-${live ? 'live-' : ''}${mediaType}`;

  if (platform === 'react') return `${base}-react${style === 'tailwind' ? '-tailwind' : ''}`;

  return `${base}${style === 'tailwind' ? '-tailwind' : ''}`;
}

function getName(
  platform: SkinDef['platform'],
  style: SkinStyle,
  variant: SkinVariant,
  mediaType: MediaType,
  live: boolean
): string {
  const base = `${titleCase(variant)} ${live ? 'Live ' : ''}${titleCase(mediaType)}`;

  if (platform === 'react') return `${base} (React${style === 'tailwind' ? ' + Tailwind' : ''})`;

  return style === 'tailwind' ? `${base} (Tailwind)` : base;
}

function createHtmlSkin(style: SkinStyle, variant: SkinVariant, mediaType: MediaType, live: boolean): HtmlSkinDef {
  const group = getGroup(mediaType, live);
  const file = variant === 'minimal' ? 'minimal-skin' : 'skin';
  const styleSuffix = style === 'tailwind' ? '.tailwind' : '';

  return {
    id: getId('html', style, variant, mediaType, live),
    name: getName('html', style, variant, mediaType, live),
    platform: 'html',
    style,
    mediaType,
    group,
    variant,
    live,
    template: `packages/html/src/presets/${group}/${file}${styleSuffix}.ts`,
    ...(style === 'css' && { css: `packages/html/src/define/${group}/${file}.css` }),
    iconSet: variant,
  };
}

function createReactSkin(style: SkinStyle, variant: SkinVariant, mediaType: MediaType, live: boolean): ReactSkinDef {
  const group = getGroup(mediaType, live);
  const file = variant === 'minimal' ? 'minimal-skin' : 'skin';
  const styleSuffix = style === 'tailwind' ? '.tailwind' : '';

  return {
    id: getId('react', style, variant, mediaType, live),
    name: getName('react', style, variant, mediaType, live),
    platform: 'react',
    style,
    mediaType,
    group,
    variant,
    live,
    source: `packages/react/src/presets/${group}/${file}${styleSuffix}.tsx`,
    ...(style === 'css' && { css: `packages/react/src/presets/${group}/${file}.css` }),
  };
}

function createSkins<T extends SkinDef>(create: (variant: SkinVariant, mediaType: MediaType, live: boolean) => T): T[] {
  return LIVE_MODES.flatMap((live) =>
    SKIN_VARIANTS.flatMap((variant) => MEDIA_TYPES.map((mediaType) => create(variant, mediaType, live)))
  );
}

export const SKINS: SkinDef[] = [
  ...createSkins((variant, mediaType, live) => createHtmlSkin('css', variant, mediaType, live)),
  ...createSkins((variant, mediaType, live) => createHtmlSkin('tailwind', variant, mediaType, live)),
  ...createSkins((variant, mediaType, live) => createReactSkin('css', variant, mediaType, live)),
  ...createSkins((variant, mediaType, live) => createReactSkin('tailwind', variant, mediaType, live)),
];
