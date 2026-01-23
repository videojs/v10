import { describe, expect, it, vi } from 'vitest';
import type { Guide, Section, Sidebar } from '../../../types/docs';
import {
  filterSidebar,
  findFirstGuide,
  findGuideBySlug,
  getAllGuideSlugs,
  getSectionsForGuide,
  getValidStylesForGuide,
} from '../sidebar';

// Mock FRAMEWORK_STYLES from @/types/docs to use our test config
// Note: This mock is hoisted, so we define MOCK_FRAMEWORK_STYLES inside the factory
vi.mock('@/types/docs', async () => {
  const actual = await vi.importActual('@/types/docs');

  // Mock framework/style configuration for tests
  // This allows tests to remain stable when the actual FRAMEWORK_STYLES changes
  const MOCK_FRAMEWORK_STYLES = {
    html: ['css', 'tailwind'],
    react: ['css', 'tailwind'],
  } as const;

  type MockFramework = keyof typeof MOCK_FRAMEWORK_STYLES;
  type MockStyle = (typeof MOCK_FRAMEWORK_STYLES)[MockFramework][number];

  return {
    ...actual,
    // Mock FRAMEWORK_STYLES to match our test config
    FRAMEWORK_STYLES: MOCK_FRAMEWORK_STYLES,

    // Mock isValidStyleForFramework to check against mock styles
    isValidStyleForFramework: (framework: MockFramework, style: string | undefined | null): style is MockStyle => {
      if (!style) return false;
      return MOCK_FRAMEWORK_STYLES[framework]?.includes(style as MockStyle) ?? false;
    },
  };
});

// Re-export the mock types for use in tests
// Prefixed with _ to indicate it's only used for type derivation
const _MOCK_FRAMEWORK_STYLES = {
  html: ['css', 'tailwind'],
  react: ['css', 'tailwind'],
} as const;

type MockFramework = keyof typeof _MOCK_FRAMEWORK_STYLES;
type MockStyle = (typeof _MOCK_FRAMEWORK_STYLES)[MockFramework][number];

