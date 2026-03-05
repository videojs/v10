import { Dialog } from '@base-ui/react/dialog';
import clsx from 'clsx';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { DISCORD_INVITE_URL, GITHUB_REPO_URL } from '@/consts';
import FilmGrain from '../FilmGrain';
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
  const navLinkBase =
    'hover:bg-dark-manila dark:hover:bg-warm-gray transition-colors flex items-center justify-center px-5 py-4 font-display-extended uppercase font-bold text-h5 text-center border-t border-faded-black dark:border-dark-manila';

  return (
    <Dialog.Root modal>
      {/* Trigger button - hamburger menu */}
      <Dialog.Trigger
        className={clsx(
          'inline-flex items-stretch p-1 border-2 border-faded-black dark:border-light-manila rounded-sm md:hidden',
          dark ? 'bg-light-manila text-faded-black intent:bg-light-manila' : ' '
        )}
        aria-label="Open navigation menu"
      >
        <span className="text-sm font-display-extended uppercase font-bold text-light-manila bg-faded-black dark:bg-light-manila dark:text-faded-black px-4 py-2">
          MENU
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
                'inline-flex items-stretch p-1 border-2 border-faded-black dark:border-light-manila rounded-sm ',
                dark ? 'bg-light-manila text-faded-black intent:bg-light-manila' : ''
              )}
              aria-label="Close navigation menu"
            >
              <span className="text-sm font-display-extended uppercase font-bold text-light-manila bg-faded-black dark:bg-light-manila dark:text-faded-black px-4 py-2">
                CLOSE
              </span>
            </Dialog.Close>
          </div>

          <div className="overflow-y-auto">
            {/* Astro makes it hard to know if we have children, so, we use -mt-px to hide the border-b if we don't */}
            <div className={clsx('', dark ? 'border-dark-80' : 'border-light-40 dark:border-dark-80')}>{children}</div>

            {/* Navigation links */}
            <nav className="flex flex-col p-5">
              {navLinks.map((link) => {
                const isActive = link.matchPath && currentPath.startsWith(link.matchPath);
                const className = clsx(navLinkBase, isActive ? '' : '');

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
              <a href={DISCORD_INVITE_URL} className={clsx(navLinkBase)} target="_blank">
                Discord
              </a>
              <a href={GITHUB_REPO_URL} className={clsx(navLinkBase, 'border-b')} target="_blank">
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
