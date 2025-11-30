import type { PropsWithChildren } from 'react';
import { VideoProvider } from '@videojs/react';
import clsx from 'clsx';
import { useMemo } from 'react';
import { Link as LinkPrimitive, Redirect, Route, Switch } from 'wouter';
import { VideoElement } from './components';

import CustomBaseUISkin from './skins/custom/base-ui/CustomBaseUISkin';
import CustomNativeSkin from './skins/custom/native/CustomNativeSkin';
import FrostedSkinEjected from './skins/ejected/frosted/FrostedSkin';
import MinimalSkinEjected from './skins/ejected/minimal/MinimalSkin';
import FrostedSkin from './skins/imported/FrostedSkin';
import MinimalSkin from './skins/imported/MinimalSkin';

import './globals.css';

type NavigationSectionProps = PropsWithChildren<{
  title: string;
}>;

function NavigationSection(props: NavigationSectionProps): JSX.Element {
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-zinc-400 px-3.5">
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
        'text-zinc-600 hover:bg-zinc-200/60': !isActive,
        'bg-zinc-200/60 text-zinc-900': isActive,
      })}
    />
  );
}

export default function App(): JSX.Element {
  const skinProps = useMemo(() => ({
    className: 'aspect-video shadow-lg shadow-black/15',
    children: <VideoElement />,
  }), []);

  return (
    <div className="min-h-screen text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 flex">
      <header className="p-3 w-72 bg-zinc-50 space-y-8 border-r border-dashed border-zinc-200">
        <h1 className="text-xl tracking-tight pt-6 px-3 flex items-center gap-2">
          <span className="font-light text-zinc-700 dark:text-white">Video.js</span>
          <span className="text-zinc-300 dark:text-zinc-700 font-extralight text-[80%]">/</span>
          <span className="text-zinc-600 font-semibold">React</span>
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

      <main className="flex-1 flex justify-center items-center">
        <div className="w-full max-w-5xl mx-auto p-6">
          <VideoProvider>
            <Switch>
              <Route path="/imported/frosted">
                <FrostedSkin {...skinProps} />
              </Route>
              <Route path="/imported/minimal">
                <MinimalSkin {...skinProps} />
              </Route>

              <Route path="/ejected/frosted">
                <FrostedSkinEjected {...skinProps} />
              </Route>
              <Route path="/ejected/minimal">
                <MinimalSkinEjected {...skinProps} />
              </Route>

              <Route path="/custom/native">
                <CustomNativeSkin {...skinProps} />
              </Route>
              <Route path="/custom/base-ui">
                <CustomBaseUISkin {...skinProps} />
              </Route>

              <Route>
                <Redirect to="/imported/frosted" />
              </Route>
            </Switch>
          </VideoProvider>
        </div>
      </main>
    </div>
  );
}
