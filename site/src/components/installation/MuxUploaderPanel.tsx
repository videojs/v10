import { actions } from 'astro:actions';
import type MuxUploaderElement from '@mux/mux-uploader';

import MuxUploader, {
  MuxUploaderDrop,
  MuxUploaderFileSelect,
  MuxUploaderProgress,
  MuxUploaderRetry,
  MuxUploaderStatus,
} from '@mux/mux-uploader-react';
import { useCallback, useRef, useState } from 'react';
import { muxPlaybackId, renderer } from '@/stores/installation';
import type { UploaderState } from './UploaderOverlay';

import UploaderOverlay from './UploaderOverlay';

// import './MuxUploaderPanel.module.css';

/**
 * Mux video uploader with auth-gated flow.
 *
 * Flow:
 * 1. User drops/selects file → endpoint() called
 * 2. Try to create upload URL (requires auth)
 * 3. If 401: show login overlay, wait for auth, retry
 * 4. Upload begins with returned URL
 * 5. On success: poll for playback ID
 * 6. When ready: update renderer to 'mux', store playback ID in nanostore
 */
export default function MuxUploaderPanel() {
  // Local state for upload flow (not shared across islands)
  // 'idle' | 'needs_login' | 'uploading' | 'preparing' | 'ready' | 'polling_error';
  const [state, setState] = useState<UploaderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [playbackId, setPlaybackId] = useState<string | null>(null);

  // Ref to store the promise resolver for login flow
  const loginResolverRef = useRef<((url: string) => void) | null>(null);
  // Ref to the MuxUploader element for dispatching reset events
  const uploaderRef = useRef<MuxUploaderElement>(null);

  /**
   * Endpoint function called by MuxUploader when file is selected.
   * Returns a Promise that resolves with the upload URL.
   * The upload waits for this Promise before starting.
   */
  const getEndpoint = useCallback(async (): Promise<string> => {
    // Try to create upload - will fail with 401 if not authenticated
    const result = await actions.mux.createDirectUpload({
      corsOrigin: window.location.origin,
    });

    if (result.error) {
      if (result.error.code === 'UNAUTHORIZED') {
        // Not logged in - show login UI and wait for auth
        setState('needs_login');

        // Return a Promise that resolves when login completes
        return new Promise((resolve) => {
          loginResolverRef.current = resolve;
        });
      }

      // Other error - throw and let MuxUploader display its native error UI
      throw new Error(result.error.message);
    }

    // Authenticated - store upload ID and proceed
    setUploadId(result.data.uploadId);
    setState('uploading');
    return result.data.uploadUrl;
  }, []);

  /**
   * Handles OAuth login via popup.
   * On success: fetches upload URL and resolves the pending Promise.
   */
  const handleLogin = useCallback(async () => {
    const result = await actions.auth.initiateLogin();
    if (result.error) {
      setError(result.error.message);
      setState('polling_error');
      return;
    }

    // Open login popup (centered)
    const { authorizationUrl } = result.data;
    const width = 600;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const popup = window.open(
      authorizationUrl,
      'oauth-login',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      // Popup blocked - fall back to redirect
      window.location.href = authorizationUrl;
      return;
    }

    // Listen for success message from popup
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'auth-complete') return;

      window.removeEventListener('message', handleMessage);

      // Now authenticated - fetch upload URL
      const uploadResult = await actions.mux.createDirectUpload({
        corsOrigin: window.location.origin,
      });

      if (uploadResult.error) {
        setError(uploadResult.error.message);
        setState('polling_error');
        return;
      }

      // Store upload ID and resolve the pending Promise
      setUploadId(uploadResult.data.uploadId);
      setState('uploading');
      loginResolverRef.current?.(uploadResult.data.uploadUrl);
    };

    window.addEventListener('message', handleMessage);
  }, []);

  /**
   * Polls Mux API for playback ID after upload completes.
   * Updates renderer to 'mux' and stores playback ID on success.
   */
  const pollForPlaybackId = useCallback(async () => {
    if (!uploadId) return;

    setState('preparing');

    // Phase 1: Poll until asset_id is available
    let assetId: string | undefined;
    while (!assetId) {
      await new Promise((r) => setTimeout(r, 2000));

      const result = await actions.mux.getUploadStatus({ uploadId });
      if (result.error) {
        setError(result.error.message);
        setState('polling_error');
        return;
      }
      if (result.data.status === 'errored') {
        setError('Upload processing failed');
        setState('polling_error');
        return;
      }

      assetId = result.data.assetId;
    }

    // Phase 2: Poll until playback_id is available
    let newPlaybackId: string | undefined;
    while (!newPlaybackId) {
      await new Promise((r) => setTimeout(r, 2000));

      const result = await actions.mux.getAssetStatus({ assetId });
      if (result.error) {
        setError(result.error.message);
        setState('polling_error');
        return;
      }
      if (result.data.status === 'errored') {
        setError('Asset processing failed');
        setState('polling_error');
        return;
      }
      if (result.data.status === 'ready' && result.data.playbackId) {
        newPlaybackId = result.data.playbackId;
      }
    }

    // Success! Update local state and nanostores (for cross-island use)
    setPlaybackId(newPlaybackId);
    setState('ready');
    renderer.set('mux');
    muxPlaybackId.set(newPlaybackId);
  }, [uploadId]);

  /** Resets uploader to try again after error */
  const handleRetry = useCallback(() => {
    // Reset MuxUploader's internal state
    uploaderRef.current?.dispatchEvent(new CustomEvent('reset'));

    // Reset React state
    setState('idle');
    setError(null);
    setUploadId(null);
    setPlaybackId(null);
  }, []);

  return (
    <div className="flex-1 relative rounded-xl border border-dashed border-light-40 overflow-hidden dark:border-dark-80">
      <MuxUploader
        ref={uploaderRef}
        id="mux-uploader"
        className="hidden"
        noDrop
        noProgress
        noStatus
        noRetry
        endpoint={getEndpoint}
        onSuccess={pollForPlaybackId}
      />
      {/* Custom Mux Uploader UI */}
      <MuxUploaderDrop
        muxUploader="mux-uploader"
        className="w-full h-full flex flex-col items-center justify-center p-4"
        overlay
        overlayText="Let it go"
      >
        <span slot="heading" className="text-lg font-medium mb-2">
          Drop a video
        </span>
        <span slot="separator" className="text-sm block text-dark-40 dark:text-light-40 mb-3">
          — or —
        </span>
        <MuxUploaderFileSelect muxUploader="mux-uploader">
          <button
            type="button"
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-yellow text-dark-100 rounded-lg text-sm font-medium intent:bg-yellow/70 transition-colors"
          >
            Select a file
          </button>
        </MuxUploaderFileSelect>
        <MuxUploaderStatus muxUploader="mux-uploader" />
        <MuxUploaderRetry muxUploader="mux-uploader" />
        <MuxUploaderProgress type="percentage" muxUploader="mux-uploader" />
      </MuxUploaderDrop>

      {/* TODO add a pre-hydration loading state */}
      <UploaderOverlay
        state={state}
        error={error}
        playbackId={playbackId}
        onLogin={handleLogin}
        onRetry={handleRetry}
      />
    </div>
  );
}
