import fullscreenEnterAlt from '../assets/fullscreen-enter-alt.svg';
// Import SVG files as strings
import fullscreenEnter from '../assets/fullscreen-enter.svg';
import fullscreenExitAlt from '../assets/fullscreen-exit-alt.svg';
import fullscreenExit from '../assets/fullscreen-exit.svg';
import pause from '../assets/pause.svg';
import play from '../assets/play.svg';
import volumeHigh from '../assets/volume-high.svg';
import volumeLow from '../assets/volume-low.svg';
import volumeOff from '../assets/volume-off.svg';

export const SVG_ICONS: Record<string, string> = {
  play,
  pause,
  volumeHigh,
  volumeLow,
  volumeOff,
  fullscreenEnter,
  fullscreenExit,
  fullscreenEnterAlt,
  fullscreenExitAlt,
};

// TODO: Check if we need below? It seems to be unused now.

// Legacy interface for backward compatibility
export interface IconDefinition {
  name: string;
  viewBox: string;
  paths: string[];
}

export const ICON_DEFINITIONS: Record<string, IconDefinition> = {
  play: {
    name: 'play',
    viewBox: '0 0 24 24',
    paths: ['M8 5v14l11-7z'],
  },
  pause: {
    name: 'pause',
    viewBox: '0 0 24 24',
    paths: ['M6 19h4V5H6v14zm8-14v14h4V5h-4z'],
  },
  stop: {
    name: 'stop',
    viewBox: '0 0 24 24',
    paths: ['M6 6h12v12H6z'],
  },
  volumeUp: {
    name: 'volume-up',
    viewBox: '0 0 24 24',
    paths: [
      'M3 9v6h4l5 5V4L7 9H3z',
      'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z',
      'M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
    ],
  },
  volumeOff: {
    name: 'volume-off',
    viewBox: '0 0 24 24',
    paths: [
      'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63z',
      'M19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71z',
      'M4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3z',
      'M12 4L9.91 6.09 12 8.18V4z',
    ],
  },
  fullscreenEnter: {
    name: 'fullscreen-enter',
    viewBox: '0 0 26 24',
    paths: ['M16 3v2.5h3.5V9H22V3h-6ZM4 9h2.5V5.5H10V3H4v6Zm15.5 9.5H16V21h6v-6h-2.5v3.5ZM6.5 15H4v6h6v-2.5H6.5V15Z'],
  },
  fullscreenExit: {
    name: 'fullscreen-exit',
    viewBox: '0 0 26 24',
    paths: [
      'M18.5 6.5V3H16v6h6V6.5h-3.5ZM16 21h2.5v-3.5H22V15h-6v6ZM4 17.5h3.5V21H10v-6H4v2.5Zm3.5-11H4V9h6V3H7.5v3.5Z',
    ],
  },
};

export function getIcon(name: string): IconDefinition | undefined {
  return ICON_DEFINITIONS[name];
}

export function getAllIcons(): IconDefinition[] {
  return Object.values(ICON_DEFINITIONS);
}

export function createSVGString(icon: IconDefinition): string {
  const pathElements = icon.paths.map(path => `<path d="${path}"/>`).join('');
  return `<svg viewBox="${icon.viewBox}" xmlns="http://www.w3.org/2000/svg">${pathElements}</svg>`;
}
