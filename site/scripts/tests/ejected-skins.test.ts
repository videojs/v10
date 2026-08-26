import { describe, expect, it } from 'vite-plus/test';

import {
  DEMO_LIVE_POSTER_SRC,
  DEMO_LIVE_SRC,
  DEMO_POSTER_SRC,
  DEMO_VIDEO_SRC,
  SKINS,
} from '../ejected-skins/config.ts';
import {
  createRenderMediaIcon,
  evaluateTemplate,
  extractTemplateLiteral,
  parseImportedNames,
  prependHtmlSkinScripts,
  replaceSlots,
} from '../ejected-skins/html.ts';
import { buildEjectedSkin } from '../ejected-skins/index.ts';
import { resolvePropsInterface } from '../ejected-skins/react.ts';

describe('ejected skin configuration', () => {
  it('has a unique id for every configured skin', () => {
    expect(new Set(SKINS.map(({ id }) => id)).size).toBe(SKINS.length);
  });

  it('defines both platforms and styling modes', () => {
    expect(new Set(SKINS.map(({ platform }) => platform))).toEqual(new Set(['html', 'react']));
    expect(new Set(SKINS.map(({ style }) => style))).toEqual(new Set(['css', 'tailwind']));
  });

  it('defines every preset, skin, platform, and styling combination', () => {
    expect(SKINS).toHaveLength(32);
    expect(SKINS.filter(({ live }) => live)).toHaveLength(16);
  });
});

describe('ejected HTML skins', () => {
  it('extracts and evaluates the skin template', () => {
    const source = `function getTemplateHTML() { return /*html*/ \`\n  <button>\${label}</button>\n\`; }`;

    expect(evaluateTemplate(extractTemplateLiteral(source), { label: 'Play' })).toBe('<button>Play</button>');
  });

  it('collects imported names and aliases', () => {
    const imports = parseImportedNames("import { playText, pauseText as pause } from '@videojs/core';");

    expect([...imports]).toEqual([
      ['playText', '@videojs/core'],
      ['pause', '@videojs/core'],
    ]);
  });

  // Mirrors the real templates: the poster slot carries an image.
  const slotSource = [
    '<!-- @deprecated use the default slot -->',
    '<slot name="media"></slot>',
    '<slot></slot>',
    '  <slot name="poster">',
    '    <img alt="" decoding="async">',
    '  </slot>',
  ].join('\n');

  it('replaces the media slot and collapses the poster slot to its fallback image', () => {
    const result = replaceSlots(slotSource, { mediaType: 'video', live: false });

    expect(result).toContain(`<video src="${DEMO_VIDEO_SRC}" playsinline></video>`);
    expect(result).toContain('  <img alt="" decoding="async" />');
    expect(result).not.toContain('<slot name="poster">');
  });

  it('gives live skins a media element and a live source', () => {
    const result = replaceSlots(slotSource, { mediaType: 'video', live: true });

    expect(result).toContain(`<hlsjs-video src="${DEMO_LIVE_SRC}" playsinline></hlsjs-video>`);
    expect(result).toContain('  <img alt="" decoding="async" />');
  });

  it('escapes generated media icons', () => {
    expect(createRenderMediaIcon('minimal')('play&pause', { label: 'a"b' })).toBe(
      '<media-icon name="play&amp;pause" family="minimal" label="a&quot;b"></media-icon>'
    );
  });

  it('wraps snippets with the matching player and CDN bundle', () => {
    const skin = SKINS.find(({ id }) => id === 'minimal-audio');
    if (skin?.platform !== 'html') throw new Error('Missing HTML skin fixture');

    expect(prependHtmlSkinScripts('<media-controls></media-controls>', skin)).toContain(
      '/audio-minimal.js"></script>\n<link rel="stylesheet" href="./player.css">\n\n<audio-player>'
    );
  });

  it('loads the media bundle alongside the preset bundle for live skins', () => {
    const skin = SKINS.find(({ id }) => id === 'minimal-live-video');
    if (skin?.platform !== 'html') throw new Error('Missing live HTML skin fixture');

    const result = prependHtmlSkinScripts('<media-controls></media-controls>', skin);

    expect(result).toContain('/live-video-minimal.js"></script>');
    expect(result).toContain('/media/hlsjs-video.js"></script>');
    expect(result).toContain('<live-video-player poster=');
  });

  it('gives a video player the poster the collapsed slot no longer carries', () => {
    const skin = SKINS.find(({ id }) => id === 'default-video');
    if (skin?.platform !== 'html') throw new Error('Missing HTML skin fixture');

    expect(prependHtmlSkinScripts('<media-poster></media-poster>', skin)).toContain(
      `<video-player poster="${DEMO_POSTER_SRC}">`
    );
  });

  it('gives a live video player the live poster', () => {
    const skin = SKINS.find(({ id }) => id === 'minimal-live-video');
    if (skin?.platform !== 'html') throw new Error('Missing live HTML skin fixture');

    expect(prependHtmlSkinScripts('<media-poster></media-poster>', skin)).toContain(
      `<live-video-player poster="${DEMO_LIVE_POSTER_SRC}">`
    );
  });

  it('does not link a generated stylesheet for Tailwind skins', () => {
    const skin = SKINS.find(({ id }) => id === 'minimal-live-video-tailwind');
    if (skin?.platform !== 'html') throw new Error('Missing live Tailwind HTML skin fixture');

    expect(prependHtmlSkinScripts('<media-controls></media-controls>', skin)).not.toContain('player.css');
  });
});

