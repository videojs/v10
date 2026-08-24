import { createDialog } from './dialog';

export type {
  DialogApi as AlertDialogApi,
  DialogOptions as AlertDialogOptions,
  DialogTriggerProps as AlertDialogTriggerProps,
} from './dialog';

/** Alert dialogs use the shared modal dialog interaction behavior. */
export const createAlertDialog = createDialog;
