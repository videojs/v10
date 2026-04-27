import { describe, expect, it } from 'vitest';
import { normalizeImports } from '../normalize-imports.js';

describe('normalizeImports', () => {
  it('consolidates named imports from the same module', () => {
    const input = ["import { Foo } from 'mod';", "import { Bar } from 'mod';", '', 'const x = 1;'].join('\n');

    expect(normalizeImports(input)).toBe("import { Foo, Bar } from 'mod';\n\nconst x = 1;");
  });

  it('converts statement-level import type to inline type specifiers', () => {
    const input = ["import type { Poster } from 'mod';", '', 'const x = 1;'].join('\n');

    expect(normalizeImports(input)).toBe("import { type Poster } from 'mod';\n\nconst x = 1;");
  });

  it('preserves inline type specifiers without duplicating the type keyword', () => {
    const input = ["import { type CSSProperties, forwardRef, type ReactNode } from 'react';", '', 'const x = 1;'].join(
      '\n'
    );

    expect(normalizeImports(input)).toBe(
      "import { type CSSProperties, forwardRef, type ReactNode } from 'react';\n\nconst x = 1;"
    );
  });

  it('deduplicates when same name is imported as both value and type', () => {
    const input = ["import { Poster } from 'mod';", "import type { Poster } from 'mod';", '', 'const x = 1;'].join(
      '\n'
    );

    // Value import subsumes type import
    expect(normalizeImports(input)).toBe("import { Poster } from 'mod';\n\nconst x = 1;");
  });

  it('deduplicates when type appears before value', () => {
    const input = ["import type { Poster } from 'mod';", "import { Poster } from 'mod';", '', 'const x = 1;'].join(
      '\n'
    );

    expect(normalizeImports(input)).toBe("import { Poster } from 'mod';\n\nconst x = 1;");
  });

  it('keeps type when only imported as type across statements', () => {
    const input = [
      "import type { Poster } from 'mod';",
      "import type { RenderProp } from 'mod';",
      '',
      'const x = 1;',
    ].join('\n');

    expect(normalizeImports(input)).toBe("import { type Poster, type RenderProp } from 'mod';\n\nconst x = 1;");
  });

  it('handles mixed value and type imports from the same module', () => {
    const input = ["import { Foo } from 'mod';", "import type { Bar } from 'mod';", '', 'const x = 1;'].join('\n');

    expect(normalizeImports(input)).toBe("import { Foo, type Bar } from 'mod';\n\nconst x = 1;");
  });

  it('handles aliased imports', () => {
    const input = ["import { Foo as Bar } from 'mod';", '', 'const x = 1;'].join('\n');

    expect(normalizeImports(input)).toBe("import { Foo as Bar } from 'mod';\n\nconst x = 1;");
  });

  it('handles type aliased imports', () => {
    const input = ["import type { Foo as Bar } from 'mod';", '', 'const x = 1;'].join('\n');

    expect(normalizeImports(input)).toBe("import { type Foo as Bar } from 'mod';\n\nconst x = 1;");
  });

  it('preserves side-effect imports', () => {
    const input = ["import './styles.css';", '', 'const x = 1;'].join('\n');

    expect(normalizeImports(input)).toBe("import './styles.css';\n\nconst x = 1;");
  });

  it('preserves default imports as raw imports', () => {
    const input = ["import React from 'react';", '', 'const x = 1;'].join('\n');

    expect(normalizeImports(input)).toBe("import React from 'react';\n\nconst x = 1;");
  });

  it('preserves namespace imports as raw imports', () => {
    const input = ["import * as React from 'react';", '', 'const x = 1;'].join('\n');

    expect(normalizeImports(input)).toBe("import * as React from 'react';\n\nconst x = 1;");
  });

  it('orders: side-effect, raw, then named imports', () => {
    const input = [
      "import { useState } from 'react';",
      "import './styles.css';",
      "import React from 'react';",
      '',
      'const x = 1;',
    ].join('\n');

    const result = normalizeImports(input);
    const lines = result.split('\n');
    expect(lines[0]).toBe("import './styles.css';");
    expect(lines[1]).toBe("import React from 'react';");
    expect(lines[2]).toBe("import { useState } from 'react';");
  });

  it('returns only body when there are no imports', () => {
    expect(normalizeImports('const x = 1;')).toBe('const x = 1;');
  });

  it('handles the exact broken example from the issue', () => {
    const input = [
      "import { type CSSProperties, type ComponentProps, forwardRef, type ReactNode, isValidElement } from 'react';",
      "import { Poster, Container, usePlayer, BufferingIndicator } from '@videojs/react';",
      "import type { Poster, RenderProp } from '@videojs/react';",
      '',
      'const x = 1;',
    ].join('\n');

    const result = normalizeImports(input);

    // No duplicate type keyword
    expect(result).not.toContain('type type');
    // No duplicate Poster (value subsumes type)
    expect(result).not.toMatch(/Poster.*type Poster|type Poster.*Poster/);
    // Value imports preserved
    expect(result).toContain('Poster');
    expect(result).toContain('Container');
    // Type-only imports preserved as type
    expect(result).toContain('type RenderProp');
    // Inline type specifiers preserved correctly
    expect(result).toContain('type CSSProperties');
    expect(result).toContain('type ComponentProps');
    expect(result).toContain('type ReactNode');
    // Value imports remain as values
    expect(result).toContain('forwardRef');
    expect(result).toContain('isValidElement');
  });
});