describe('ejected React skins', () => {
  it('produces CSS and Tailwind players with matching dependencies', async () => {
    const cssSkin = SKINS.find(({ id }) => id === 'default-live-video-react');
    const tailwindSkin = SKINS.find(({ id }) => id === 'default-live-video-react-tailwind');

    if (cssSkin?.platform !== 'react' || tailwindSkin?.platform !== 'react') {
      throw new Error('Missing live React skin fixtures');
    }

    const [cssEntry, tailwindEntry] = await Promise.all([buildEjectedSkin(cssSkin), buildEjectedSkin(tailwindSkin)]);
    const cssSource = cssEntry.tsx?.['LiveVideoPlayer.tsx'];
    const tailwindSource = tailwindEntry.tsx?.['LiveVideoPlayer.tsx'];

    expect(cssSource).toContain("import './player.css';");
    expect(tailwindSource).not.toContain("import './player.css';");
    expect(tailwindSource).toContain('export function LiveVideoPlayer');
    expect(tailwindSource).not.toContain('export function LiveVideoSkinTailwind');
  });
});

describe('resolvePropsInterface', () => {
  // Mirrors the real chain: the video alias sits between `BaseSkinProps` and
  // the skin's own props type.
  const source = [
    'type BaseSkinProps<T = unknown> = PropsWithChildren<T & { style?: CSSProperties; className?: string }>;',
    '',
    'type BaseVideoSkinProps<T = unknown> = BaseSkinProps<T> & {',
    '  /** Describes the skin component, not the player the ejected file exports. */',
    '  renderPoster?: RenderProp<Poster.State> | undefined;',
    '};',
    '',
    'export type VideoSkinProps = BaseVideoSkinProps;',
  ].join('\n');

  it('flattens the chain into one interface, leaving no alias behind', () => {
    const result = resolvePropsInterface(source);

    expect(result).not.toContain('BaseSkinProps');
    expect(result).not.toContain('BaseVideoSkinProps');
    expect(result).toContain('export interface VideoSkinProps {');
  });

  it('carries over what an alias added, without its JSDoc', () => {
    const result = resolvePropsInterface(source);

    expect(result).toContain('  renderPoster?: RenderProp<Poster.State> | undefined;');
    expect(result).not.toContain('Describes the skin component');
  });
});
