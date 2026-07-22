import { Popover } from '@base-ui/react/popover';
import type { MarkdownHeading } from 'astro';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { TableOfContentsDesktop } from './TableOfContents.desktop';
import { calculateRailGeometry } from './utils';
import './TableOfContents.mobile.css';

interface TableOfContentsMobileProps {
  headings: MarkdownHeading[];
  activeId: string;
  onNavigate: (slug: string) => void;
  className?: string;
}

export function TableOfContentsMobile({ headings, activeId, onNavigate, className }: TableOfContentsMobileProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [viewportLayout, setViewportLayout] = useState({
    availableHeight: 400,
    railTop: null as number | null,
  });

  const railGeometry = calculateRailGeometry(headings.length, viewportLayout.availableHeight);

  useEffect(() => {
    const updateViewportLayout = () => {
      const navHeightValue = triggerRef.current ? getComputedStyle(triggerRef.current).getPropertyValue('--nav-h') : '';
      const navHeight = Number.parseFloat(navHeightValue) || 52;

      setViewportLayout({
        availableHeight: Math.max(0, window.innerHeight - navHeight - 32),
        railTop: navHeight + (window.innerHeight - navHeight) / 2,
      });
    };

    updateViewportLayout();
    window.addEventListener('resize', updateViewportLayout);
    window.visualViewport?.addEventListener('resize', updateViewportLayout);

    return () => {
      window.removeEventListener('resize', updateViewportLayout);
      window.visualViewport?.removeEventListener('resize', updateViewportLayout);
    };
  }, []);

  useEffect(() => {
    const desktopMedia = window.matchMedia('(min-width: 80rem)');
    const closeAtDesktopBreakpoint = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };

    desktopMedia.addEventListener('change', closeAtDesktopBreakpoint);
    return () => desktopMedia.removeEventListener('change', closeAtDesktopBreakpoint);
  }, []);

  useEffect(() => {
    if (!open) return;

    const closeOnDocumentScroll = () => setOpen(false);
    window.addEventListener('scroll', closeOnDocumentScroll, { passive: true });

    return () => window.removeEventListener('scroll', closeOnDocumentScroll);
  }, [open]);

  const handleNavigate = (slug: string) => {
    setOpen(false);
    onNavigate(slug);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
      <Popover.Trigger
        ref={triggerRef}
        aria-label="On this page"
        className={clsx(
          'fixed right-0 z-20 flex min-h-6 w-6 items-center justify-end intent:text-manila-dark dark:intent:text-manila-dark',
          open ? 'text-manila-dark dark:text-manila-dark' : 'text-manila-75 dark:text-warm-gray',
          className
        )}
        style={{
          top: viewportLayout.railTop ?? 'calc(50dvh + 1.625rem)',
          transform: 'translateY(-50%)',
          cursor: 'pointer',
        }}
      >
        <span aria-hidden="true" className="flex flex-col items-end pr-1" style={{ gap: railGeometry.gap }}>
          {headings.map((heading) => {
            const isActive = activeId === heading.slug;
            const width = heading.depth === 2 ? 12 : heading.depth === 3 ? 8 : 4;

            return (
              <span
                key={heading.slug}
                className={isActive ? 'block bg-faded-black dark:bg-manila-light' : 'block bg-current'}
                style={{ width, height: railGeometry.stripeHeight }}
              />
            );
          })}
        </span>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          side="left"
          align="center"
          sideOffset={-4}
          collisionPadding={16}
          positionMethod="fixed"
          className="z-20"
        >
          <Popover.Popup
            ref={popupRef}
            initialFocus={() =>
              popupRef.current?.querySelector<HTMLAnchorElement>('a[aria-current="location"]') ??
              popupRef.current?.querySelector<HTMLAnchorElement>('a[href]') ??
              popupRef.current
            }
            className={clsx(
              'docs-toc-popover overflow-y-auto rounded-xs border border-manila-dark bg-manila-light pl-6 text-p3 shadow-xl dark:border-soot dark:bg-soot'
            )}
            style={{
              width: 'min(20rem, calc(100vw - 3rem))',
              maxHeight: viewportLayout.availableHeight,
            }}
          >
            <TableOfContentsDesktop headings={headings} activeId={activeId} onNavigate={handleNavigate} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
