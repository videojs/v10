import type { ProjectedImportEntry } from '../../src/types';
import { describe, expect, it } from 'vitest';
import { formatImportEntry, formatImports } from '../../src/utils/formatters/imports';

/**
 * Test suite for import formatting functions
 * Verifies structured ProjectedImportEntry → string conversion
 */
describe('import Formatting', () => {
  describe('formatImportEntry', () => {
    describe('raw Strings', () => {
      it('passes through raw string unchanged', () => {
        const entry = 'import { foo } from \'bar\';';
        expect(formatImportEntry(entry)).toBe(entry);
      });
    });

    describe('comments', () => {
      it('formats line comment', () => {
        const entry: ProjectedImportEntry = {
          type: 'comment',
          style: 'line',
          value: 'This is a comment',
        };

        expect(formatImportEntry(entry)).toBe('// This is a comment');
      });

      it('formats multi-line line comment', () => {
        const entry: ProjectedImportEntry = {
          type: 'comment',
          style: 'line',
          value: ['Line 1', 'Line 2', 'Line 3'],
        };

        expect(formatImportEntry(entry)).toBe('// Line 1\n// Line 2\n// Line 3');
      });

      it('formats block comment', () => {
        const entry: ProjectedImportEntry = {
          type: 'comment',
          style: 'block',
          value: 'This is a block comment',
        };

        expect(formatImportEntry(entry)).toBe('/*\n * This is a block comment\n */');
      });

      it('formats multi-line block comment', () => {
        const entry: ProjectedImportEntry = {
          type: 'comment',
          style: 'block',
          value: ['Line 1', 'Line 2', 'Line 3'],
        };

        expect(formatImportEntry(entry)).toBe('/*\n * Line 1\n * Line 2\n * Line 3\n */');
      });
    });

    describe('side-Effect Imports', () => {
      it('formats import with no specifiers', () => {
        const entry: ProjectedImportEntry = {
          type: 'import',
          source: '@/define/video-provider',
          specifiers: [],
        };

        expect(formatImportEntry(entry)).toBe('import \'@/define/video-provider\';');
      });

      it('formats import with undefined specifiers', () => {
        const entry: ProjectedImportEntry = {
          type: 'import',
          source: '@/icons',
        };

        expect(formatImportEntry(entry)).toBe('import \'@/icons\';');
      });
    });

    describe('default Imports', () => {
      it('formats default import without braces', () => {
        const entry: ProjectedImportEntry = {
          type: 'import',
          source: './styles.css',
          specifiers: [{ type: 'default', name: 'styles' }],
        };

        expect(formatImportEntry(entry)).toBe('import styles from \'./styles.css\';');
      });
    });

    describe('named Imports', () => {
      it('formats single named import', () => {
        const entry: ProjectedImportEntry = {
          type: 'import',
          source: '@/media/media-skin',
          specifiers: [{ type: 'named', name: 'MediaSkinElement' }],
        };

        expect(formatImportEntry(entry)).toBe('import { MediaSkinElement } from \'@/media/media-skin\';');
      });

      it('formats multiple named imports', () => {
        const entry: ProjectedImportEntry = {
          type: 'import',
          source: 'react',
          specifiers: [
            { type: 'named', name: 'useState' },
            { type: 'named', name: 'useEffect' },
            { type: 'named', name: 'useCallback' },
          ],
        };

        expect(formatImportEntry(entry)).toBe(
          'import { useState, useEffect, useCallback } from \'react\';',
        );
      });

      it('formats named import with alias', () => {
        const entry: ProjectedImportEntry = {
          type: 'import',
          source: 'some-lib',
          specifiers: [{ type: 'named', name: 'foo', alias: 'bar' }],
        };

        expect(formatImportEntry(entry)).toBe('import { foo as bar } from \'some-lib\';');
      });

      it('formats mixed named imports with and without aliases', () => {
        const entry: ProjectedImportEntry = {
          type: 'import',
          source: 'lib',
          specifiers: [
            { type: 'named', name: 'a' },
            { type: 'named', name: 'b', alias: 'B' },
            { type: 'named', name: 'c' },
          ],
        };

        expect(formatImportEntry(entry)).toBe('import { a, b as B, c } from \'lib\';');
      });
    });

    describe('namespace Imports', () => {
      it('formats namespace import', () => {
        const entry: ProjectedImportEntry = {
          type: 'import',
          source: 'utils',
          specifiers: [{ type: 'namespace', name: 'Utils' }],
        };

        expect(formatImportEntry(entry)).toBe('import { * as Utils } from \'utils\';');
      });
    });

    describe('mixed Imports', () => {
      it('formats default + named imports', () => {
        const entry: ProjectedImportEntry = {
          type: 'import',
          source: 'react',
          specifiers: [
            { type: 'default', name: 'React' },
            { type: 'named', name: 'useState' },
          ],
        };

        expect(formatImportEntry(entry)).toBe('import { React, useState } from \'react\';');
      });

      it('formats all types together', () => {
        const entry: ProjectedImportEntry = {
          type: 'import',
          source: 'lib',
          specifiers: [
            { type: 'default', name: 'Lib' },
            { type: 'namespace', name: 'NS' },
            { type: 'named', name: 'foo' },
            { type: 'named', name: 'bar', alias: 'baz' },
          ],
        };

        expect(formatImportEntry(entry)).toBe(
          'import { Lib, * as NS, foo, bar as baz } from \'lib\';',
        );
      });
    });
  });

  describe('formatImports', () => {
    it('formats array of mixed entries', () => {
      const entries: ProjectedImportEntry[] = [
        {
          type: 'import',
          source: '@/media/media-skin',
          specifiers: [{ type: 'named', name: 'MediaSkinElement' }],
        },
        {
          type: 'import',
          source: './styles.css',
          specifiers: [{ type: 'default', name: 'styles' }],
        },
        {
          type: 'comment',
          style: 'line',
          value: 'Side-effect imports',
        },
        {
          type: 'import',
          source: '@/define/video-provider',
          specifiers: [],
        },
        'import { foo } from \'bar\';', // Raw string
      ];

      const result = formatImports(entries);

      expect(result).toBe(
        'import { MediaSkinElement } from \'@/media/media-skin\';\n'
        + 'import styles from \'./styles.css\';\n'
        + '// Side-effect imports\n'
        + 'import \'@/define/video-provider\';\n'
        + 'import { foo } from \'bar\';',
      );
    });

    it('handles empty array', () => {
      const entries: ProjectedImportEntry[] = [];
      const result = formatImports(entries);

      expect(result).toBe('');
    });

    it('produces output ready for composeModule', () => {
      // Verify that formatted output is a single string ready to use
      const entries: ProjectedImportEntry[] = [
        {
          type: 'import',
          source: '@/media/media-skin',
          specifiers: [{ type: 'named', name: 'MediaSkinElement' }],
        },
        {
          type: 'import',
          source: '@/utils/custom-element',
          specifiers: [{ type: 'named', name: 'defineCustomElement' }],
        },
      ];

      const result = formatImports(entries);

      expect(result).toBe(
        'import { MediaSkinElement } from \'@/media/media-skin\';\nimport { defineCustomElement } from \'@/utils/custom-element\';',
      );
    });
  });
});
