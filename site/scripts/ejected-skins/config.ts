export interface HtmlSkinDef {
  id: string;
  name: string;
  platform: 'html';
  style: 'css' | 'tailwind';
  template: string;
  css?: string;
  iconSet: 'default' | 'minimal';
}

export interface ReactSkinDef {
  id: string;
  name: string;
  platform: 'react';
  style: 'css' | 'tailwind';
  source: string;
  css?: string;
}

export type SkinDef = HtmlSkinDef | ReactSkinDef;
export type MediaType = 'video' | 'audio';

export const HTML_CDN_BASE = 'https://cdn.jsdelivr.net/npm/@videojs/html/cdn';
export const DEMO_VIDEO_SRC = 'https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4';
export const DEMO_POSTER_SRC = 'https://image.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/thumbnail.webp';

export interface EjectedSkinEntry {
  id: string;
  name: string;
  platform: 'html' | 'react';
  style: 'css' | 'tailwind';
  html?: string;
  tsx?: Record<string, string>;
  jsx?: Record<string, string>;
  css?: string;
}

export function getSkinMediaType(skin: SkinDef): MediaType {
  return skin.id.includes('audio') ? 'audio' : 'video';
}

export const SKINS: SkinDef[] = [
  {
    id: 'default-video',
    name: 'Default Video',
    platform: 'html',
    style: 'css',
    template: 'packages/html/src/define/video/skin.ts',
    css: 'packages/html/src/define/video/skin.css',
    iconSet: 'default',
  },
  {
    id: 'default-audio',
    name: 'Default Audio',
    platform: 'html',
    style: 'css',
    template: 'packages/html/src/define/audio/skin.ts',
    css: 'packages/html/src/define/audio/skin.css',
    iconSet: 'default',
  },
  {
    id: 'minimal-video',
    name: 'Minimal Video',
    platform: 'html',
    style: 'css',
    template: 'packages/html/src/define/video/minimal-skin.ts',
    css: 'packages/html/src/define/video/minimal-skin.css',
    iconSet: 'minimal',
  },
  {
    id: 'minimal-audio',
    name: 'Minimal Audio',
    platform: 'html',
    style: 'css',
    template: 'packages/html/src/define/audio/minimal-skin.ts',
    css: 'packages/html/src/define/audio/minimal-skin.css',
    iconSet: 'minimal',
  },
  {
    id: 'default-video-tailwind',
    name: 'Default Video (Tailwind)',
    platform: 'html',
    style: 'tailwind',
    template: 'packages/html/src/define/video/skin.tailwind.ts',
    iconSet: 'default',
  },
  {
    id: 'default-audio-tailwind',
    name: 'Default Audio (Tailwind)',
    platform: 'html',
    style: 'tailwind',
    template: 'packages/html/src/define/audio/skin.tailwind.ts',
    iconSet: 'default',
  },
  {
    id: 'minimal-video-tailwind',
    name: 'Minimal Video (Tailwind)',
    platform: 'html',
    style: 'tailwind',
    template: 'packages/html/src/define/video/minimal-skin.tailwind.ts',
    iconSet: 'minimal',
  },
  {
    id: 'minimal-audio-tailwind',
    name: 'Minimal Audio (Tailwind)',
    platform: 'html',
    style: 'tailwind',
    template: 'packages/html/src/define/audio/minimal-skin.tailwind.ts',
    iconSet: 'minimal',
  },
  {
    id: 'default-video-react',
    name: 'Default Video (React)',
    platform: 'react',
    style: 'css',
    source: 'packages/react/src/presets/video/skin.tsx',
    css: 'packages/react/src/presets/video/skin.css',
  },
  {
    id: 'default-audio-react',
    name: 'Default Audio (React)',
    platform: 'react',
    style: 'css',
    source: 'packages/react/src/presets/audio/skin.tsx',
    css: 'packages/react/src/presets/audio/skin.css',
  },
  {
    id: 'minimal-video-react',
    name: 'Minimal Video (React)',
    platform: 'react',
    style: 'css',
    source: 'packages/react/src/presets/video/minimal-skin.tsx',
    css: 'packages/react/src/presets/video/minimal-skin.css',
  },
  {
    id: 'minimal-audio-react',
    name: 'Minimal Audio (React)',
    platform: 'react',
    style: 'css',
    source: 'packages/react/src/presets/audio/minimal-skin.tsx',
    css: 'packages/react/src/presets/audio/minimal-skin.css',
  },
  {
    id: 'default-video-react-tailwind',
    name: 'Default Video (React + Tailwind)',
    platform: 'react',
    style: 'tailwind',
    source: 'packages/react/src/presets/video/skin.tailwind.tsx',
  },
  {
    id: 'default-audio-react-tailwind',
    name: 'Default Audio (React + Tailwind)',
    platform: 'react',
    style: 'tailwind',
    source: 'packages/react/src/presets/audio/skin.tailwind.tsx',
  },
  {
    id: 'minimal-video-react-tailwind',
    name: 'Minimal Video (React + Tailwind)',
    platform: 'react',
    style: 'tailwind',
    source: 'packages/react/src/presets/video/minimal-skin.tailwind.tsx',
  },
  {
    id: 'minimal-audio-react-tailwind',
    name: 'Minimal Audio (React + Tailwind)',
    platform: 'react',
    style: 'tailwind',
    source: 'packages/react/src/presets/audio/minimal-skin.tailwind.tsx',
  },
];
