import clsx from 'clsx';
import { CheckCircle } from 'lucide-react';

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
 * - needs_login: Login prompt
 * - preparing: Spinner while polling for playback ID
 * - ready: Success message with playback ID
 * - polling_error: Error during post-upload processing (MuxUploader handles upload errors natively)
 */
export default function UploaderOverlay({ state, error, playbackId, onLogin, onRetry }: UploaderOverlayProps) {
  // No overlay needed for idle or uploading (MuxUploader handles its own UI)
  if (state === 'idle' || state === 'uploading') {
    return null;
  }

  if (state === 'needs_login') {
    return (
      <OverlayWrapper>
        <p className="text-p3 font-bold">To upload this video to Mux&hellip;</p>
        <button
          type="button"
          onClick={onLogin}
          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-bright-yellow text-faded-black rounded-xs text-p3 font-bold intent:bg-bright-yellow/70"
        >
          Sign up or log in
        </button>
      </OverlayWrapper>
    );
  }

  if (state === 'preparing') {
    return (
      <OverlayWrapper>
        <div className="w-6 h-6 border-2 border-bright-yellow border-t-transparent rounded-full animate-spin" />
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
        <p className="text-center text-p3">
          See code below, or{' '}
          <a
            href="https://dashboard.mux.com/my/video/assets"
            target="_blank"
            className="underline intent:no-underline"
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
      <OverlayWrapper className="border-solid border-red">
        <p className="text-p3 text-red">
          Error preparing video:
          {error}
        </p>
        <button type="button" onClick={onRetry} className="text-p3 underline intent:no-underline">
          Try again
        </button>
      </OverlayWrapper>
    );
  }

  return null;
}
