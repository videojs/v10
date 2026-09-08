/**
 * Mock spf hls barrel — mirrors the @videojs/spf/hls-audio subpath entry.
 *
 * The import + bare `export { … }` shape matches what tsdown emits in rolled-up
 * entry `.d.ts` files (import the implementation, re-export without a module
 * specifier). The builder must follow the import binding to the declaration.
 */
import { SpfAudioOnlyMixin } from '../playback/engines/hls/adapter-audio-only';

export { SpfAudioOnlyMixin };
