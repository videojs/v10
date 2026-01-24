/** @TODO !!! Revisit for SSR (CJP) */

import { createMediaStore } from '@videojs/store';
import { printConsoleBanner } from '@videojs/utils';
import type { ReactNode } from 'react';
import { useMemo } from 'react';

import { version } from '../../package.json';
import { MediaContext } from './context';

printConsoleBanner(version);

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
