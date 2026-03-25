import type { MuxMediaError } from '@videojs/core/dom/media/mux';
import mux, { type Metadata } from 'mux-embed';

export type { Metadata };

export function setupMuxData(
  mediaEl: HTMLMediaElement,
  engine: object,
  options: { envKey: string | null; metadata: Partial<Metadata> }
): () => void {
  const { envKey, metadata } = options;

  mux.monitor(mediaEl, {
    hlsjs: engine as any,
    automaticErrorTracking: false,
    errorTranslator: (error) => {
      // Suppress errors with no code — these are hls.js internal string-coded events
      // that carry no useful context for end users or Mux Data.
      if (!error.player_error_code) return false;
      return error;
    },
    data: {
      view_session_id: crypto.randomUUID(),
      player_init_time: Date.now(),
      player_software_name: 'Video.js',
      player_software_version: '10',
      ...(envKey ? { env_key: envKey } : {}),
      ...metadata,
    },
  });

  return () => {
    mux.destroyMonitor(mediaEl);
  };
}

export function updateMuxHlsEngine(mediaEl: HTMLMediaElement, engine: object): void {
  mux.removeHLSJS(mediaEl);
  mux.addHLSJS(mediaEl, { hlsjs: engine as any });
}

export function emitMuxError(mediaEl: HTMLMediaElement, error: MuxMediaError): void {
  mux.emit(mediaEl, 'error', {
    player_error_code: error.muxCode ?? error.code,
    player_error_message: error.message,
    ...(error.context !== undefined ? { player_error_context: error.context } : {}),
  });
}

export function emitMuxHeartbeat(mediaEl: HTMLMediaElement, data: Partial<Metadata>): void {
  mux.emit(mediaEl, 'hb', data);
}
