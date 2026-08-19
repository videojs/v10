import { describe, expect, it } from 'vitest';
import { DEMO_POSTER_SRC, DEMO_VIDEO_SRC, SKINS } from '../ejected-skins/config.ts';
import {
  createRenderMediaIcon,
  evaluateTemplate,
  extractTemplateLiteral,
  parseImportedNames,
  prependHtmlSkinScripts,
  replaceSlots,
} from '../ejected-skins/html.ts';
import { resolvePropsInterface } from '../ejected-skins/react.ts';

describe('ejected skin configuration', () => {
  it('has a unique id for every configured skin', () => {
    expect(new Set(SKINS.map(({ id }) => id)).size).toBe(SKINS.length);
  });

  it('defines both platforms and styling modes', () => {
    expect(new Set(SKINS.map(({ platform }) => platform))).toEqual(new Set(['html', 'react']));
    expect(new Set(SKINS.map(({ style }) => style))).toEqual(new Set(['css', 'tailwind']));
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

  it('replaces the media slot and collapses the poster slot to its fallback image', () => {
    // Mirrors the real templates: the poster slot carries an image.
    const source = [
      '<!-- @deprecated use the default slot -->',
      '<slot name="media"></slot>',
      '<slot></slot>',
      '  <slot name="poster">',
      '    <img alt="" decoding="async">',
      '  </slot>',
    ].join('\n');
    const result = replaceSlots(source, 'video');
    expect(result).toContain(`<video src="${DEMO_VIDEO_SRC}" playsinline></video>`);
    expect(result).toContain('  <img alt="" decoding="async" />');
    expect(result).not.toContain('<slot name="poster">');
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
      '/audio-minimal-ui.js"></script>\n<link rel="stylesheet" href="./player.css">\n\n<audio-player>'
    );
  });

  it('gives a video player the poster the collapsed slot no longer carries', () => {
    const skin = SKINS.find(({ id }) => id === 'default-video');
    if (skin?.platform !== 'html') throw new Error('Missing HTML skin fixture');
    expect(prependHtmlSkinScripts('<media-poster></media-poster>', skin)).toContain(
      `<video-player poster="${DEMO_POSTER_SRC}">`
    );
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
