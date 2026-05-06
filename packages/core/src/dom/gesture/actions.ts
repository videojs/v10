import { isFunction } from '@videojs/utils/predicate';
import type { AnyPlayerStore } from '../media/types';
import { MEDIA_INPUT_ACTION_OVERRIDES } from '../media-actions';

export type GestureActionName =
  | 'togglePaused'
  | 'toggleMuted'
  | 'toggleFullscreen'
  | 'toggleSubtitles'
  | 'togglePictureInPicture'
  | 'toggleControls'
  | 'seekStep'
  | 'volumeStep'
  | 'speedUp'
  | 'speedDown';

export interface GestureActionContext {
  store: AnyPlayerStore;
  value?: number | undefined;
  event: PointerEvent;
}

export type GestureActionResolver = (context: GestureActionContext) => void;

/** Actions that need custom logic beyond `store.state[action]()`. */
const GESTURE_ACTION_OVERRIDES: Partial<Record<GestureActionName, GestureActionResolver>> = {
  seekStep: MEDIA_INPUT_ACTION_OVERRIDES.seekStep,

  volumeStep: MEDIA_INPUT_ACTION_OVERRIDES.volumeStep,

  speedUp: MEDIA_INPUT_ACTION_OVERRIDES.speedUp,

  speedDown: MEDIA_INPUT_ACTION_OVERRIDES.speedDown,
};

export function resolveGestureAction(name: GestureActionName | (string & {})): GestureActionResolver | undefined {
  const override = GESTURE_ACTION_OVERRIDES[name as GestureActionName];
  if (override) return override;

  // Direct store method call — togglePaused, toggleMuted, toggleFullscreen, etc.
  return ({ store }) => {
    const method = (store.state as Record<string, unknown>)[name];
    if (isFunction(method)) method();
    else if (__DEV__) console.warn(`[vjs-gesture] Unknown action: "${name}"`);
  };
}
