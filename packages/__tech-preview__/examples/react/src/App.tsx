import type { PropsWithChildren } from 'react';
import { VideoProvider } from '@videojs/react-preview';
import clsx from 'clsx';
import { useEffect, useMemo, useRef } from 'react';
import { Link as LinkPrimitive, Redirect, Route, Switch, useLocation } from 'wouter';
import { VideoElement } from './components';

import { SkinLayout } from './components/SkinLayout';
import { useMediaQuery } from './hooks';
import CustomBaseUISkin from './skins/custom/base-ui/CustomBaseUISkin';
import customBaseUISkinSource from './skins/custom/base-ui/CustomBaseUISkin?raw';
import CustomNativeSkin from './skins/custom/native/CustomNativeSkin';
import customNativeSkinSource from './skins/custom/native/CustomNativeSkin?raw';
import FrostedSkinEjected from './skins/ejected/frosted/FrostedSkin';
import frostedSkinEjectedSource from './skins/ejected/frosted/FrostedSkin?raw';
import MinimalSkinEjected from './skins/ejected/minimal/MinimalSkin';
import minimalSkinEjectedSource from './skins/ejected/minimal/MinimalSkin?raw';
import FrostedSkin from './skins/imported/FrostedSkin';
import frostedSkinSource from './skins/imported/FrostedSkin?raw';
import MinimalSkin from './skins/imported/MinimalSkin';
import minimalSkinSource from './skins/imported/MinimalSkin?raw';

import './globals.css';

type NavigationSectionProps = PropsWithChildren<{
  title: string;
}>;

function NavigationSection(props: NavigationSectionProps): JSX.Element {
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-zinc-400 px-3.5 dark:text-zinc-500">
        {props.title}
      </div>
      <nav className="space-y-px">{props.children}</nav>
    </div>
  );
}

type LinkProps = PropsWithChildren<{
  to: string;
}>;

function Link(props: LinkProps): JSX.Element {
  return (
    <LinkPrimitive
      {...props}
      className={isActive => clsx('flex px-3.5 py-2 rounded-lg transition-colors text-sm', {
        'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700': !isActive,
        'bg-zinc-200/60 text-zinc-900 dark:bg-zinc-200': isActive,
      })}
    />
  );
}

export default function App(): JSX.Element {
  const skinProps = useMemo(() => ({
    className: 'aspect-video shadow-lg shadow-black/15',
    children: <VideoElement />,
  }), []);

  const isDesktop = useMediaQuery('(min-width: 768px)');
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isDesktop) {
      navigationRef.current?.removeAttribute('popover');
    } else {
      navigationRef.current?.setAttribute('popover', 'auto');
    }
  }, [isDesktop]);

  const [location] = useLocation();
  useEffect(() => {
    try {
      navigationRef.current?.hidePopover();
    } catch {}
  }, [location]);

  return (
    <div className="min-h-screen text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 flex">
      <button type="button" className="p-3 absolute top-7 left-7 md:hidden cursor-pointer z-10" popoverTarget="navigation" popoverTargetAction="show">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
          <path fillRule="evenodd" d="M2 6.75A.75.75 0 0 1 2.75 6h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 6.75Zm0 6.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
        </svg>
        <span className="sr-only">Open sidebar</span>
      </button>

      <header ref={navigationRef} className="p-3 w-72 bg-zinc-50 space-y-8 dark:bg-zinc-800 max-md:h-full popover-from-left max-md:shadow-xl max-md:shadow-black/15" popover="auto" id="navigation">
        <h1 className="text-xl tracking-tight pt-6 px-3 flex items-center gap-2">
          <span className="font-semibold text-zinc-600 dark:text-white">Video.js</span>
          <span className="text-zinc-300 dark:text-zinc-700 font-extralight text-[80%]">/</span>
          <span className="text-zinc-500 font-normal dark:text-zinc-100">React</span>
        </h1>

        <div className="space-y-6">
          <NavigationSection title="Imported skins">
            <Link to="/imported/frosted">Frosted</Link>
            <Link to="/imported/minimal">Minimal</Link>
          </NavigationSection>
          <NavigationSection title="Ejected skins">
            <Link to="/ejected/frosted">Frosted</Link>
            <Link to="/ejected/minimal">Minimal</Link>
          </NavigationSection>
          <NavigationSection title="Build your own">
            <Link to="/custom/native">Native</Link>
            <Link to="/custom/base-ui">Base UI</Link>
          </NavigationSection>
        </div>
      </header>

      <main
        className="flex-1 flex justify-center items-center px-6"
      >
        <VideoProvider>
          <Switch>
            <Route path="/imported/frosted">
              <SkinLayout code={frostedSkinSource} preview={<FrostedSkin {...skinProps} />} />
            </Route>
            <Route path="/imported/minimal">
              <SkinLayout code={minimalSkinSource} preview={<MinimalSkin {...skinProps} />} />
            </Route>

            <Route path="/ejected/frosted">
              <SkinLayout code={frostedSkinEjectedSource} preview={<FrostedSkinEjected {...skinProps} />} />
            </Route>
            <Route path="/ejected/minimal">
              <SkinLayout code={minimalSkinEjectedSource} preview={<MinimalSkinEjected {...skinProps} />} />
            </Route>

            <Route path="/custom/native">
              <SkinLayout code={customNativeSkinSource} preview={<CustomNativeSkin {...skinProps} />} />
            </Route>
            <Route path="/custom/base-ui">
              <SkinLayout code={customBaseUISkinSource} preview={<CustomBaseUISkin {...skinProps} />} />
            </Route>

            <Route>
              <Redirect to="/imported/frosted" />
            </Route>
          </Switch>
        </VideoProvider>
      </main>
    </div>
  );
}
