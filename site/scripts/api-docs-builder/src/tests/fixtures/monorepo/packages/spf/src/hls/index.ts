/**
 * Mock spf hls barrel — mirrors the @videojs/spf/hls subpath entry.
 *
 * The import + bare `export { … }` shape matches what tsdown emits in rolled-up
 * entry `.d.ts` files (import the implementation, re-export without a module
 * specifier). The builder must follow the import binding to the declaration.
 */
import { SpfAudioOnlyMediaMixin } from '../playback/engines/hls/adapter-audio-only';

export { spfAudioOnlyMediaDefaultProps } from '../playback/engines/hls/adapter-audio-only';
export { SpfAudioOnlyMediaMixin };
