import type { PopupGroup } from '@videojs/core/dom';
import { type Context, createContext } from '@videojs/element/context';

const POPUP_GROUP_CONTEXT_KEY = Symbol.for('@videojs/popup-group');

export type PopupGroupContext = Context<typeof POPUP_GROUP_CONTEXT_KEY, PopupGroup>;

export const popupGroupContext = createContext<PopupGroup, typeof POPUP_GROUP_CONTEXT_KEY>(POPUP_GROUP_CONTEXT_KEY);
