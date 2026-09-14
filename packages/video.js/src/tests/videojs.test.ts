import { describe, expect, it } from 'vite-plus/test';

import { isLegacyError, type LegacyErrorCode } from '../errors';
import videojs, { getComponent, getPlayer, getPlugin, options, registerComponent, registerPlugin } from '../videojs';

function codeOf(run: () => unknown): LegacyErrorCode | undefined {
  try {
    run();
  } catch (error) {
    if (isLegacyError(error)) return error.code;

    throw error;
  }

  return undefined;
}

describe('videojs', () => {
  it('throws VJS10_LEGACY_INIT however the v8 factory was called', () => {
    expect(codeOf(() => videojs('my-video'))).toBe('VJS10_LEGACY_INIT');
    expect(codeOf(() => videojs(document.createElement('video'), { controls: true }))).toBe('VJS10_LEGACY_INIT');
    expect(codeOf(() => videojs())).toBe('VJS10_LEGACY_INIT');
  });

  it('carries the v8 statics so property access does not throw before the coded call does', () => {
    expect(videojs.registerPlugin).toBe(registerPlugin);
    expect(videojs.getPlugin).toBe(getPlugin);
    expect(videojs.registerComponent).toBe(registerComponent);
    expect(videojs.getComponent).toBe(getComponent);
    expect(videojs.getPlayer).toBe(getPlayer);
    expect(videojs.options).toBe(options);
  });
});

describe('registerPlugin', () => {
  it('throws VJS10_LEGACY_PLUGIN', () => {
    expect(codeOf(() => registerPlugin('myPlugin', () => {}))).toBe('VJS10_LEGACY_PLUGIN');
    expect(codeOf(() => videojs.registerPlugin('myPlugin', () => {}))).toBe('VJS10_LEGACY_PLUGIN');
  });
});

describe('getPlugin', () => {
  it('throws VJS10_LEGACY_PLUGIN', () => {
    expect(codeOf(() => getPlugin('myPlugin'))).toBe('VJS10_LEGACY_PLUGIN');
  });
});

describe('registerComponent', () => {
  it('throws VJS10_LEGACY_COMPONENT', () => {
    expect(codeOf(() => registerComponent('MyButton', class {}))).toBe('VJS10_LEGACY_COMPONENT');
  });
});

describe('getComponent', () => {
  it('throws VJS10_LEGACY_COMPONENT', () => {
    expect(codeOf(() => getComponent('Button'))).toBe('VJS10_LEGACY_COMPONENT');
  });
});

describe('getPlayer', () => {
  it('throws VJS10_LEGACY_GET_PLAYER', () => {
    expect(codeOf(() => getPlayer('my-video'))).toBe('VJS10_LEGACY_GET_PLAYER');
  });
});

describe('options', () => {
  it('throws VJS10_LEGACY_OPTIONS on read', () => {
    expect(codeOf(() => options.autoplay)).toBe('VJS10_LEGACY_OPTIONS');
    expect(codeOf(() => videojs.options.autoplay)).toBe('VJS10_LEGACY_OPTIONS');
  });

  it('throws VJS10_LEGACY_OPTIONS on write, check, and delete', () => {
    const mutable = options as Record<string, unknown>;

    expect(codeOf(() => (mutable.autoplay = true))).toBe('VJS10_LEGACY_OPTIONS');
    expect(codeOf(() => 'autoplay' in mutable)).toBe('VJS10_LEGACY_OPTIONS');
    expect(codeOf(() => delete mutable.autoplay)).toBe('VJS10_LEGACY_OPTIONS');
    expect(codeOf(() => Object.assign(mutable, { autoplay: true }))).toBe('VJS10_LEGACY_OPTIONS');
  });
});
