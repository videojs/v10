import { describe, expect, it } from 'vitest';

describe('Menu registration boundaries', () => {
  it('defines optional transition and settings elements only from their explicit entries', async () => {
    await import('../../../define/ui/menu');

    expect(customElements.get('media-menu')).toBeDefined();
    expect(customElements.get('media-menu-transition-root')).toBeUndefined();
    expect(customElements.get('media-menu-transition-view')).toBeUndefined();
    expect(customElements.get('media-menu-item-value')).toBeUndefined();

    await import('../../../define/ui/menu-transition');

    expect(customElements.get('media-menu-transition-root')).toBeDefined();
    expect(customElements.get('media-menu-transition-view')).toBeDefined();
    expect(customElements.get('media-menu-item-value')).toBeUndefined();

    await import('../../../define/ui/menu-settings');

    expect(customElements.get('media-menu-item-value')).toBeDefined();
  });
});
