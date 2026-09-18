import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const config = vi.hoisted(() => ({
  get: vi.fn(),
  list: vi.fn(),
  set: vi.fn(),
}));

vi.mock('../../utils/config.js', () => ({
  getConfigValue: config.get,
  listConfig: config.list,
  setConfigValue: config.set,
}));

import { handleConfig } from '../config.js';

class ExitError extends Error {
  constructor(readonly code?: string | number | null) {
    super(`process.exit(${code})`);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  config.get.mockReturnValue(undefined);
  config.list.mockReturnValue({});
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new ExitError(code);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('handleConfig', () => {
  it('sets a validated preference', () => {
    handleConfig(['set', 'framework', 'react']);

    expect(config.set).toHaveBeenCalledWith('framework', 'react');
    expect(console.log).toHaveBeenCalledWith('Set framework = react');
  });

  it('reports validation errors from the config store', () => {
    config.set.mockImplementation(() => {
      throw new Error('Invalid value "vue" for "framework"');
    });

    expect(() => handleConfig(['set', 'framework', 'vue'])).toThrow(ExitError);
    expect(console.error).toHaveBeenCalledWith('Invalid value "vue" for "framework"');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('prints a saved preference', () => {
    config.get.mockReturnValue('html');

    handleConfig(['get', 'framework']);

    expect(console.log).toHaveBeenCalledWith('html');
  });

  it('reports missing preferences', () => {
    expect(() => handleConfig(['get', 'framework'])).toThrow(ExitError);
    expect(console.error).toHaveBeenCalledWith('No value set for "framework"');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('lists all saved preferences', () => {
    config.list.mockReturnValue({ framework: 'react' });

    handleConfig(['list']);

    expect(console.log).toHaveBeenCalledWith('framework = react');
  });

  it('prints help and exits successfully', () => {
    expect(() => handleConfig([], { help: true })).toThrow(ExitError);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('config <set|get|list>'));
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('prints help and exits with an error for unknown subcommands', () => {
    expect(() => handleConfig(['unknown'])).toThrow(ExitError);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('config <set|get|list>'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
