import type { CategorizedContext, CategorizedImport } from '../../src/configs/types';
import type { ProjectedImportEntry } from '../../src/types';
import { describe, expect, it } from 'vitest';
import { projectImports } from '../../src/configs/videojs-react-skin/projectors/imports';

/**
 * Test suite for imports projection
 * Verifies projection produces correct ProjectedImportEntry[] output
 */
describe('imports Projection', () => {
  function createContext(imports: CategorizedImport[]): CategorizedContext {
    return {
      imports,
      classNames: [],
      jsx: {
        type: 'JSXElement',
        name: 'div',
        attributes: {},
        children: [],
        category: 'native-element',
      },
      defaultExport: {
        name: 'TestComponent',
        category: 'react-functional-component',
      },
      projectionState: {},
    };
  }

  describe('base Imports', () => {
    it('always includes MediaSkinElement and defineCustomElement', () => {
      const context = createContext([]);
      const result = projectImports(context, {});

      // Base imports + video-provider comment + import = 4 entries
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        type: 'import',
        source: '@/media/media-skin',
        specifiers: [{ type: 'named', name: 'MediaSkinElement' }],
      });
      expect(result[1]).toEqual({
        type: 'import',
        source: '@/utils/custom-element',
        specifiers: [{ type: 'named', name: 'defineCustomElement' }],
      });
      // video-provider comment and import always included
      expect(result[2]).toMatchObject({ type: 'comment' });
      expect(result[3]).toMatchObject({ type: 'import', source: '@/define/video-provider' });
    });
  });

  describe('style Imports', () => {
    it('transforms TypeScript style import to CSS', () => {
      const styleImport: CategorizedImport = {
        source: './styles.ts',
        specifiers: { named: [], default: 'styles' },
        category: 'style',
      };

      const context = createContext([styleImport]);
      const result = projectImports(context, { styleVariableName: 'styles' });

      const cssImport = result.find(
        (entry): entry is Extract<ProjectedImportEntry, { type: 'import' }> =>
          typeof entry === 'object' && entry.type === 'import' && entry.source.endsWith('.css'),
      );

      expect(cssImport).toBeDefined();
      expect(cssImport?.source).toBe('./styles.css');
      expect(cssImport?.specifiers).toEqual([{ type: 'default', name: 'styles' }]);
    });

    it('transforms style import without extension', () => {
      const styleImport: CategorizedImport = {
        source: './styles',
        specifiers: { named: [], default: 'styles' },
        category: 'style',
      };

      const context = createContext([styleImport]);
      const result = projectImports(context, { styleVariableName: 'styles' });

      const cssImport = result.find(
        (entry): entry is Extract<ProjectedImportEntry, { type: 'import' }> =>
          typeof entry === 'object' && entry.type === 'import' && entry.source.endsWith('.css'),
      );

      expect(cssImport?.source).toBe('./styles.css');
    });
  });

  describe('vJS Component Imports', () => {
    it('transforms component imports to side-effect define imports', () => {
      const componentImport: CategorizedImport = {
        source: '@videojs/react',
        specifiers: { named: ['PlayButton', 'MuteButton'], default: undefined },
        category: 'vjs-component',
      };

      const context = createContext([componentImport]);
      const result = projectImports(context, {});

      // Should include video-provider comment and import
      const comment = result.find(
        (entry): entry is Extract<ProjectedImportEntry, { type: 'comment' }> =>
          typeof entry === 'object' && entry.type === 'comment',
      );
      expect(comment).toBeDefined();
      expect(comment?.style).toBe('line');
      expect(comment?.value).toContain('video-provider');

      const videoProviderImport = result.find(
        (entry): entry is Extract<ProjectedImportEntry, { type: 'import' }> =>
          typeof entry === 'object' && entry.type === 'import' && entry.source === '@/define/video-provider',
      );
      expect(videoProviderImport).toBeDefined();
      expect(videoProviderImport?.specifiers).toEqual([]);

      // Should include component define imports (sorted)
      const playButtonImport = result.find(
        (entry): entry is Extract<ProjectedImportEntry, { type: 'import' }> =>
          typeof entry === 'object' && entry.type === 'import' && entry.source === '@/define/media-play-button',
      );
      expect(playButtonImport).toBeDefined();
      expect(playButtonImport?.specifiers).toEqual([]);

      const muteButtonImport = result.find(
        (entry): entry is Extract<ProjectedImportEntry, { type: 'import' }> =>
          typeof entry === 'object' && entry.type === 'import' && entry.source === '@/define/media-mute-button',
      );
      expect(muteButtonImport).toBeDefined();
    });

    it('sorts component imports alphabetically by element name', () => {
      const componentImport: CategorizedImport = {
        source: '@videojs/react',
        specifiers: { named: ['VolumeSlider', 'PlayButton', 'MuteButton'], default: undefined },
        category: 'vjs-component',
      };

      const context = createContext([componentImport]);
      const result = projectImports(context, {});

      const defineImports = result.filter(
        (entry): entry is Extract<ProjectedImportEntry, { type: 'import' }> =>
          typeof entry === 'object'
          && entry.type === 'import'
          && entry.source.startsWith('@/define/')
          && entry.source !== '@/define/video-provider',
      );

      expect(defineImports[0].source).toBe('@/define/media-mute-button');
      expect(defineImports[1].source).toBe('@/define/media-play-button');
      expect(defineImports[2].source).toBe('@/define/media-volume-slider');
    });
  });

  describe('vJS Icon Imports', () => {
    it('collapses multiple icon imports to single side-effect import', () => {
      const iconImport1: CategorizedImport = {
        source: '@videojs/react/icons',
        specifiers: { named: ['PlayIcon', 'PauseIcon'], default: undefined },
        category: 'vjs-icon',
      };

      const iconImport2: CategorizedImport = {
        source: '@/icons',
        specifiers: { named: ['VolumeIcon'], default: undefined },
        category: 'vjs-icon',
      };

      const context = createContext([iconImport1, iconImport2]);
      const result = projectImports(context, {});

      const iconImports = result.filter(
        (entry): entry is Extract<ProjectedImportEntry, { type: 'import' }> =>
          typeof entry === 'object' && entry.type === 'import' && entry.source === '@/icons',
      );

      // Should only have ONE @/icons import despite multiple source imports
      expect(iconImports).toHaveLength(1);
      expect(iconImports[0].specifiers).toEqual([]);
    });
  });

  describe('framework Imports', () => {
    it('removes framework imports (React, PropsWithChildren, etc.)', () => {
      const frameworkImport: CategorizedImport = {
        source: 'react',
        specifiers: { named: ['useState', 'useEffect'], default: 'React' },
        category: 'framework',
      };

      const context = createContext([frameworkImport]);
      const result = projectImports(context, {});

      // Should NOT include any react imports
      const reactImport = result.find(
        (entry): entry is Extract<ProjectedImportEntry, { type: 'import' }> =>
          typeof entry === 'object' && entry.type === 'import' && entry.source === 'react',
      );

      expect(reactImport).toBeUndefined();
    });
  });

  describe('vJS Core Imports', () => {
    it('removes vjs-core imports (base imports added separately)', () => {
      const coreImport: CategorizedImport = {
        source: '@videojs/core',
        specifiers: { named: ['MediaSkinElement'], default: undefined },
        category: 'vjs-core',
      };

      const context = createContext([coreImport]);
      const result = projectImports(context, {});

      // Should NOT include the categorized core import
      // (base imports are always added, but not from the categorized imports)
      const coreImports = result.filter(
        (entry): entry is Extract<ProjectedImportEntry, { type: 'import' }> =>
          typeof entry === 'object' && entry.type === 'import' && entry.source === '@videojs/core',
      );

      expect(coreImports).toHaveLength(0);
    });
  });

  // External imports are currently unsupported
  describe.skip('external Imports', () => {
    it('preserves external imports as-is', () => {
      const externalImport: CategorizedImport = {
        source: 'some-external-lib',
        specifiers: { named: ['foo', 'bar'], default: 'lib' },
        category: 'external',
      };

      const context = createContext([externalImport]);
      const result = projectImports(context, {});

      const external = result.find(
        (entry): entry is Extract<ProjectedImportEntry, { type: 'import' }> =>
          typeof entry === 'object' && entry.type === 'import' && entry.source === 'some-external-lib',
      );

      expect(external).toBeDefined();
      expect(external?.specifiers).toContainEqual({ type: 'default', name: 'lib' });
      expect(external?.specifiers).toContainEqual({ type: 'named', name: 'foo' });
      expect(external?.specifiers).toContainEqual({ type: 'named', name: 'bar' });
    });
  });

  describe('complete Integration', () => {
    it('produces correct structure for realistic skin imports', () => {
      const imports: CategorizedImport[] = [
        {
          source: 'react',
          specifiers: { named: [], default: 'React' },
          category: 'framework',
        },
        {
          source: './styles.ts',
          specifiers: { named: [], default: 'styles' },
          category: 'style',
        },
        {
          source: '@videojs/react',
          specifiers: { named: ['PlayButton', 'MediaContainer'], default: undefined },
          category: 'vjs-component',
        },
        {
          source: '@videojs/react/icons',
          specifiers: { named: ['PlayIcon', 'PauseIcon'], default: undefined },
          category: 'vjs-icon',
        },
      ];

      const context = createContext(imports);
      const result = projectImports(context, {});

      // Verify structure order:
      // 1. Base imports (2)
      expect(result[0]).toMatchObject({ type: 'import', source: '@/media/media-skin' });
      expect(result[1]).toMatchObject({ type: 'import', source: '@/utils/custom-element' });

      // 2. Style import (1)
      expect(result[2]).toMatchObject({ type: 'import', source: './styles.css' });

      // 3. video-provider comment + import (2)
      expect(result[3]).toMatchObject({ type: 'comment' });
      expect(result[4]).toMatchObject({ type: 'import', source: '@/define/video-provider' });

      // 4. Component define imports (2, sorted)
      expect(result[5]).toMatchObject({ type: 'import', source: '@/define/media-container' });
      expect(result[6]).toMatchObject({ type: 'import', source: '@/define/media-play-button' });

      // 5. Icons import (1)
      expect(result[7]).toMatchObject({ type: 'import', source: '@/icons' });

      // Total: 8 entries
      expect(result).toHaveLength(8);

      // Framework import should NOT be present
      const reactImport = result.find(
        (entry): entry is Extract<ProjectedImportEntry, { type: 'import' }> =>
          typeof entry === 'object' && entry.type === 'import' && entry.source === 'react',
      );
      expect(reactImport).toBeUndefined();
    });
  });
});
