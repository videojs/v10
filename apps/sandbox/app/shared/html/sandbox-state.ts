import {
  getInitialAutoplay,
  getInitialLoop,
  getInitialMuted,
  getInitialPreload,
  getInitialSkin,
  getInitialSource,
  type PreloadValue,
} from '@app/shared/sandbox-listener';
import type { SourceId } from '@app/shared/sources';
import type { Skin, Styling } from '@app/types';

function getInitialStyling(): Styling {
  return new URLSearchParams(location.search).get('styling') === 'tailwind' ? 'tailwind' : 'css';
}

export type HtmlSandboxState = {
  skin: Skin;
  source: SourceId;
  styling: Styling;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  preload: PreloadValue;
};

export function createHtmlSandboxState(audioOnly?: boolean): HtmlSandboxState {
  return {
    skin: getInitialSkin(),
    source: getInitialSource(audioOnly),
    styling: getInitialStyling(),
    autoplay: getInitialAutoplay(),
    muted: getInitialMuted(),
    loop: getInitialLoop(),
    preload: getInitialPreload(),
  };
}

/** Render the user-controlled media attributes (autoplay/muted/loop/preload) as HTML attributes. */
export function renderMediaAttrs(state: HtmlSandboxState): string {
  return [
    state.autoplay ? 'autoplay' : '',
    state.muted ? 'muted' : '',
    state.loop ? 'loop' : '',
    `preload="${state.preload}"`,
  ]
    .filter(Boolean)
    .join(' ');
}

export function createLatestLoader() {
  let loadVersion = 0;

  return async <Result>(load: () => Promise<Result>): Promise<Result | undefined> => {
    const version = ++loadVersion;
    try {
      const result = await load();
      return version === loadVersion ? result : undefined;
    } catch (error) {
      // Swallow load errors to avoid unhandled promise rejections in callers
      // that do not await the returned promise. Callers can treat `undefined`
      // as a signal that no valid result is available.
      console.error('Failed to load latest result', error);
      return undefined;
    }
  };
}
