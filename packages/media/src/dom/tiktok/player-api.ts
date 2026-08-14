// Minimal typings and constants for the TikTok embed player
// (https://developers.tiktok.com/doc/embed-player).
// TikTok ships no SDK: the embed is driven with `window.postMessage` in both
// directions, so the message protocol is the whole API.

import { isNumber, isObject, isString } from '@videojs/utils/predicate';

/** Marker every player message carries, whichever way it travels. */
export const PLAYER_MESSAGE_KEY = 'x-tiktok-player';

/**
 * Target origin for outbound commands. The embed answers from whichever TikTok
 * origin served it and the commands carry nothing private, so they go to any.
 */
export const PLAYER_TARGET_ORIGIN = '*';

/** Commands the embed accepts. Only `seekTo` carries a value: seconds. */
export type TikTokPlayerCommand = 'play' | 'pause' | 'seekTo' | 'mute' | 'unMute';

/** A command on its way to the embed. */
export interface TikTokPlayerCommandMessage {
  [PLAYER_MESSAGE_KEY]: true;
  type: TikTokPlayerCommand;
  value?: number;
}

/** The events the embed reports. */
export type TikTokPlayerEventType =
  | 'onPlayerReady'
  | 'onStateChange'
  | 'onCurrentTime'
  | 'onVolumeChange'
  | 'onMute'
  | 'onPlayerError'
  /** Deprecated by TikTok in favor of `onPlayerError`; older embeds still report it. */
  | 'onError';

/**
 * A message from the embed. `value` stays unknown: it arrives from another
 * origin, and what it holds depends on `type`.
 */
export interface TikTokPlayerEventMessage {
  [PLAYER_MESSAGE_KEY]: true;
  /** Widened past the known events, since the embed can report ones we don't handle. */
  type: TikTokPlayerEventType | (string & {});
  value?: unknown;
}

/** Payload of `onCurrentTime`, the embed's only progress report. */
export interface TikTokCurrentTime {
  currentTime: number;
  duration: number;
}

/** Payload of `onPlayerError`. `errorType` names the code for a human. */
export interface TikTokPlayerError {
  errorCode: number;
  errorType?: string;
}

// `onPlayerError` codes are grouped in thousand-wide categories: 1000s data and
// validation (1001 invalid video), 2000s network and infrastructure (2001 server
// error), 3000s player and runtime (3001 playback, 3002 autoplay). Only the
// bounds and the one code that is not an error are named; the rest are read by
// category, so codes TikTok adds later are read the same way.
export const ERROR_AUTOPLAY = 3002;
export const ERROR_NETWORK_CATEGORY = 2000;
export const ERROR_PLAYER_CATEGORY = 3000;
export const ERROR_CATEGORY_END = 4000;

/**
 * Whether a `message` event's data is one of the embed's messages. Every frame
 * on the page posts to the same window, so the marker is what tells this
 * protocol apart from everyone else's.
 */
export function isTikTokPlayerMessage(data: unknown): data is TikTokPlayerEventMessage {
  if (!isObject(data)) return false;
  const message = data as Partial<TikTokPlayerEventMessage>;
  return !!message[PLAYER_MESSAGE_KEY] && isString(message.type);
}

/** Whether a value is the pair `onCurrentTime` reports. */
export function isTikTokCurrentTime(value: unknown): value is TikTokCurrentTime {
  return isObject(value) && isNumber((value as TikTokCurrentTime).currentTime);
}

/** Whether a value is the payload `onPlayerError` reports. */
export function isTikTokPlayerError(value: unknown): value is TikTokPlayerError {
  return isObject(value) && isNumber((value as TikTokPlayerError).errorCode);
}

/** Build a command message. A command without a value must not carry one at all. */
export function createTikTokPlayerCommand(type: TikTokPlayerCommand, value?: number): TikTokPlayerCommandMessage {
  return { [PLAYER_MESSAGE_KEY]: true, type, ...(isNumber(value) && { value }) };
}

// https://developers.tiktok.com/doc/embed-player
export const STATE_INIT = -1;
export const STATE_ENDED = 0;
export const STATE_PLAYING = 1;
export const STATE_PAUSED = 2;
export const STATE_BUFFERING = 3;
