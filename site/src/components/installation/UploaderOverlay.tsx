import clsx from 'clsx';
import { CheckCircle } from 'lucide-react';

import { MUX_URL } from '@/consts';

export type UploaderState = 'idle' | 'needs_login' | 'uploading' | 'preparing' | 'ready' | 'polling_error';

interface UploaderOverlayProps {
  state: UploaderState;
  error: string | null;
  playbackId: string | null;
  onLogin: () => void;
  onRetry: () => void;
}

/** Shared overlay container matching drop zone styling */
function OverlayWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'absolute inset-0 flex flex-col items-center justify-center gap-3',
        'bg-manila-light dark:bg-faded-black',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Renders state-based overlays on top of MuxUploader.
 *
 * - Needs_login: Login prompt
 * - Preparing: Spinner while polling for playback ID
 * - Ready: Success message with playback ID
 * - Polling_error: Error during post-upload processing (MuxUploader handles upload errors natively)
 */
export default function UploaderOverlay({ state, error, playbackId, onLogin, onRetry }: UploaderOverlayProps) {
  // No overlay needed for idle or uploading (MuxUploader handles its own UI)
  if (state === 'idle' || state === 'uploading') {
    return null;
  }

  if (state === 'needs_login') {
    return (
      <OverlayWrapper>
        <p className="text-p3 font-bold">
          To upload this video to{' '}
          <a href={MUX_URL} target="_blank" rel="noopener" className="intent:decoration-gold underline">
            Mux
          </a>
          &hellip;
        </p>
        <button
          type="button"
          onClick={onLogin}
          className="bg-bright-yellow text-faded-black text-p3 intent:bg-bright-yellow/70 inline-flex cursor-pointer items-center gap-2 rounded-xs px-4 py-2 font-bold"
        >
          Sign up or log in
        </button>
      </OverlayWrapper>
    );
  }

  if (state === 'preparing') {
    return (
      <OverlayWrapper>
        <div className="border-bright-yellow h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
        <p className="text-p3">Preparing video...</p>
      </OverlayWrapper>
    );
  }

  if (state === 'ready' && playbackId) {
    return (
      <OverlayWrapper>
        <div className="flex items-center gap-2">
          <CheckCircle size={18} className="text-orange text-p3" />
          <p className="font-bold">Ready to play</p>
        </div>
        <p className="text-p3 text-center">
          See code below, or{' '}
          <a
            href="https://dashboard.mux.com/my/video/assets"
            target="_blank"
            className="intent:decoration-gold underline"
            rel="noopener"
          >
            manage on Mux
          </a>
          .
        </p>
      </OverlayWrapper>
    );
  }

  if (state === 'polling_error') {
    return (
      <OverlayWrapper className="border-red border-solid">
        <p className="text-p3 text-red">
          Error preparing video:
          {error}
        </p>
        <button type="button" onClick={onRetry} className="text-p3 intent:decoration-gold underline">
          Try again
        </button>
      </OverlayWrapper>
    );
  }

  return null;
}
