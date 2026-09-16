/**
 * Mock audio host base — mirrors the real html-audio-adapter.ts.
 *
 * Adds no methods of its own: audio elements get only the shared html-media-adapter
 * methods.
 */
import { HTMLMediaAdapter } from '../html-media-adapter';

export class HTMLAudioAdapter extends HTMLMediaAdapter {}
