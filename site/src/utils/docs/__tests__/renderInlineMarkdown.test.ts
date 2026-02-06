import { describe, expect, it } from 'vitest';
import { renderInlineMarkdown } from '../renderInlineMarkdown';

describe('renderInlineMarkdown', () => {
  it('returns plain text for a simple sentence', () => {
    expect(renderInlineMarkdown('Whether the button is disabled.')).toBe('Whether the button is disabled.');
  });

  it('unwraps a single paragraph', () => {
    const result = renderInlineMarkdown('Hello **world**.');
    expect(result).not.toMatch(/^<p/);
    expect(result).toContain('<strong class="font-semibold">world</strong>');
  });

  it('preserves multiple paragraphs', () => {
    const result = renderInlineMarkdown('First paragraph.\n\nSecond paragraph.');
    expect(result).toContain('<p');
    expect(result).toMatch(/First paragraph/);
    expect(result).toMatch(/Second paragraph/);
  });

  it('renders inline code with correct classes', () => {
    const result = renderInlineMarkdown('Use `foo` here.');
    expect(result).toContain('<code');
    expect(result).toContain('font-mono');
    expect(result).toContain('text-code');
    expect(result).toContain('foo');
  });

  it('renders strong text', () => {
    const result = renderInlineMarkdown('**bold text**');
    expect(result).toContain('<strong class="font-semibold">bold text</strong>');
  });

  it('renders emphasized text', () => {
    const result = renderInlineMarkdown('*italic text*');
    expect(result).toContain('<em class="font-medium">italic text</em>');
  });

  it('renders links with correct classes', () => {
    const result = renderInlineMarkdown('[link](https://example.com)');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('underline');
    expect(result).toContain('intent:no-underline');
  });

  it('renders unordered lists', () => {
    const result = renderInlineMarkdown('- item one\n- item two');
    expect(result).toContain('<ul');
    expect(result).toContain('list-disc');
    expect(result).toContain('<li');
    expect(result).toContain('item one');
    expect(result).toContain('item two');
  });

  it('renders ordered lists', () => {
    const result = renderInlineMarkdown('1. first\n2. second');
    expect(result).toContain('<ol');
    expect(result).toContain('list-decimal');
    expect(result).toContain('first');
    expect(result).toContain('second');
  });

  it('downgrades headings to paragraphs', () => {
    const result = renderInlineMarkdown('# Heading');
    expect(result).not.toContain('<h1');
    expect(result).toContain('Heading');
  });

  it('suppresses horizontal rules', () => {
    const result = renderInlineMarkdown('before\n\n---\n\nafter');
    expect(result).not.toContain('<hr');
  });

  it('renders a paragraph followed by a list', () => {
    const md = 'The volume level:\n\n- `0` — muted\n- `1` — max';
    const result = renderInlineMarkdown(md);
    expect(result).toContain('<p');
    expect(result).toContain('<ul');
    expect(result).toContain('<code');
  });

  it('renders fenced code blocks as inline code', () => {
    const result = renderInlineMarkdown('```\nconst x = 1;\n```');
    expect(result).toContain('<code');
    expect(result).toContain('const x = 1;');
  });

  it('escapes HTML tags inside inline code', () => {
    const result = renderInlineMarkdown('Renders a `<span>` element.');
    expect(result).toContain('&lt;span&gt;');
    expect(result).not.toContain('<span>');
  });
});
