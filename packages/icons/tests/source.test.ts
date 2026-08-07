import { describe, expect, it } from 'vitest';
import { createHtmlIconsSource, createReactIconsSource } from '../scripts/source';

describe('createReactIconsSource', () => {
  it('generates only the requested named icon components', async () => {
    const source = await createReactIconsSource(['PlayIcon', 'PauseIcon']);

    expect(source).toContain('export const PlayIcon');
    expect(source).toContain('export const PauseIcon');
    expect(source).toContain("import type { SVGProps } from 'react'");
    expect(source).not.toContain('RestartIcon');
    expect(source).not.toContain('export default');
  });

  it('types custom SVG style properties when an icon needs them', async () => {
    const source = await createReactIconsSource(['SpinnerIcon']);

    expect(source).toContain("import type { CSSProperties, SVGProps } from 'react'");
    expect(source).toContain('as CSSProperties & Record<string, string | number>');
  });
});

describe('createHtmlIconsSource', () => {
  it('generates an exact local icon registration module', async () => {
    const source = await createHtmlIconsSource(['SpinnerIcon']);

    expect(source).toContain("import '@videojs/html/icons/element'");
    expect(source).toContain("iconElement?.register('default', icons)");
    expect(source).toContain("'spinner': `<svg");
    expect(source).not.toContain("'play':");
    expect(source).not.toContain("'volume-high':");
  });
});
