import type { Context } from 'react';
import { createContext } from 'react';

/**
 * @description The {@link https://react.dev/learn/passing-data-deeply-with-context#context-an-alternative-to-passing-props|React Context}
 * used "under the hood" for media ui state updates, state change requests, and the hooks and providers that integrate with this context.
 * It is unlikely that you will/should be using `MediaContext` directly.
 *
 * @see {@link VideoProvider}
 * @see {@link useMediaDispatch}
 * @see {@link useMediaSelector}
 */
export const MediaContext: Context<any | null> = createContext<any | null>(null);
