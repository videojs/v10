import { noop, tryCatch } from '@videojs/utils/function';

/** Run an embed API call, ignoring the errors thrown once its iframe or player is gone. */
export function tryCall(fn: () => void): void {
  tryCatch(fn, noop)?.();
}
