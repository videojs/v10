import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { inlineTemplatePlugin } from '../inline-template-plugin.mjs';

// Helper: run the plugin's transform on a code string.
function transform(code) {
  const plugin = inlineTemplatePlugin({ minify: true });
  const result = plugin.transform(code);
  return result?.code ?? code;
}

// Helper: extract the minified template body (between the backticks).
function minifyHTML(template) {
  const code = `/*html*/ \`${template}\``;
  const result = transform(code);
  const match = result.match(/`([\s\S]*)`/);
  return match?.[1] ?? '';
}

// ---------------------------------------------------------------------------
// HTML minification
// ---------------------------------------------------------------------------

describe('minifyHtmlQuasis', () => {
  // ------- whitespace -------

  it('collapses whitespace-only text content between tags', () => {
    // Whitespace-only text between > and < is removed entirely
    // (step 2 collapses to single space, step 3 removes inter-tag space).
    assert.equal(minifyHTML('<div>   </div>'), '<div></div>');
  });

  it('removes whitespace between tags', () => {
    assert.equal(minifyHTML('<div></div>  <span></span>'), '<div></div><span></span>');
  });

  it('trims leading whitespace from the template', () => {
    assert.equal(minifyHTML('   <div></div>'), '<div></div>');
  });

  it('trims trailing whitespace from the template', () => {
    assert.equal(minifyHTML('<div></div>   '), '<div></div>');
  });

  it('collapses newlines and indentation between tags', () => {
    const input = `
      <div>
        <span></span>
      </div>
    `;
    assert.equal(minifyHTML(input), '<div><span></span></div>');
  });

  // ------- HTML comments -------

  it('strips HTML comments', () => {
    assert.equal(minifyHTML('<!-- comment --><div></div>'), '<div></div>');
  });

  it('strips multiline HTML comments', () => {
    const input = `
      <!-- 
        multi
        line
        comment 
      -->
      <div></div>
    `;
    assert.equal(minifyHTML(input), '<div></div>');
  });

  it('strips comments between elements', () => {
    assert.equal(
      minifyHTML('<div></div><!-- separator --><span></span>'),
      '<div></div><span></span>'
    );
  });

  // ------- empty elements -------

  it('preserves empty elements', () => {
    assert.equal(minifyHTML('<slot></slot>'), '<slot></slot>');
  });

  it('preserves empty elements with attributes', () => {
    assert.equal(minifyHTML('<slot name="media"></slot>'), '<slot name="media"></slot>');
  });

  it('preserves adjacent empty slot elements', () => {
    const input = `
      <slot name="media"></slot>
      <slot></slot>
    `;
    assert.equal(minifyHTML(input), '<slot name="media"></slot><slot></slot>');
  });

  it('preserves the default slot between named slots', () => {
    const input = `
      <slot name="media"></slot>
      <slot></slot>
      <slot name="poster"></slot>
    `;
    assert.equal(
      minifyHTML(input),
      '<slot name="media"></slot><slot></slot><slot name="poster"></slot>'
    );
  });

  it('preserves empty void-like elements', () => {
    assert.equal(minifyHTML('<div></div>'), '<div></div>');
  });

  // ------- attribute values with special characters -------

  it('does not corrupt attribute values containing > <', () => {
    assert.equal(
      minifyHTML('<div data-expr="a > b < c"></div>'),
      '<div data-expr="a > b < c"></div>'
    );
  });

  it('does not corrupt single-quoted attribute values containing > <', () => {
    assert.equal(
      minifyHTML("<div data-expr='a > b < c'></div>"),
      "<div data-expr='a > b < c'></div>"
    );
  });

  it('handles attribute values with > followed by space and <', () => {
    assert.equal(
      minifyHTML('<div title="test > <value"></div>'),
      '<div title="test > <value"></div>'
    );
  });

  // ------- text content -------

  it('preserves text content inside elements', () => {
    assert.equal(minifyHTML('<span>hello world</span>'), '<span>hello world</span>');
  });

  it('preserves single space in text content between tags', () => {
    // Text-only whitespace after > that is NOT followed by < should be kept.
    assert.equal(minifyHTML('<span>hello</span> world'), '<span>hello</span> world');
  });

  // ------- realistic skin template -------

  it('correctly minifies a skin-like template', () => {
    const input = `
      <media-container class="media-default-skin">
        <!-- @deprecated slot="media" is no longer required -->
        <slot name="media"></slot>
        <slot></slot>

        <media-poster>
          <slot name="poster"></slot>
        </media-poster>
      </media-container>
    `;

    assert.equal(
      minifyHTML(input),
      '<media-container class="media-default-skin">' +
        '<slot name="media"></slot>' +
        '<slot></slot>' +
        '<media-poster><slot name="poster"></slot></media-poster>' +
        '</media-container>'
    );
  });
});

