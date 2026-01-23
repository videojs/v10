import type { AstroCookies } from 'astro';
import { describe, expect, it, vi } from 'vitest';
import { ALL_FRAMEWORK_STYLE_COMBINATIONS } from '@/types/docs';
import { FRAMEWORK_COOKIE, getPreferencesServer, STYLE_COOKIE, setPreferenceClient } from '../preferences';

describe('preferences utilities', () => {
  // Derive test values from actual configuration to stay independent of supported languages
  const firstCombo = ALL_FRAMEWORK_STYLE_COMBINATIONS[0];
  const firstFramework = firstCombo.framework;
  const firstStyle = firstCombo.style;

  describe('getPreferencesServer', () => {
    it('should return null preferences when no cookies are set', () => {
      const mockCookies = {
        has: vi.fn().mockReturnValue(false),
        get: vi.fn(),
      } as unknown as AstroCookies;

      const result = getPreferencesServer(mockCookies);

      expect(result).toEqual({ framework: null, style: null });
    });

    it('should return framework preference when only framework cookie is set', () => {
      const mockCookies = {
        has: vi.fn((name: string) => name === FRAMEWORK_COOKIE),
        get: vi.fn((name: string) => {
          if (name === FRAMEWORK_COOKIE) {
            return { value: firstFramework };
          }
          return null;
        }),
      } as unknown as AstroCookies;

      const result = getPreferencesServer(mockCookies);

      expect(result).toEqual({ framework: firstFramework, style: null });
    });

    it('should return both preferences when both cookies are set with valid values', () => {
      const mockCookies = {
        has: vi.fn().mockReturnValue(true),
        get: vi.fn((name: string) => {
          if (name === FRAMEWORK_COOKIE) {
            return { value: firstFramework };
          }
          if (name === STYLE_COOKIE) {
            return { value: firstStyle };
          }
          return null;
        }),
      } as unknown as AstroCookies;

      const result = getPreferencesServer(mockCookies);

      expect(result).toEqual({ framework: firstFramework, style: firstStyle });
    });

    it('should ignore invalid framework cookie', () => {
      const mockCookies = {
        has: vi.fn().mockReturnValue(true),
        get: vi.fn((name: string) => {
          if (name === FRAMEWORK_COOKIE) {
            return { value: 'invalid-framework' };
          }
          if (name === STYLE_COOKIE) {
            return { value: firstStyle };
          }
          return null;
        }),
      } as unknown as AstroCookies;

      const result = getPreferencesServer(mockCookies);

      expect(result).toEqual({ framework: null, style: null });
    });

    it('should ignore style cookie when framework is null', () => {
      const mockCookies = {
        has: vi.fn((name: string) => name === STYLE_COOKIE),
        get: vi.fn((name: string) => {
          if (name === STYLE_COOKIE) {
            return { value: firstStyle };
          }
          return null;
        }),
      } as unknown as AstroCookies;

      const result = getPreferencesServer(mockCookies);

      expect(result).toEqual({ framework: null, style: null });
    });

    it('should ignore style cookie when it is invalid for the framework', () => {
      const mockCookies = {
        has: vi.fn().mockReturnValue(true),
        get: vi.fn((name: string) => {
          if (name === FRAMEWORK_COOKIE) {
            return { value: firstFramework };
          }
          if (name === STYLE_COOKIE) {
            return { value: 'invalid-style' }; // Not valid for any framework
          }
          return null;
        }),
      } as unknown as AstroCookies;

      const result = getPreferencesServer(mockCookies);

      expect(result).toEqual({ framework: firstFramework, style: null });
    });

    it('should accept valid framework/style combinations', () => {
      const testCases = ALL_FRAMEWORK_STYLE_COMBINATIONS;

      for (const { framework, style } of testCases) {
        const mockCookies = {
          has: vi.fn().mockReturnValue(true),
          get: vi.fn((name: string) => {
            if (name === FRAMEWORK_COOKIE) {
              return { value: framework };
            }
            if (name === STYLE_COOKIE) {
              return { value: style };
            }
            return null;
          }),
        } as unknown as AstroCookies;

        const result = getPreferencesServer(mockCookies);

        expect(result).toEqual({ framework, style });
      }
    });
  });

  describe('setPreferenceClient', () => {
    it('should set both framework and style cookies', () => {
      // Mock document.cookie
      const cookies: string[] = [];
      Object.defineProperty(document, 'cookie', {
        get: () => cookies.join('; '),
        set: (value: string) => {
          cookies.push(value);
        },
        configurable: true,
      });

      setPreferenceClient(firstFramework, firstStyle);

      expect(cookies).toHaveLength(2);
      expect(cookies[0]).toContain(`vjs_docs_framework=${firstFramework}`);
      expect(cookies[0]).toContain('max-age=31536000');
      expect(cookies[0]).toContain('path=/');
      expect(cookies[0]).toContain('samesite=lax');
      expect(cookies[1]).toContain(`vjs_docs_style=${firstStyle}`);
    });

    it('should throw error for invalid framework', () => {
      expect(() => {
        // @ts-expect-error Testing invalid input
        setPreferenceClient('invalid-framework', 'css');
      }).toThrow('Invalid framework: invalid-framework');
    });

    it('should throw error for invalid style for framework', () => {
      expect(() => {
        // @ts-expect-error Testing invalid input
        setPreferenceClient(firstFramework, 'invalid-style');
      }).toThrow(`Invalid style "invalid-style" for framework "${firstFramework}"`);
    });

    it('should accept all valid framework/style combinations', () => {
      const testCases = ALL_FRAMEWORK_STYLE_COMBINATIONS;

      for (const { framework, style } of testCases) {
        // Mock document.cookie
        const cookies: string[] = [];
        Object.defineProperty(document, 'cookie', {
          get: () => cookies.join('; '),
          set: (value: string) => {
            cookies.push(value);
          },
          configurable: true,
        });

        expect(() => {
          setPreferenceClient(framework, style);
        }).not.toThrow();
      }
    });

    it('should do nothing when document is undefined (SSR)', () => {
      const originalDocument = globalThis.document;
      // @ts-expect-error Testing SSR scenario
      globalThis.document = undefined;

      expect(() => {
        setPreferenceClient(firstFramework, firstStyle);
      }).not.toThrow();

      globalThis.document = originalDocument;
    });
  });
});
