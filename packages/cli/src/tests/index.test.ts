import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const handlers = vi.hoisted(() => ({
  config: vi.fn(),
  docs: vi.fn(),
}));

vi.mock('../commands/config.js', () => ({ handleConfig: handlers.config }));
vi.mock('../commands/docs.js', () => ({ handleDocs: handlers.docs }));

class ExitError extends Error {
  constructor(readonly code?: string | number | null) {
    super(`process.exit(${code})`);
  }
}

const originalArgv = [...process.argv];

async function runCli(...args: string[]): Promise<void> {
  process.argv = [process.execPath, 'videojs', ...args];
  await import('../index.js');
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new ExitError(code);
  });
});

afterEach(() => {
  process.argv = [...originalArgv];
  vi.restoreAllMocks();
});

describe('@videojs/cli', () => {
  it('prints its version and exits successfully', async () => {
    await expect(runCli('--version')).rejects.toMatchObject({ code: 0 });

    expect(console.log).toHaveBeenCalledWith('@videojs/cli v0.0.0-test');
    expect(handlers.docs).not.toHaveBeenCalled();
    expect(handlers.config).not.toHaveBeenCalled();
  });

  it('prints top-level help when invoked without a command', async () => {
    await expect(runCli()).rejects.toMatchObject({ code: 0 });

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('docs <slug> [options]'));
  });

  it('forwards nested doc slugs and parsed flags to the docs command', async () => {
    await runCli('docs', 'concepts/overview', '--framework', 'react', '--list');

    expect(handlers.docs).toHaveBeenCalledWith(expect.objectContaining({ framework: 'react', list: true }), [
      'concepts/overview',
    ]);
  });

  it('forwards config subcommand arguments and the help flag', async () => {
    await runCli('config', 'set', 'framework', 'html', '--help');

    expect(handlers.config).toHaveBeenCalledWith(['set', 'framework', 'html'], { help: true });
  });

  it('reports unknown commands and exits with an error', async () => {
    await expect(runCli('unknown')).rejects.toMatchObject({ code: 1 });

    expect(console.error).toHaveBeenCalledWith('Unknown command: "unknown". Run with --help for usage.');
  });
});
