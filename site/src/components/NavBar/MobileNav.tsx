import { Dialog } from '@base-ui/react/dialog';
import clsx from 'clsx';
import { ArrowUpRight } from 'lucide-react';
import { DISCORD_INVITE_URL, GITHUB_REPO_URL } from '@/consts';
import Logo from '../icons/logo.svg?react';
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
  dark?: boolean;
  children?: React.ReactNode;
}

export default function MobileNav({ navLinks, currentPath, dark = false, children }: MobileNavProps) {
  return (
    <Dialog.Root modal>
      {/* Trigger button - hamburger menu */}
      <Dialog.Trigger
        className={clsx(
          'md:hidden',
          'inline-flex items-stretch p-0.75 border-2 border-faded-black dark:border-light-manila rounded-xs',
          dark ? 'bg-light-manila text-faded-black intent:bg-light-manila' : ' '
        )}
        aria-label="Open navigation menu"
      >
        <span
          className="font-display-extended tracking-normal leading-none uppercase font-bold text-light-manila bg-faded-black dark:bg-light-manila dark:text-faded-black px-4 py-2.5"
          style={{ fontSize: '0.75rem' }}
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
            dark
              ? 'bg-faded-black text-light-manila dark'
              : 'bg-light-manila dark:bg-faded-black text-faded-black dark:text-light-manila'
          )}
        >
          {/* Header with close button */}
          <div
            className={clsx(
              'flex justify-between items-center px-5 py-7',
              dark ? 'border-dark-80' : 'border-light-40 dark:border-dark-80'
            )}
          >
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Logo width="10rem" />
            <Dialog.Close
              className={clsx(
                'inline-flex items-stretch p-0.75 border-2 border-faded-black dark:border-light-manila rounded-xs',
                dark ? 'bg-light-manila text-faded-black intent:bg-light-manila' : ''
              )}
              aria-label="Close navigation menu"
            >
              <span
                className="font-display-extended tracking-normal leading-none uppercase font-bold text-light-manila bg-faded-black dark:bg-light-manila dark:text-faded-black px-4 py-2.5"
                style={{ fontSize: '0.75rem' }}
              >
                Close
              </span>
            </Dialog.Close>
          </div>

          <div className="overflow-y-auto">
            <div className={clsx('', dark ? 'border-dark-80' : 'border-light-40 dark:border-dark-80')}>{children}</div>
            {/* Navigation links */}
            <nav className="flex flex-col p-5">
              {navLinks.map((link) => {
                const isActive = link.matchPath && currentPath.startsWith(link.matchPath);
                const className = clsx(
                  'hover:bg-dark-manila dark:hover:bg-warm-gray flex items-center justify-center px-5 py-3.5 font-display-extended uppercase font-bold text-h5 text-center border-t border-faded-black dark:border-dark-manila',
                  isActive ? 'text-stroke-faded-black dark:text-stroke-light-manila' : ''
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
                    {link.label} {link.external ? <ArrowUpRight size="1em" /> : null}
                  </a>
                );
              })}
              <a
                href={DISCORD_INVITE_URL}
                className={clsx(
                  'hover:bg-dark-manila dark:hover:bg-warm-gray flex items-center justify-center px-5 py-3.5 font-display-extended uppercase font-bold text-h5 text-center border-t border-faded-black dark:border-dark-manila'
                )}
                target="_blank"
              >
                Discord
              </a>
              <a
                href={GITHUB_REPO_URL}
                className={clsx(
                  'hover:bg-dark-manila dark:hover:bg-warm-gray flex items-center justify-center px-5 py-3.5 font-display-extended uppercase font-bold text-h5 text-center border-t border-faded-black dark:border-dark-manila',
                  'border-b'
                )}
                target="_blank"
              >
                GitHub
              </a>
            </nav>
          </div>
          <p className="text-center p-6 mt-auto text-p2">The open source player for the web</p>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
