import type { NonNullableObject } from '@videojs/utils/types';

export interface AlertDialogProps {
  /** Controlled open state. When set, the consumer is responsible for toggling. */
  open?: boolean | undefined;
  /** Initial open state for uncontrolled usage. */
  defaultOpen?: boolean | undefined;
}

export const ALERT_DIALOG_DEFAULT_PROPS: NonNullableObject<AlertDialogProps> = {
  open: false,
  defaultOpen: false,
};
