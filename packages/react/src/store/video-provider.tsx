/** @TODO !!! Revisit for SSR (CJP) */
import type { ReactNode } from 'react';

import { createMediaStore } from '@videojs/core/store';

import { yieldConsoleBanner } from '@videojs/utils';
import { useMemo } from 'react';

import { version } from '../../package.json';
import { MediaContext } from './context';

yieldConsoleBanner(version);

export function VideoProvider({ children }: { children: ReactNode }): JSX.Element {
  const value = useMemo(() => createMediaStore(), []);

  // useEffect(() => {
  //   value?.dispatch({
  //     type: 'documentelementchangerequest',
  //     detail: globalThis.document,
  //   });
  //   return () => {
  //     value?.dispatch({
  //       type: 'documentelementchangerequest',
  //       detail: undefined,
  //     });
  //   };
  // }, []);

  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
}
