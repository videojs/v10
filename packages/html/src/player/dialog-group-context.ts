import type { DialogGroup } from '@videojs/core/dom';
import { type Context, createContext } from '@videojs/element/context';

const DIALOG_GROUP_CONTEXT_KEY = Symbol.for('@videojs/dialog-group');

export type DialogGroupContext = Context<typeof DIALOG_GROUP_CONTEXT_KEY, DialogGroup>;

export const dialogGroupContext = createContext<DialogGroup, typeof DIALOG_GROUP_CONTEXT_KEY>(DIALOG_GROUP_CONTEXT_KEY);
