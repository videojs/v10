import { describe, expect, it, vi } from 'vitest';
import type { Guide, Sidebar } from '../../../types/docs';
import { resolveDocsLinkUrl, resolveFrameworkChange, resolveIndexRedirect } from '../routing';

// Mock the validation functions from @/types/docs to use mock framework/style configuration
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

  return {
    ...actual,
    // Mock FRAMEWORK_STYLES to match our test config
    FRAMEWORK_STYLES: MOCK_FRAMEWORK_STYLES,

    // Mock DEFAULT_FRAMEWORK
    DEFAULT_FRAMEWORK: 'react' as const,

    // Mock isValidFramework to check against mock frameworks
    isValidFramework: (value: string | undefined | null): value is MockFramework => {
      if (!value) return false;
      return value === 'html' || value === 'react';
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

describe('routing utilities', () => {
  // Test fixtures - comprehensive mock sidebar for testing
  const guideForEveryone: Guide = {
    slug: 'concepts/everyone',
    // No restrictions - visible to all
  };

  const guideReactOnly: Guide = {
    slug: 'concepts/react-only',
    frameworks: ['react'] satisfies MockFramework[],
  };

  const guideHtmlOnly: Guide = {
    slug: 'how-to/html-only',
    frameworks: ['html'] satisfies MockFramework[],
  };

  const mockSidebar: Sidebar = [
    {
      sidebarLabel: 'Getting started',
      contents: [guideForEveryone],
    },
    {
      sidebarLabel: 'Concepts',
      contents: [guideReactOnly],
    },
    guideHtmlOnly,
  ];

  describe('resolveIndexRedirect', () => {
    describe('with framework param', () => {
      it('should use validated params.framework', () => {
        const result = resolveIndexRedirect(
          {
            preferences: { framework: null },
            params: { framework: 'react' },
          },
          mockSidebar
        );

        expect(result.selectedFramework).toBe('react');
        expect(result.selectedSlug).toBeTruthy();
        expect(result.url).toContain('/docs/framework/react/');
        expect(result.reason).toContain('params.framework');
      });

      it('should throw error for invalid framework param', () => {
        expect(() => {
          resolveIndexRedirect({
            preferences: { framework: null },
            params: { framework: 'invalid' },
          });
        }).toThrow('Invalid framework param: invalid');
      });
    });

    describe('with no params', () => {
      it('should use framework preference when valid', () => {
        const result = resolveIndexRedirect(
          {
            preferences: { framework: 'html' },
            params: {},
          },
          mockSidebar
        );

        expect(result.selectedFramework).toBe('html');
        expect(result.reason).toContain('preferences.framework');
      });

      it('should use default framework when no preferences', () => {
        const result = resolveIndexRedirect({
          preferences: { framework: null },
          params: {},
        });

        expect(result.selectedFramework).toBe('react'); // DEFAULT_FRAMEWORK
        expect(result.reason).toContain('default framework');
      });

      it('should use default framework when framework preference invalid', () => {
        const result = resolveIndexRedirect({
          preferences: { framework: 'invalid' },
          params: {},
        });

        expect(result.selectedFramework).toBe('react'); // DEFAULT_FRAMEWORK
        expect(result.reason).toContain('default framework');
      });
    });

    describe('slug selection', () => {
      it('should always select a valid slug for the framework', () => {
        const result = resolveIndexRedirect({
          preferences: { framework: 'react' },
          params: {},
        });

        expect(result.selectedSlug).toBeTruthy();
        expect(typeof result.selectedSlug).toBe('string');
      });

      it('should build correct URL', () => {
        const result = resolveIndexRedirect({
          preferences: { framework: 'react' },
          params: {},
        });

        expect(result.url).toBe(`/docs/framework/react/${result.selectedSlug}`);
      });
    });
  });

  describe('resolveFrameworkChange', () => {
    describe('slug retention', () => {
      it('should keep slug and use replace when slug visible in new framework', () => {
        const result = resolveFrameworkChange(
          {
            currentFramework: 'html',
            currentSlug: 'concepts/everyone', // visible to all
            newFramework: 'react',
          },
          mockSidebar
        );

        expect(result.selectedSlug).toBe('concepts/everyone');
        expect(result.slugChanged).toBe(false);
        expect(result.shouldReplace).toBe(true);
        expect(result.reason).toContain('kept slug');
      });

      it('should change slug and not use replace when slug not visible in new framework', () => {
        const result = resolveFrameworkChange(
          {
            currentFramework: 'html',
            currentSlug: 'how-to/html-only',
            newFramework: 'react',
          },
          mockSidebar
        );

        expect(result.selectedSlug).not.toBe('how-to/html-only');
        expect(result.slugChanged).toBe(true);
        expect(result.shouldReplace).toBe(false);
        expect(result.reason).toContain('changed slug');
      });
    });

    describe('validation', () => {
      it('should throw error for invalid new framework', () => {
        expect(() => {
          resolveFrameworkChange({
            currentFramework: 'react',
            currentSlug: 'concepts/everyone',
            // @ts-expect-error Testing invalid input
            newFramework: 'invalid',
          });
        }).toThrow('Invalid framework: invalid');
      });
    });

    describe('url building', () => {
      it('should build correct URL', () => {
        const result = resolveFrameworkChange(
          {
            currentFramework: 'html',
            currentSlug: 'concepts/everyone',
            newFramework: 'react',
          },
          mockSidebar
        );

        expect(result.url).toBe('/docs/framework/react/concepts/everyone');
      });
    });
  });

  describe('resolveDocsLinkUrl', () => {
    describe('priority 1: keep framework', () => {
      it('should keep framework when slug visible in current context', () => {
        const result = resolveDocsLinkUrl(
          {
            targetSlug: 'concepts/everyone',
            contextFramework: 'react',
          },
          mockSidebar
        );

        expect(result.selectedFramework).toBe('react');
        expect(result.selectedSlug).toBe('concepts/everyone');
        expect(result.priorityLevel).toBe(1);
        expect(result.reason).toContain('Priority 1');
      });

      it('should use priority 1 for guide with matching framework restriction', () => {
        const result = resolveDocsLinkUrl(
          {
            targetSlug: 'concepts/react-only',
            contextFramework: 'react',
          },
          mockSidebar
        );

        expect(result.selectedFramework).toBe('react');
        expect(result.priorityLevel).toBe(1);
      });
    });

    describe('priority 2: change framework', () => {
      it("should change to guide's first valid framework", () => {
        const result = resolveDocsLinkUrl(
          {
            targetSlug: 'concepts/react-only',
            contextFramework: 'html', // react-only not visible in html
          },
          mockSidebar
        );

        expect(result.selectedFramework).toBe('react');
        expect(result.selectedSlug).toBe('concepts/react-only');
        expect(result.priorityLevel).toBe(2);
        expect(result.reason).toContain('Priority 2');
      });
    });

    describe('slug pinning', () => {
      it('should always use the target slug', () => {
        const result = resolveDocsLinkUrl(
          {
            targetSlug: 'concepts/everyone',
            contextFramework: 'html',
          },
          mockSidebar
        );

        expect(result.selectedSlug).toBe('concepts/everyone');
      });
    });

    describe('validation', () => {
      it('should throw error for non-existent slug', () => {
        expect(() => {
          resolveDocsLinkUrl(
            {
              targetSlug: 'non-existent',
              contextFramework: 'react',
            },
            mockSidebar
          );
        }).toThrow('No guide found with slug "non-existent"');
      });

      it('should throw error for invalid context framework', () => {
        expect(() => {
          resolveDocsLinkUrl(
            {
              targetSlug: 'concepts/everyone',
              // @ts-expect-error Testing invalid input
              contextFramework: 'invalid',
            },
            mockSidebar
          );
        }).toThrow('Invalid context framework: invalid');
      });
    });

    describe('url building', () => {
      it('should build correct URL', () => {
        const result = resolveDocsLinkUrl(
          {
            targetSlug: 'concepts/everyone',
            contextFramework: 'react',
          },
          mockSidebar
        );

        expect(result.url).toBe('/docs/framework/react/concepts/everyone');
      });
    });
  });
});
