import ejectedSkins from '../../content/ejected-skins.json';
import type { Skin } from './types';

export interface EjectedSkinCode {
  tsx?: string;
  html?: string;
  cdnScript?: string;
  cdnStylesheet?: string;
  css?: string;
}

const SKIN_TO_BASE_ID: Record<Skin, string> = {
  video: 'default-video',
  audio: 'default-audio',
  'minimal-video': 'minimal-video',
  'minimal-audio': 'minimal-audio',
};

export function generateEjectedSkinCode(opts: { skin: Skin; framework: 'html' | 'react' }): EjectedSkinCode {
  const baseId = SKIN_TO_BASE_ID[opts.skin];
  const id = opts.framework === 'react' ? `${baseId}-react` : baseId;
  const entry = ejectedSkins.find((s) => s.id === id && s.style === 'css');
  if (!entry) throw new Error(`Ejected skin not found: ${id}`);

  const result: EjectedSkinCode = {};
  if ('tsx' in entry && entry.tsx) result.tsx = entry.tsx;
  if ('html' in entry && entry.html) result.html = entry.html;
  if ('cdnScript' in entry && entry.cdnScript) result.cdnScript = entry.cdnScript;
  if ('cdnStylesheet' in entry && entry.cdnStylesheet) result.cdnStylesheet = entry.cdnStylesheet;
  if ('css' in entry && entry.css) result.css = entry.css;
  return result;
}
