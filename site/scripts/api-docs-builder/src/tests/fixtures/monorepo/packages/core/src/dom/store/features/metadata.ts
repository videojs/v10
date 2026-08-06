/**
 * Mock metadata feature.
 *
 * Exercises: `@state` override — the state() annotation names the private
 * source state, so the published interface is read from the tag instead.
 */
import type { MediaMetadataState } from '../../../../../media/src/core/state';
import { definePlayerFeature } from '../../feature';

const USER_CONTENT_TITLE = Symbol('user-content-title');

interface MetadataSourceState extends Omit<MediaMetadataState, 'contentTitle'> {
  [USER_CONTENT_TITLE]: string | null;
}

/**
 * Resolves user and media content-title metadata into player state.
 *
 * @state MediaMetadataState
 */
export const metadataFeature = definePlayerFeature({
  name: 'metadata',
  state: (): MetadataSourceState => ({
    [USER_CONTENT_TITLE]: null,
    setContentTitle: () => {},
  }),
});
