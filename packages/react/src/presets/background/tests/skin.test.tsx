import { cleanup, render } from '@testing-library/react';
import { SKIN_HELP_TEXT, SKIN_HELP_URL } from '@videojs/core';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { BackgroundVideoSkin } from '../skin';

afterEach(cleanup);

describe('BackgroundVideoSkin', () => {
  it('renders an extensible background surface around its children', () => {
    const { container } = render(
      <BackgroundVideoSkin className="hero" style={{ objectFit: 'contain' }}>
        <video />
      </BackgroundVideoSkin>
    );
    const skin = container.firstElementChild;

    expect(skin?.classList).toContain('media-background-skin');
    expect(skin?.classList).toContain('hero');
    expect(skin?.getAttribute('style')).toContain('object-fit: contain');
    expect(skin?.querySelector('video')).not.toBeNull();
  });

  it('links to the about-this-player page, on the client and in server output', () => {
    const { container } = render(<BackgroundVideoSkin />);
    const link = container.querySelector<HTMLAnchorElement>('.media-background-skin > a[rel="help"]');

    expect(link?.getAttribute('href')).toBe(SKIN_HELP_URL);
    expect(link?.hidden).toBe(true);
    expect(renderToString(<BackgroundVideoSkin />)).toContain(
      `<a rel="help" href="${SKIN_HELP_URL}" hidden="">${SKIN_HELP_TEXT}</a>`
    );
  });
});
