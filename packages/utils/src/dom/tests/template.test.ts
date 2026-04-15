import { describe, expect, it } from 'vitest';
import { createTemplate, renderTemplate } from '../template';

describe('createTemplate', () => {
  it('returns an HTMLTemplateElement with parsed content', () => {
    const template = createTemplate('<div class="root"><span>Hello</span></div>');

    expect(template).toBeInstanceOf(HTMLTemplateElement);
    expect(template!.content.querySelector('.root')).toBeTruthy();
    expect(template!.content.querySelector('span')!.textContent).toBe('Hello');
  });
});

describe('renderTemplate', () => {
  it('deep-clones template content into a container', () => {
    const template = createTemplate('<p>Hello</p><p>World</p>')!;
    const container = document.createElement('div');

    renderTemplate(container, template);

    expect(container.children).toHaveLength(2);
    expect(container.innerHTML).toBe('<p>Hello</p><p>World</p>');
  });

  it('appends without clearing existing content', () => {
    const template = createTemplate('<span>new</span>')!;
    const container = document.createElement('div');
    container.innerHTML = '<span>existing</span>';

    renderTemplate(container, template);

    expect(container.children).toHaveLength(2);
    expect(container.children[0]!.textContent).toBe('existing');
    expect(container.children[1]!.textContent).toBe('new');
  });
});