// ---------------------------------------------------------------------------
// Template expressions
// ---------------------------------------------------------------------------

describe('processTemplates (expressions)', () => {
  it('preserves template expressions', () => {
    const code = 'const html = /*html*/ `<div>${expr}</div>`;';
    const result = transform(code);
    assert.equal(result, 'const html = /*html*/ `<div>${expr}</div>`;');
  });

  it('handles multiple expressions', () => {
    const code = 'const html = /*html*/ `<div>${a}</div><span>${b}</span>`;';
    const result = transform(code);
    assert.equal(result, 'const html = /*html*/ `<div>${a}</div><span>${b}</span>`;');
  });

  it('handles expressions with nested braces', () => {
    const code = "const html = /*html*/ `<div>${fn({ class: 'icon' })}</div>`;";
    const result = transform(code);
    assert.equal(result, "const html = /*html*/ `<div>${fn({ class: 'icon' })}</div>`;");
  });

  it('handles expressions with nested template literals', () => {
    const code = 'const html = /*html*/ `<div>${`nested ${value}`}</div>`;';
    const result = transform(code);
    assert.equal(result, 'const html = /*html*/ `<div>${`nested ${value}`}</div>`;');
  });

  it('collapses whitespace around expressions', () => {
    const code = `const html = /*html*/ \`
      <div>
        \${expr}
      </div>
    \`;`;
    const result = transform(code);
    assert.equal(result, 'const html = /*html*/ `<div> ${expr} </div>`;');
  });

  it('removes inter-tag whitespace around expressions', () => {
    const code = `const html = /*html*/ \`
      <div>
        \${expr}
      </div>
      <span></span>
    \`;`;
    const result = transform(code);
    assert.equal(result, 'const html = /*html*/ `<div> ${expr} </div><span></span>`;');
  });
});

// ---------------------------------------------------------------------------
// CSS minification
// ---------------------------------------------------------------------------

describe('minifyCssQuasis', () => {
  it('minifies simple CSS', () => {
    const code = 'const css = /* css */ `  .foo  {  color: red;  }  `;';
    const result = transform(code);
    assert.match(result, /\.foo\s*\{/);
    assert.match(result, /color:\s*red/);
  });

  it('preserves CSS expressions', () => {
    const code = 'const css = /* css */ `.foo { color: ${color}; }`;';
    const result = transform(code);
    assert.match(result, /\$\{color\}/);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('returns null when minify is disabled', () => {
    const plugin = inlineTemplatePlugin({ minify: false });
    assert.equal(plugin.transform('/*html*/ `<div></div>`'), null);
  });

  it('returns null when code contains no markers', () => {
    const plugin = inlineTemplatePlugin({ minify: true });
    assert.equal(plugin.transform('const x = 1;'), null);
  });

  it('returns null when marker is not followed by a template literal', () => {
    const code = 'const marker = "/*html*/"; const x = 1;';
    const result = transform(code);
    assert.equal(result, code);
  });

  it('handles multiple HTML templates in one file', () => {
    const code = [
      'const a = /*html*/ `<div>  </div>`;',
      'const b = /*html*/ `<span>  </span>`;',
    ].join('\n');
    const result = transform(code);
    assert.match(result, /`<div><\/div>`/);
    assert.match(result, /`<span><\/span>`/);
  });
});
