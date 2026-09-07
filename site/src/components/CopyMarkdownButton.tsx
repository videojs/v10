import clsx from 'clsx';
import { useState } from 'react';

import Check from '@/assets/icons/check.svg?react';
import Copy from '@/assets/icons/copy.svg?react';
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

/** Copies the current page's Markdown source. Sits beside the breadcrumbs so agents and readers find it first. */
export default function CopyMarkdownButton({ className, style }: CopyMarkdownButtonProps) {
  const [state, setState] = useState<CopyState>({ status: 'idle' });
  const isHydrated = useIsHydrated();
  const disabled = !isHydrated || state.status === 'loading';

  const handleCopy = async () => {
    try {
      setState({ status: 'loading' });

      // Get current pathname and construct markdown URL
      // Strip trailing slashes so `/guide/` becomes `/guide.md`, not `/guide/.md`
      // Astro should forbid trailing slashes, but infra might add them back on (e.g., Netlify)
      const pathname = window.location.pathname.replace(/\/+$/, '');
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

  const ariaLabel = state.status === 'success' ? 'Copied' : 'Copy page as Markdown';
  const label = state.status === 'success' ? 'Copied' : state.status === 'error' ? 'Error' : 'Copy page';

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={handleCopy}
        className={clsx(
          'inline-flex h-8 items-center gap-1.5 rounded-lg corner-squircle border border-line bg-surface px-2.5 text-p3 whitespace-nowrap shadow-xs select-none',
          'intent:border-line-strong intent:text-faded-black dark:intent:text-manila-light text-muted',
          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold',
          state.status === 'loading' && 'opacity-70',
          disabled ? 'cursor-wait' : 'cursor-pointer',
          className
        )}
        style={style}
        aria-label={ariaLabel}
        data-llms-ignore
      >
        {state.status === 'success' ? (
          <Check className="text-orange size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
        <span className="grid">
          {/* Reserve the widest label so the button doesn't resize between states. */}
          <span className="invisible col-start-1 row-start-1" aria-hidden="true">
            Copy page
          </span>
          <span className="col-start-1 row-start-1">{label}</span>
        </span>
      </button>
      <span aria-live="polite" className="sr-only">
        {state.status === 'success' ? 'Copied' : state.status === 'error' ? 'Error copying markdown' : ''}
      </span>
    </>
  );
}
