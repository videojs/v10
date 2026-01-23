import { Dialog } from '@base-ui-components/react/dialog';
import clsx from 'clsx';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { DISCORD_INVITE_URL, GITHUB_REPO_URL } from '@/consts';
import FilmGrain from '../FilmGrain';

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
          'sm:hidden flex items-center justify-center p-3 h-full aspect-square',
          dark
            ? 'bg-light-80 text-dark-100 intent:bg-light-40'
            : 'bg-dark-100 dark:bg-light-80 text-light-80 dark:text-dark-100 intent:bg-dark-80 dark:intent:bg-light-40'
        )}
        aria-label="Open navigation menu"
      >
        <Menu size={24} />
      </Dialog.Trigger>

      {/* Portal renders outside DOM hierarchy */}
      <Dialog.Portal>
        {/* Popup container */}
        <Dialog.Popup
          className={clsx(
            'fixed inset-0 z-50 flex flex-col',
            dark ? 'bg-dark-100 text-light-100' : 'bg-light-80 dark:bg-dark-100 text-dark-100 dark:text-light-100'
          )}
        >
          <FilmGrain currentPath={currentPath} />
          {/* Header with close button */}
          <div
            className={clsx(
              'flex justify-between items-center pl-3 border-b',
              dark ? 'border-dark-80' : 'border-light-40 dark:border-dark-80'
            )}
            style={{ height: 'var(--nav-h)' }}
          >
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <p className="text-h5 px-3">Video.js v10</p>
            <Dialog.Close
              className={clsx(
                'flex items-center justify-center p-3 h-full aspect-square',
                dark
                  ? 'bg-light-80 text-dark-100 intent:bg-light-40'
                  : 'bg-dark-100 text-light-80 intent:bg-dark-80 dark:bg-light-80 dark:text-dark-100 dark:intent:bg-light-40'
              )}
              aria-label="Close navigation menu"
            >
              <X size={24} />
            </Dialog.Close>
          </div>

          {/* Astro makes it hard to know if we have children, so, we use -mt-px to hide the border-b if we don't */}
          <div className={clsx('-mt-px border-b', dark ? 'border-dark-80' : 'border-light-40 dark:border-dark-80')}>
            {children}
          </div>

          {/* Navigation links */}
          <nav className="flex flex-col py-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={clsx(
                  'text-lg px-6 py-3',
                  link.matchPath && currentPath.startsWith(link.matchPath) ? 'underline' : 'intent:underline'
                )}
                aria-current={link.matchPath && currentPath.startsWith(link.matchPath) ? 'page' : undefined}
              >
                {link.label} {link.external ? <ArrowUpRight size="1em" /> : null}
              </a>
            ))}
            <a href={GITHUB_REPO_URL} className="text-lg px-6 py-3 inline-flex items-center gap-1 intent:underline">
              GitHub <ArrowUpRight size="1em" />
            </a>
            <a href={DISCORD_INVITE_URL} className="text-lg px-6 py-3 inline-flex items-center gap-1 intent:underline">
              Discord <ArrowUpRight size="1em" />
            </a>
          </nav>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
