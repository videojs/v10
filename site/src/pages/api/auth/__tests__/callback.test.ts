// @vitest-environment node

import type { APIContext } from 'astro';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as callbackHandler } from '@/pages/api/auth/callback';
import { exchangeAuthorizationCode, seal } from '@/utils/auth';

vi.mock('@/utils/auth', () => ({
  exchangeAuthorizationCode: vi.fn(),
  seal: vi.fn(),
  SESSION_COOKIE_NAME: 'session',
  INACTIVITY_EXPIRY: 300,
}));

const mockOAuthResponse = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  id_token: 'mock-id-token',
  token_type: 'bearer' as const,
  expires_in: 3600,
};

function createMockContext(params: {
  code?: string;
  state?: string;
  storedState?: string;
}): APIContext {
  const url = new URL('https://example.com/api/auth/callback');
  if (params.code) url.searchParams.set('code', params.code);
  if (params.state) url.searchParams.set('state', params.state);

  return {
    request: new Request(url.toString()),
    cookies: {
      get: vi.fn((name: string) => {
        if (name === 'state' && params.storedState) {
          return { value: params.storedState };
        }
        return undefined;
      }),
      set: vi.fn(),
      delete: vi.fn(),
    } as any,
    redirect: vi.fn((path: string) => new Response(null, { status: 302, headers: { Location: path } })),
  } as unknown as APIContext;
}

describe('callback endpoint', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exchangeAuthorizationCode).mockResolvedValue(mockOAuthResponse);
    vi.mocked(seal).mockResolvedValue('encrypted-session-data');

    vi.stubEnv('OAUTH_CLIENT_ID', 'test-client-id');
    vi.stubEnv('OAUTH_CLIENT_SECRET', 'test-client-secret');
    vi.stubEnv('OAUTH_REDIRECT_URI', 'https://example.com/callback');
    vi.stubEnv('OAUTH_URL', 'https://auth.example.com');
    vi.stubEnv('PROD', false);

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('successful authentication', () => {
    it('should complete OAuth flow successfully', async () => {
      const mockContext = createMockContext({ code: '123', state: 'abc', storedState: 'abc' });
      await callbackHandler(mockContext);

      expect(mockContext.cookies.delete).toHaveBeenCalledWith('state', { path: '/' });

      expect(exchangeAuthorizationCode).toHaveBeenCalledWith('123');

      expect(seal).toHaveBeenCalledWith(mockOAuthResponse);

      expect(mockContext.cookies.set).toHaveBeenCalledWith(
        'session',
        'encrypted-session-data',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 300,
          path: '/',
        }),
      );

      expect(mockContext.redirect).toHaveBeenCalledWith('/auth/success');
    });

    it('should use secure cookie in production', async () => {
      vi.stubEnv('PROD', true);

      const mockContext = createMockContext({ code: '123', state: 'abc', storedState: 'abc' });
      await callbackHandler(mockContext);

      expect(mockContext.cookies.set).toHaveBeenCalledWith(
        'session',
        'encrypted-session-data',
        expect.objectContaining({
          secure: true,
        }),
      );

      vi.stubEnv('PROD', false);
    });
  });
  describe('configuration validation', () => {
    it.each([
      'OAUTH_CLIENT_ID',
      'OAUTH_CLIENT_SECRET',
    ])('should redirect to error when %s is missing', async (envVar) => {
      vi.stubEnv(envVar, undefined);

      const mockContext = createMockContext({ code: '123', state: 'abc', storedState: 'abc' });
      await callbackHandler(mockContext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'OAuth configuration missing',
      );

      expect(mockContext.redirect).toHaveBeenCalledWith('/auth/error');
    });
  });

  describe('csrf protection', () => {
    it.each([
      ['state parameter is missing', { code: 'valid-code', storedState: 'valid-state-123' }],
      ['state does not match stored state', { code: 'valid-code', state: 'different-state', storedState: 'valid-state-123' }],
      ['stored state cookie is missing', { code: 'valid-code', state: 'valid-state' }],
    ])('should reject when %s', async (_description, mockParams) => {
      const mockContext = createMockContext(mockParams);
      await callbackHandler(mockContext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Invalid state parameter',
      );

      expect(mockContext.redirect).toHaveBeenCalledWith('/auth/error');
    });
  });

  describe('authorization code validation', () => {
    it('should redirect to error when code is missing', async () => {
      const mockContext = createMockContext({ state: 'valid-state', storedState: 'valid-state' });
      await callbackHandler(mockContext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Authorization code missing',
      );

      expect(mockContext.redirect).toHaveBeenCalledWith('/auth/error');
      expect(mockContext.cookies.delete).toHaveBeenCalledWith('state', { path: '/' });
    });
  });

  describe('token exchange errors', () => {
    it.each([
      ['token exchange fails', () => vi.mocked(exchangeAuthorizationCode).mockRejectedValueOnce(new Error('Invalid authorization code'))],
      ['seal fails', () => vi.mocked(seal).mockRejectedValueOnce(new Error('Encryption failed'))],
    ])('should redirect to error when %s', async (_description, setupMock) => {
      setupMock();

      const mockContext = createMockContext({ code: 'valid-code', state: 'valid-state', storedState: 'valid-state' });
      await callbackHandler(mockContext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'OAuth callback error:',
        expect.any(Error),
      );

      expect(mockContext.redirect).toHaveBeenCalledWith('/auth/error');
    });
  });
});
