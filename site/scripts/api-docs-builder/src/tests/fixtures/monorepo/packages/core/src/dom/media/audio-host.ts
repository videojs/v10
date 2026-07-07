/**
 * Mock audio host base — mirrors the real audio-host.ts.
 *
 * Adds no methods of its own: audio elements get only the shared media-host
 * methods.
 */
import { HTMLMediaElementHost } from './media-host';

export class HTMLAudioElementHost extends HTMLMediaElementHost {}
