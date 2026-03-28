import { describe, expect, it, vi } from 'vitest';
import { EngineLifecycle } from '../engine-lifecycle';

function tick() {
  return Promise.resolve();
}

class TestEngine extends EngineLifecycle {
  engineUpdateSpy = vi.fn();
  engineDestroySpy = vi.fn();
  loadSpy = vi.fn();
  #props: Record<string, any> = {};

  get engineProps() {
    return { ...this.#props, config: this.config };
  }

  setProps(props: Record<string, any>) {
    this.#props = props;
  }

  engineUpdate(): void {
    this.engineUpdateSpy();
  }

  engineDestroy(): void {
    super.engineDestroy();
    this.engineDestroySpy();
  }

  load(src?: string): void {
    super.load(src);
    this.loadSpy(this.src);
  }
}

describe('EngineLifecycle', () => {
  it('batches multiple property changes into a single load via requestLoad', async () => {
    const engine = new TestEngine();
    engine.src = 'a.m3u8';
    engine.config = { debug: true };

    expect(engine.loadSpy).not.toHaveBeenCalled();

    await tick();

    expect(engine.loadSpy).toHaveBeenCalledOnce();
  });

  it('calls engineUpdate on first load', async () => {
    const engine = new TestEngine();
    engine.src = 'a.m3u8';

    await tick();

    expect(engine.engineUpdateSpy).toHaveBeenCalledOnce();
  });

  it('calls engineDestroy then engineUpdate when engineProps change', async () => {
    const engine = new TestEngine();
    engine.src = 'a.m3u8';
    await tick();

    engine.engineUpdateSpy.mockClear();
    engine.engineDestroySpy.mockClear();

    engine.setProps({ mode: 'native' });
    engine.requestLoad();
    await tick();

    expect(engine.engineDestroySpy).toHaveBeenCalledOnce();
    expect(engine.engineUpdateSpy).toHaveBeenCalledOnce();
  });

  it('skips engine recreation when engineProps are unchanged', async () => {
    const engine = new TestEngine();
    engine.src = 'a.m3u8';
    await tick();

    engine.engineUpdateSpy.mockClear();
    engine.engineDestroySpy.mockClear();

    engine.src = 'b.m3u8';
    await tick();

    expect(engine.engineUpdateSpy).not.toHaveBeenCalled();
    expect(engine.engineDestroySpy).not.toHaveBeenCalled();
    expect(engine.loadSpy).toHaveBeenCalledWith('b.m3u8');
  });

  it('direct load() cancels a pending requestLoad microtask', async () => {
    const engine = new TestEngine();

    engine.config = { debug: true };
    engine.load('a.m3u8');

    expect(engine.loadSpy).toHaveBeenCalledOnce();
    engine.loadSpy.mockClear();

    await tick();

    expect(engine.loadSpy).not.toHaveBeenCalled();
  });

  it('does not double-load when an outer delegate calls load after setting config', async () => {
    const inner = new TestEngine();

    inner.config = { quality: 'high' };
    inner.load('stream.m3u8');

    expect(inner.loadSpy).toHaveBeenCalledOnce();
    expect(inner.loadSpy).toHaveBeenCalledWith('stream.m3u8');
    inner.loadSpy.mockClear();

    await tick();
    await tick();

    expect(inner.loadSpy).not.toHaveBeenCalled();
  });

  it('requestLoad still works after a direct load cancels a previous one', async () => {
    const engine = new TestEngine();

    engine.config = { a: 1 };
    engine.load('first.m3u8');
    engine.loadSpy.mockClear();

    await tick();
    expect(engine.loadSpy).not.toHaveBeenCalled();

    engine.src = 'second.m3u8';
    await tick();

    expect(engine.loadSpy).toHaveBeenCalledOnce();
    expect(engine.loadSpy).toHaveBeenCalledWith('second.m3u8');
  });

  it('load(src) updates the src property', () => {
    const engine = new TestEngine();
    engine.load('explicit.m3u8');

    expect(engine.src).toBe('explicit.m3u8');
  });

  it('engineDestroy cancels a pending requestLoad microtask', async () => {
    const engine = new TestEngine();
    engine.src = 'a.m3u8';
    await tick();

    engine.engineUpdateSpy.mockClear();
    engine.engineDestroySpy.mockClear();
    engine.loadSpy.mockClear();

    engine.src = 'b.m3u8';
    engine.engineDestroy();

    await tick();

    expect(engine.loadSpy).not.toHaveBeenCalled();
    expect(engine.engineUpdateSpy).not.toHaveBeenCalled();
  });

  it('engineUpdate fires after engineDestroy resets prevEngineProps', async () => {
    const engine = new TestEngine();
    engine.src = 'a.m3u8';
    await tick();

    expect(engine.engineUpdateSpy).toHaveBeenCalledOnce();
    engine.engineUpdateSpy.mockClear();
    engine.engineDestroySpy.mockClear();

    engine.engineDestroy();

    engine.src = 'b.m3u8';
    await tick();

    expect(engine.engineUpdateSpy).toHaveBeenCalledOnce();
  });
});
