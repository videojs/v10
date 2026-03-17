import { getInitialSkin, getInitialSource } from '@app/shared/sandbox-listener';
import type { SourceId } from '@app/shared/sources';
import type { Skin, Styling } from '@app/types';

function getInitialStyling(): Styling {
  return new URLSearchParams(location.search).get('styling') === 'tailwind' ? 'tailwind' : 'css';
}

export type HtmlSandboxState = {
  skin: Skin;
  source: SourceId;
  styling: Styling;
};

export function createHtmlSandboxState(audioOnly?: boolean): HtmlSandboxState {
  return {
    skin: getInitialSkin(),
    source: getInitialSource(audioOnly),
    styling: getInitialStyling(),
  };
}

export function createLatestLoader() {
  let loadVersion = 0;

  return async <Result>(load: () => Promise<Result>): Promise<Result | undefined> => {
    const version = ++loadVersion;
    const result = await load();

    return version === loadVersion ? result : undefined;
  };
}
