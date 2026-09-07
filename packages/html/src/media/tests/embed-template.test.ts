import { describe, expect, it } from 'vite-plus/test';

import { embedTemplate } from '../embed-template';

describe('embedTemplate', () => {
  it('renders the frame with the URL, the feature policy, and the extra attributes', () => {
    const html = embedTemplate({
      src: 'https://player.example.com/embed?x="1"',
      allow: 'autoplay; fullscreen',
      attributes: { allowfullscreen: '', title: 'Example player' },
    });
    const container = document.createElement('div');

    container.innerHTML = html;

    const iframe = container.querySelector('iframe')!;

    expect(iframe.getAttribute('part')).toBe('iframe');
    expect(iframe.getAttribute('src')).toBe('https://player.example.com/embed?x="1"');
    expect(iframe.getAttribute('allow')).toBe('autoplay; fullscreen');
    expect(iframe.hasAttribute('allowfullscreen')).toBe(true);
    expect(iframe.getAttribute('title')).toBe('Example player');
    expect(container.querySelector('script')).toBeNull();
  });

  it('leaves src off until there is a URL', () => {
    const container = document.createElement('div');

    container.innerHTML = embedTemplate({ src: '', allow: 'autoplay' });

    expect(container.querySelector('iframe')!.hasAttribute('src')).toBe(false);
  });

  it('takes the frame out of hit-testing without controls unless told otherwise', () => {
    expect(embedTemplate({ src: '', allow: '' })).toMatch(
      /:host\(:not\(\[controls\]\)\)\s*\{\s*pointer-events:\s*none/
    );
    expect(embedTemplate({ src: '', allow: '', withoutControls: ':host { color: red; }' })).not.toContain(
      'pointer-events'
    );
  });
});
