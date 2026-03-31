import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTemplate } from '../template';

describe('createTemplate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns an HTMLTemplateElement with parsed content', () => {
    const template = createTemplate('<div class="root"><span>Hello</span></div>');

    expect(template).toBeInstanceOf(HTMLTemplateElement);
    expect(template!.content.querySelector('.root')).toBeTruthy();
    expect(template!.content.querySelector('span')!.textContent).toBe('Hello');
  });

  it('returns null when document is unavailable', () => {
    vi.stubGlobal('document', undefined);
    expect(createTemplate('<div></div>')).toBeNull();
  });
});
