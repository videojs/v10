import { describe, expect, it } from 'vite-plus/test';

import { createSourceText, renderSourceRange } from '..';

describe('renderSourceRange', () => {
  it('applies contained edits and maps untouched positions', () => {
    const source = createSourceText('before middle after', [{ start: 7, end: 13, content: 'value' }]);
    const rendered = renderSourceRange(source, 0, source.code.length);

    expect(rendered.value).toBe('before value after');
    expect(rendered.position(14)).toBe(13);
    expect(rendered.position(9)).toBeUndefined();
  });
});
