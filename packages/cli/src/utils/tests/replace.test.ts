import { describe, expect, it } from 'vitest';
import { replaceMarker, stripOmitMarkers } from '../replace.js';

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

  it('treats $ patterns in replacement literally', () => {
    const markdown = `start
<!-- cli:replace test -->
old
<!-- /cli:replace test -->
end`;

    const result = replaceMarker(markdown, 'test', 'https://example.com/video.php?id=$1&ref=$&');
    expect(result).toContain('https://example.com/video.php?id=$1&ref=$&');
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

describe('stripOmitMarkers', () => {
  it('removes content between omit markers', () => {
    const markdown = `# Title

<!-- cli:omit installation -->
CLI-only hint
<!-- /cli:omit installation -->

## Footer`;

    const result = stripOmitMarkers(markdown);
    expect(result).not.toContain('CLI-only hint');
    expect(result).not.toContain('cli:omit');
    expect(result).toContain('# Title');
    expect(result).toContain('## Footer');
  });

  it('returns unchanged markdown when no markers are present', () => {
    const markdown = '# Title\n\nSome content';
    expect(stripOmitMarkers(markdown)).toBe(markdown);
  });

  it('removes multiple omit blocks with different ids', () => {
    const markdown = `before
<!-- cli:omit one -->
alpha
<!-- /cli:omit one -->
middle
<!-- cli:omit two -->
beta
<!-- /cli:omit two -->
after`;

    const result = stripOmitMarkers(markdown);
    expect(result).not.toContain('alpha');
    expect(result).not.toContain('beta');
    expect(result).toContain('before');
    expect(result).toContain('middle');
    expect(result).toContain('after');
  });

  it('handles multiline content inside an omit block', () => {
    const markdown = `start
<!-- cli:omit multi -->
line 1
line 2
line 3
<!-- /cli:omit multi -->
end`;

    expect(stripOmitMarkers(markdown)).toBe('start\nend');
  });
});