describe('sidebar utilities', () => {
  // Test fixtures using mock framework/style values
  const mockGuide1: Guide = {
    slug: 'guide-1',
    frameworks: ['html', 'react'] satisfies MockFramework[],
    styles: ['css', 'tailwind'] satisfies MockStyle[],
  };

  const mockGuide2: Guide = {
    slug: 'guide-2',
    frameworks: ['react'] satisfies MockFramework[],
    styles: ['tailwind'] satisfies MockStyle[],
  };

  const mockGuide3: Guide = {
    slug: 'guide-3',
    // No restrictions - visible to all
  };

  const mockSection: Section = {
    sidebarLabel: 'Section 1',
    frameworks: ['html', 'react'] satisfies MockFramework[],
    contents: [mockGuide1, mockGuide2],
  };

  const mockSidebar: Sidebar = [mockSection, mockGuide3];

  describe('filterSidebar', () => {
    it('should filter guides based on framework', () => {
      const result = filterSidebar('html', 'css', mockSidebar);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        sidebarLabel: 'Section 1',
        contents: [mockGuide1], // guide-2 filtered out (react only)
      });
      expect(result[1]).toEqual(mockGuide3);
    });

    it('should filter guides based on style', () => {
      const result = filterSidebar('react', 'tailwind', mockSidebar);

      expect(result).toHaveLength(2);
      const section = result[0] as Section;
      expect(section.contents).toHaveLength(2);
      expect(section.contents).toContainEqual(mockGuide1);
      expect(section.contents).toContainEqual(mockGuide2);
    });

    it('should remove empty sections after filtering', () => {
      const mockEmptySection: Section = {
        sidebarLabel: 'Empty Section',
        frameworks: ['html'],
        contents: [mockGuide2], // guide-2 is react-only
      };

      const sidebar: Sidebar = [mockEmptySection];
      const result = filterSidebar('html', 'css', sidebar);

      expect(result).toHaveLength(0);
    });

    it('should keep guides with no framework/style restrictions', () => {
      const result = filterSidebar('html', 'css', [mockGuide3]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockGuide3);
    });

    it('should recursively filter nested sections', () => {
      const nestedSection: Section = {
        sidebarLabel: 'Parent',
        contents: [
          {
            sidebarLabel: 'Child',
            contents: [mockGuide1, mockGuide2],
          },
        ],
      };

      const result = filterSidebar('html', 'css', [nestedSection]);

      expect(result).toHaveLength(1);
      const parent = result[0] as Section;
      expect(parent.contents).toHaveLength(1);
      const child = parent.contents[0] as Section;
      expect(child.contents).toHaveLength(1);
      expect(child.contents[0]).toEqual(mockGuide1);
    });
  });

  describe('findFirstGuide', () => {
    it('should find the first visible guide in a sidebar', () => {
      const result = findFirstGuide('html', 'css', mockSidebar);

      expect(result).toBe('guide-1');
    });

    it('should skip guides that do not match framework/style', () => {
      const sidebar: Sidebar = [mockGuide2, mockGuide1]; // guide-2 is react-only
      const result = findFirstGuide('html', 'css', sidebar);

      expect(result).toBe('guide-1');
    });

    it('should search recursively through sections', () => {
      const nestedSidebar: Sidebar = [
        {
          sidebarLabel: 'Section',
          contents: [mockGuide1],
        },
      ];
      const result = findFirstGuide('html', 'css', nestedSidebar);

      expect(result).toBe('guide-1');
    });

    it('should throw error if no guide matches', () => {
      expect(() => {
        findFirstGuide('html', 'css', [mockGuide2]); // guide-2 is react-only
      }).toThrow('No guide found for valid combination framework "html" and style "css"');
    });

    it('should throw error for empty sidebar', () => {
      expect(() => {
        findFirstGuide('html', 'css', []);
      }).toThrow('No guide found for valid combination framework "html" and style "css"');
    });
  });

  describe('getAllGuideSlugs', () => {
    it('should extract all guide slugs from a sidebar', () => {
      const result = getAllGuideSlugs(mockSidebar);

      expect(result).toEqual(['guide-1', 'guide-2', 'guide-3']);
    });

    it('should extract slugs from nested sections', () => {
      const nestedSidebar: Sidebar = [
        {
          sidebarLabel: 'Parent',
          contents: [
            {
              sidebarLabel: 'Child',
              contents: [mockGuide1],
            },
            mockGuide2,
          ],
        },
        mockGuide3,
      ];
      const result = getAllGuideSlugs(nestedSidebar);

      expect(result).toEqual(['guide-1', 'guide-2', 'guide-3']);
    });

    it('should return empty array for empty sidebar', () => {
      const result = getAllGuideSlugs([]);

      expect(result).toEqual([]);
    });
  });

  describe('findGuideBySlug', () => {
    it('should find a guide by its slug', () => {
      const result = findGuideBySlug('guide-1', mockSidebar);

      expect(result).toEqual(mockGuide1);
    });

    it('should find a guide nested in sections', () => {
      const result = findGuideBySlug('guide-2', mockSidebar);

      expect(result).toEqual(mockGuide2);
    });

    it('should return null if guide is not found', () => {
      const result = findGuideBySlug('non-existent', mockSidebar);

      expect(result).toBeNull();
    });

    it('should search deeply nested sections', () => {
      const nestedSidebar: Sidebar = [
        {
          sidebarLabel: 'Level 1',
          contents: [
            {
              sidebarLabel: 'Level 2',
              contents: [
                {
                  sidebarLabel: 'Level 3',
                  contents: [mockGuide1],
                },
              ],
            },
          ],
        },
      ];
      const result = findGuideBySlug('guide-1', nestedSidebar);

      expect(result).toEqual(mockGuide1);
    });
  });

  describe('getSectionsForGuide', () => {
    it('should return empty array for top-level guide', () => {
      const result = getSectionsForGuide('guide-3', mockSidebar);

      expect(result).toEqual([]);
    });

    it('should return section label for guide nested in one section', () => {
      const result = getSectionsForGuide('guide-1', mockSidebar);

      expect(result).toEqual(['Section 1']);
    });

    it('should return all ancestor section labels in order', () => {
      const nestedSidebar: Sidebar = [
        {
          sidebarLabel: 'Parent',
          contents: [
            {
              sidebarLabel: 'Child',
              contents: [mockGuide1],
            },
            mockGuide2,
          ],
        },
      ];

      const result = getSectionsForGuide('guide-1', nestedSidebar);
      expect(result).toEqual(['Parent', 'Child']);

      const result2 = getSectionsForGuide('guide-2', nestedSidebar);
      expect(result2).toEqual(['Parent']);
    });

    it('should return empty array if guide is not found', () => {
      const result = getSectionsForGuide('non-existent', mockSidebar);

      expect(result).toEqual([]);
    });

    it('should handle deeply nested guides', () => {
      const deeplyNestedSidebar: Sidebar = [
        {
          sidebarLabel: 'Level 1',
          contents: [
            {
              sidebarLabel: 'Level 2',
              contents: [
                {
                  sidebarLabel: 'Level 3',
                  contents: [mockGuide1],
                },
              ],
            },
          ],
        },
      ];

      const result = getSectionsForGuide('guide-1', deeplyNestedSidebar);
      expect(result).toEqual(['Level 1', 'Level 2', 'Level 3']);
    });

    it('should return empty array for empty sidebar', () => {
      const result = getSectionsForGuide('guide-1', []);

      expect(result).toEqual([]);
    });

    it('should work with sidebar containing mixed top-level and nested guides', () => {
      const mixedSidebar: Sidebar = [
        mockGuide3, // top level
        {
          sidebarLabel: 'Getting Started',
          contents: [
            mockGuide1,
            {
              sidebarLabel: 'Advanced',
              contents: [mockGuide2],
            },
          ],
        },
      ];

      expect(getSectionsForGuide('guide-3', mixedSidebar)).toEqual([]);
      expect(getSectionsForGuide('guide-1', mixedSidebar)).toEqual(['Getting Started']);
      expect(getSectionsForGuide('guide-2', mixedSidebar)).toEqual(['Getting Started', 'Advanced']);
    });
  });

  describe('getValidStylesForGuide', () => {
    it('should return framework styles that guide supports', () => {
      const result = getValidStylesForGuide(mockGuide1, 'html');

      // Should return the intersection of mockGuide1 styles and html framework styles
      // With our mock, both have ['css', 'tailwind'], so intersection is both
      expect(result).toEqual(['css', 'tailwind']);
    });

    it('should return only styles that both framework and guide support', () => {
      const result = getValidStylesForGuide(mockGuide1, 'react');

      // Should return the intersection of mockGuide1 styles and react framework styles
      // With our mock, both have ['css', 'tailwind'], so intersection is both
      expect(result).toEqual(['css', 'tailwind']);
    });

    it('should return all framework styles if guide has no restrictions', () => {
      const result = getValidStylesForGuide(mockGuide3, 'react');

      // Since mockGuide3 has no style restrictions, it should return all framework styles
      // With our mock, react supports ['css', 'tailwind']
      expect(result).toEqual(['css', 'tailwind']);
    });

    it('should handle guide with limited style support', () => {
      const cssOnlyGuide: Guide = {
        slug: 'css-only',
        styles: ['css'] satisfies MockStyle[],
      };
      const result = getValidStylesForGuide(cssOnlyGuide, 'react');

      expect(result).toEqual(['css']);
    });

    it('should return empty array if guide does not support any framework styles', () => {
      // Guide that only supports html framework, but we check with react
      const cssOnlyGuide: Guide = {
        slug: 'css-only-test',
        styles: ['css'] satisfies MockStyle[],
        frameworks: ['html'] satisfies MockFramework[],
      };
      const result = getValidStylesForGuide(cssOnlyGuide, 'react');

      expect(result).toEqual([]);
    });

    describe('without framework parameter', () => {
      it('should return all guide styles when guide has style restrictions', () => {
        const result = getValidStylesForGuide(mockGuide1);

        expect(result).toEqual(['css', 'tailwind'] satisfies MockStyle[]);
      });

      it('should return all possible styles when guide has no restrictions', () => {
        const result = getValidStylesForGuide(mockGuide3);

        // Should include all styles from MOCK_FRAMEWORK_STYLES (deduplicated)
        // Both frameworks support ['css', 'tailwind'], so we get both
        expect(result).toEqual(expect.arrayContaining(['css', 'tailwind']));
        expect(result).toHaveLength(2);
      });

      it('should return guide-specific styles for limited support guides', () => {
        const tailwindOnlyGuide: Guide = {
          slug: 'tailwind-only',
          styles: ['tailwind'] satisfies MockStyle[],
        };
        const result = getValidStylesForGuide(tailwindOnlyGuide);

        expect(result).toEqual(['tailwind']);
      });
    });
  });

  describe('findFirstGuide with real sidebar config', () => {
    it('should return a guide for every valid framework/style combination', async () => {
      // Import the real sidebar config
      const { sidebar: realSidebar } = await import('../../../docs.config');
      const { ALL_FRAMEWORK_STYLE_COMBINATIONS } = await import('../../../types/docs');

      // Test each valid combination
      for (const { framework, style } of ALL_FRAMEWORK_STYLE_COMBINATIONS) {
        const result = findFirstGuide(framework, style, realSidebar);
        expect(result, `findFirstGuide should return a guide for ${framework}/${style}`).toBeTruthy();
        expect(typeof result).toBe('string');
      }
    });
  });

  describe('sidebar config validation', () => {
    it('should not have duplicate slugs in sidebar config', async () => {
      // Import the real sidebar config
      const { sidebar: realSidebar } = await import('../../../docs.config');

      const allSlugs = getAllGuideSlugs(realSidebar);
      const uniqueSlugs = new Set(allSlugs);

      expect(allSlugs.length).toBe(uniqueSlugs.size);

      // Also provide helpful error message if there are duplicates
      if (allSlugs.length !== uniqueSlugs.size) {
        const duplicates = allSlugs.filter((slug, index) => allSlugs.indexOf(slug) !== index);
        throw new Error(`Found duplicate slugs in sidebar config: ${[...new Set(duplicates)].join(', ')}`);
      }
    });
  });
});
