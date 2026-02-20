/**
 * OAuth popup and endpoint coordination utilities for Mux uploader.
 *
 * Handles:
 * - Opening OAuth popup with proper dimensions
 * - Listening for auth-complete message from popup
 * - Coordinating the endpoint flow that pauses for auth when needed
 */

export interface AuthPopupOptions {
  authorizationUrl: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

// Browsers automatically clamp popup dimensions to fit the OS work area (per MDN),
// so no guard is needed for small screens.
const POPUP_WIDTH = 1366;
const POPUP_HEIGHT = 768;

/**
 * Opens a centered OAuth popup and listens for completion.
 *
 * - Opens popup centered on screen
 * - Falls back to redirect if popup is blocked
 * - Validates message origin before calling onSuccess
 * - Returns cleanup function to remove listener
 */
export function initiateAuthPopup(options: AuthPopupOptions): () => void {
  const { authorizationUrl, onSuccess } = options;

  const left = (window.screen.width - POPUP_WIDTH) / 2;
  const top = (window.screen.height - POPUP_HEIGHT) / 2;

  const popup = window.open(
    authorizationUrl,
    'oauth-login',
    `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top}`
  );

  if (!popup) {
    // Popup blocked - fall back to redirect
    window.location.href = authorizationUrl;
    return () => {};
  }

  const handleMessage = (event: MessageEvent) => {
    // Validate origin for security
    if (event.origin !== window.location.origin) return;
    if (event.data?.type !== 'auth-complete') return;

    window.removeEventListener('message', handleMessage);
    onSuccess();
  };

  window.addEventListener('message', handleMessage);

  return () => {
    window.removeEventListener('message', handleMessage);
  };
}

// Types for endpoint coordinator

export interface CreateUploadResult {
  data?: {
    uploadId: string;
    uploadUrl: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface LoginResult {
  data?: {
    authorizationUrl: string;
  };
  error?: {
    message: string;
  };
}

export interface EndpointCoordinatorOptions {
  createUpload: () => Promise<CreateUploadResult>;
  initiateLogin: () => Promise<LoginResult>;
  openAuthPopup: (url: string, onAuthComplete: () => void) => void;
  onStateChange?: (state: 'idle' | 'needs_login' | 'uploading') => void;
}

export interface EndpointCoordinator {
  getEndpoint: () => Promise<string>;
  getUploadId: () => string | null;
}

/**
 * Creates a coordinator that handles the auth-gated endpoint flow.
 *
 * Flow:
 * 1. Call createUpload()
 * 2. If 401: pause, initiate login, wait for popup auth-complete, retry
 * 3. Return the upload URL
 *
 * The Promise resolver pattern allows getEndpoint() to pause mid-execution
 * and resume when auth completes.
 */
export function createEndpointCoordinator(options: EndpointCoordinatorOptions): EndpointCoordinator {
  const { createUpload, initiateLogin, openAuthPopup, onStateChange } = options;

  let uploadId: string | null = null;

  async function getEndpoint(): Promise<string> {
    // Try to create upload - will fail with UNAUTHORIZED if not authenticated
    const result = await createUpload();

    if (result.error) {
      if (result.error.code === 'UNAUTHORIZED') {
        // Not logged in - show login UI and wait for auth
        onStateChange?.('needs_login');

        // Wait for auth to complete
        const uploadUrl = await waitForAuthAndRetry();
        return uploadUrl;
      }

      // Other error - propagate
      throw new Error(result.error.message);
    }

    // Authenticated - store upload ID and proceed
    uploadId = result.data!.uploadId;
    onStateChange?.('uploading');
    return result.data!.uploadUrl;
  }

  async function waitForAuthAndRetry(): Promise<string> {
    // Get authorization URL
    const loginResult = await initiateLogin();
    if (loginResult.error) {
      throw new Error(loginResult.error.message);
    }

    // Create a Promise that resolves when auth completes
    return new Promise((resolve, reject) => {
      openAuthPopup(loginResult.data!.authorizationUrl, async () => {
        // Auth completed - retry the upload creation
        const retryResult = await createUpload();

        if (retryResult.error) {
          reject(new Error(retryResult.error.message));
          return;
        }

        uploadId = retryResult.data!.uploadId;
        onStateChange?.('uploading');
        resolve(retryResult.data!.uploadUrl);
      });
    });
  }

  return {
    getEndpoint,
    getUploadId: () => uploadId,
  };
}
