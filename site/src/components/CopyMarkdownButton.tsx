import clsx from 'clsx';
import { CheckIcon } from 'lucide-react';
import { useState } from 'react';
import useIsHydrated from '@/utils/useIsHydrated';

export interface CopyMarkdownButtonProps {
  className?: string;
  style?: React.CSSProperties;
  timeout?: number;
}

type CopyState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'error'; message: string };

export default function CopyMarkdownButton({ className, style }: CopyMarkdownButtonProps) {
  const [state, setState] = useState<CopyState>({ status: 'idle' });
  const isHydrated = useIsHydrated();
  const disabled = !isHydrated || state.status === 'loading';

  const handleCopy = async () => {
    try {
      setState({ status: 'loading' });

      // Get current pathname and construct markdown URL
      const pathname = window.location.pathname;
      const mdUrl = `${pathname}.md`;

      // Create fetch promise - in dev mode, return helpful message
      const markdownBlobPromise = import.meta.env.DEV
        ? Promise.resolve(
            new Blob(
              [
                'Markdown source files are only available in production builds.\n\n' +
                  'Run `pnpm build` and `pnpm preview` to test this feature.',
              ],
              { type: 'text/plain' }
            )
          )
        : fetch(mdUrl)
            .then((response) => {
              if (!response.ok) {
                throw new Error(`Failed to fetch markdown: ${response.status} ${response.statusText}`);
              }
              return response.text();
            })
            .then((text) => new Blob([text], { type: 'text/plain' }));

      // Feature detection: ClipboardItem required for Safari compatibility
      if (typeof ClipboardItem === 'undefined') {
        // Fallback for very old browsers (pre-2024)
        const blob = await markdownBlobPromise;
        const text = await blob.text();
        await navigator.clipboard.writeText(text);
      } else {
        // Safari requires passing async operation TO clipboard API
        // (not awaiting first) to preserve user gesture context
        const clipboardItem = new ClipboardItem({
          'text/plain': markdownBlobPromise,
        });
        await navigator.clipboard.write([clipboardItem]);
      }

      setState({ status: 'success' });
      setTimeout(() => {
        setState({ status: 'idle' });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy markdown:', err);
      const message = err instanceof Error ? err.message : 'Failed to copy markdown';
      setState({ status: 'error', message });
      setTimeout(() => {
        setState({ status: 'idle' });
      }, 2000);
    }
  };

  const ariaLabel = state.status === 'success' ? 'Copied' : 'Copy markdown to clipboard';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleCopy}
      className={clsx(
        'relative border border-light-40 dark:border-dark-80 px-3 py-1 rounded-lg whitespace-nowrap text-sm',
        state.status === 'idle' && 'intent:border-dark-40 dark:intent:border-dark-40',
        state.status === 'loading' ? 'opacity-70' : 'cursor-100',
        disabled ? 'cursor-wait' : 'cursor-pointer',
        className
      )}
      style={style}
      aria-label={ariaLabel}
      data-llms-ignore
    >
      <span
        className={clsx(
          state.status !== 'idle' && state.status !== 'loading' ? 'opacity-0 pointer-events-none' : 'opacity-100',
          'inline-flex items-center justify-center'
        )}
      >
        Copy page
      </span>
      <span
        className={clsx(
          state.status !== 'success' ? 'opacity-0 pointer-events-none' : 'opacity-100',
          'absolute inset-0 inline-flex items-center justify-center'
        )}
      >
        Copied <CheckIcon className="ml-1 w-4 h-4" />
      </span>
      <span
        className={clsx(
          state.status !== 'error' ? 'opacity-0 pointer-events-none' : 'opacity-100',
          'absolute inset-0 inline-flex items-center justify-center'
        )}
      >
        Error
      </span>
    </button>
  );
}
