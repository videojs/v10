import { Dialog } from '@base-ui/react/dialog';
import clsx from 'clsx';
import { ArrowUpRight } from 'lucide-react';

import Logo from '@/assets/logos/videojs.svg?react';
import CompactLogo from '@/assets/logos/vjs.svg?react';
import BetaPill from '@/components/BetaPill';
import { DISCORD_INVITE_URL, GITHUB_REPO_URL } from '@/consts';

import GetStartedLink from './GetStartedLink';

interface NavLink {
  href: string;
  label: string;
  matchPath: string | null;
  external?: boolean;
}

export interface MobileNavProps {
  navLinks: NavLink[];
  currentPath: string;
  children?: React.ReactNode;
  compact?: boolean;
  pill?: React.ReactNode;
}

export default function MobileNav({ navLinks, currentPath, children, compact, pill }: MobileNavProps) {
  return (
    <Dialog.Root modal>
      {/* Trigger button - hamburger menu */}
      <Dialog.Trigger
        className={clsx(
          'md:hidden',
          'inline-flex items-stretch p-0.75 border-2 border-faded-black dark:border-manila-light rounded-xs'
        )}
        aria-label="Open navigation menu"
      >
        <span
          className={clsx(
            'font-display text-manila-light bg-faded-black dark:bg-manila-light dark:text-faded-black leading-none font-bold tracking-normal uppercase',
            compact ? 'p-2' : 'p-2.5 sm:px-4 sm:py-2.5'
          )}
          style={{ fontSize: compact ? '0.625rem' : '0.75rem' }}
        >
          Menu
        </span>
      </Dialog.Trigger>

      {/* Portal renders outside DOM hierarchy */}
      <Dialog.Portal>
        {/* Popup container */}
        <Dialog.Popup
          className={clsx(
            'fixed inset-0 z-50 flex flex-col',
            'bg-manila-light dark:bg-faded-black text-faded-black dark:text-manila-light'
          )}
        >
          {/* Header with close button */}
          <div className={clsx('flex justify-between items-center px-5', compact ? 'py-2' : 'py-7')}>
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <a
              href="/"
              className={clsx(
                'flex items-center',
                compact ? 'h-5 gap-2 sm:h-6 sm:gap-3' : 'h-7 gap-3 lg:h-10 lg:gap-4'
              )}
            >
              {compact ? (
                <>
                  <CompactLogo height="100%" className="xs:hidden w-auto" />
                  <Logo height="100%" className="xs:inline hidden w-auto" />
                </>
              ) : (
                <Logo height="100%" className="w-auto" />
              )}
              <span className="sr-only">Video.js video player</span>
              {pill ? pill : <BetaPill className="hidden sm:inline-flex" />}
            </a>
            <Dialog.Close
              className={clsx(
                'inline-flex items-stretch p-0.75 border-2 border-faded-black dark:border-manila-light rounded-xs'
              )}
              aria-label="Close navigation menu"
            >
              <span
                className={clsx(
                  'font-display text-manila-light bg-faded-black dark:bg-manila-light dark:text-faded-black leading-none font-bold tracking-normal uppercase',
                  compact ? 'p-2' : 'p-2.5 sm:px-4 sm:py-2.5'
                )}
                style={{ fontSize: compact ? '0.625rem' : '0.75rem' }}
              >
                Close
              </span>
            </Dialog.Close>
          </div>

          <div className="overflow-y-auto">
            <div className={clsx('')}>{children}</div>
            {/* Navigation links */}
            <nav className="flex flex-col p-5">
              {navLinks.map((link) => {
                const isActive = link.matchPath && currentPath.startsWith(link.matchPath);
                const className = clsx(
                  'intent:bg-manila-dark dark:intent:bg-warm-gray flex items-center justify-center px-5 py-3.5 font-display uppercase font-bold text-h5 text-center border-t border-faded-black dark:border-manila-dark',
                  isActive ? 'text-stroke-faded-black dark:text-stroke-manila-light' : ''
                );

                if (link.href === '/docs') {
                  return (
                    <GetStartedLink key={link.href} className={className} aria-current={isActive ? 'page' : undefined}>
                      {link.label}
                    </GetStartedLink>
                  );
                }

                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={className}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {link.label} {link.external ? <ArrowUpRight size="1em" aria-hidden="true" /> : null}
                  </a>
                );
              })}
              <a
                href={DISCORD_INVITE_URL}
                className={clsx(
                  'intent:bg-manila-dark dark:intent:bg-warm-gray flex items-center justify-center px-5 py-3.5 font-display uppercase font-bold text-h5 text-center border-t border-faded-black dark:border-manila-dark'
                )}
                target="_blank"
                rel="noopener"
              >
                Discord
              </a>
              <a
                href={GITHUB_REPO_URL}
                className={clsx(
                  'intent:bg-manila-dark dark:intent:bg-warm-gray flex items-center justify-center px-5 py-3.5 font-display uppercase font-bold text-h5 text-center border-t border-faded-black dark:border-manila-dark',
                  'border-b'
                )}
                target="_blank"
                rel="noopener"
              >
                GitHub
              </a>
            </nav>
            <p className="text-p2 mt-auto p-6 text-center">The open source player for the web</p>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
