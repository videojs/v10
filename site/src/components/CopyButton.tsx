import { useRef, useState } from 'react';

import type { AnalyticsEventProperties } from '@/utils/analytics';
import { ANALYTICS_EVENTS, trackEvent } from '@/utils/analytics';
import useIsHydrated from '@/utils/useIsHydrated';

export interface CopyButtonProps {
  children: React.ReactNode;
  copied?: React.ReactNode; // Optional, passed via slot="copied" in Astro
  copyFrom: {
    container: string; // CSS selector for parent container (e.g., 'starlight-tabs')
    target: string; // CSS selector for content element (e.g., '[role="tabpanel"]:not([hidden])')
  };
  className?: string;
  style?: React.CSSProperties;
  timeout?: number;
  /** Names this block in the `code_copied` event. Defaults to a generic id. */
  analytics?: AnalyticsEventProperties['code_copied'];
}

export default function CopyButton({
  children,
  copied,
  copyFrom,
  className,
  style,
  timeout = 2000,
  analytics = { block: 'code-tabs' },
}: CopyButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isCopied, setIsCopied] = useState(false);
  const isHydrated = useIsHydrated();

  const disabled = !isHydrated;

  const handleCopy = async () => {
    try {
      let text = '';

      if (buttonRef.current) {
        // Find the closest container
        const container = buttonRef.current.closest(copyFrom.container);

        if (container) {
          // Find the target within that container
          const target = container.querySelector(copyFrom.target);

          if (target) {
            text = target?.textContent || '';
          } else {
            console.warn(
              `CopyButton: No target found for selector "${copyFrom.target}" within container "${copyFrom.container}"`
            );
          }
        } else {
          console.warn(`CopyButton: No container found for selector "${copyFrom.container}"`);
        }
      } else {
        console.warn('CopyButton: buttonRef is null');
      }

      if (text) {
        await navigator.clipboard.writeText(text.trim());
        trackEvent(ANALYTICS_EVENTS.codeCopied, analytics);

        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, timeout);
      }
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleCopy}
        className={className}
        style={style}
        aria-label={isCopied ? 'Copied' : 'Copy to clipboard'}
      >
        {isCopied ? copied || children : children}
      </button>
      <span aria-live="polite" className="sr-only">
        {isCopied ? 'Copied' : ''}
      </span>
    </>
  );
}
