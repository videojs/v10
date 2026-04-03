import { describe, expect, it } from 'vitest';
import { replaceMarker } from '../replace.js';

describe('replaceMarker', () => {
  it('replaces content between markers', () => {
    const markdown = `# Title

<!-- cli:replace test -->
old content here
<!-- /cli:replace test -->

## Footer`;

    const result = replaceMarker(markdown, 'test', 'new content');
    expect(result).toBe(`# Title

new content

## Footer`);
  });

  it('returns unchanged markdown when marker not found', () => {
    const markdown = '# Title\n\nSome content';
    const result = replaceMarker(markdown, 'missing', 'replacement');
    expect(result).toBe(markdown);
  });

  it('preserves content before and after markers', () => {
    const markdown = `before
<!-- cli:replace id -->
middle
<!-- /cli:replace id -->
after`;

    const result = replaceMarker(markdown, 'id', 'replaced');
    expect(result).toContain('before');
    expect(result).toContain('after');
    expect(result).toContain('replaced');
    expect(result).not.toContain('middle');
  });

  it('handles multiline content between markers', () => {
    const markdown = `start
<!-- cli:replace multi -->
line 1
line 2
line 3
<!-- /cli:replace multi -->
end`;

    const result = replaceMarker(markdown, 'multi', 'single line');
    expect(result).toBe('start\nsingle line\nend');
  });
});
