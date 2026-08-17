import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ElementSize, observeElementSize, observeRenderedSize } from '../element-size';

const elements: HTMLElement[] = [];

/** A laid-out box — an element that isn't rendered is never observed. */
function makeBox(width: number, height: number): HTMLDivElement {
  const element = document.createElement('div');
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  document.body.append(element);
  elements.push(element);
  return element;
}

/** A `MediaQueryList` stand-in; see `device-pixel-ratio.test.ts`. */
class FakeMediaQueryList extends EventTarget {
  constructor(readonly media: string) {
    super();
  }
}

function stubMatchMedia(): FakeMediaQueryList[] {
  const queries: FakeMediaQueryList[] = [];
  vi.stubGlobal('matchMedia', (media: string) => {
    const query = new FakeMediaQueryList(media);
    queries.push(query);
    return query;
  });
  return queries;
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const element of elements.splice(0)) element.remove();
});

describe('observeElementSize', () => {
  it('reports the content box on the initial observation', async () => {
    const element = makeBox(320, 180);
    const onResize = vi.fn<(size: ElementSize) => void>();

    const stop = observeElementSize(element, onResize);

    await vi.waitFor(() => expect(onResize).toHaveBeenLastCalledWith({ width: 320, height: 180 }));

    stop();
  });

  it('reports the content box, excluding padding and border', async () => {
    const element = makeBox(320, 180);
    element.style.boxSizing = 'border-box';
    element.style.padding = '10px';
    element.style.border = '5px solid';
    const onResize = vi.fn<(size: ElementSize) => void>();

    const stop = observeElementSize(element, onResize);

    await vi.waitFor(() => expect(onResize).toHaveBeenLastCalledWith({ width: 290, height: 150 }));

    stop();
  });

  it('reports each resize', async () => {
    const element = makeBox(320, 180);
    const onResize = vi.fn<(size: ElementSize) => void>();

    const stop = observeElementSize(element, onResize);
    await vi.waitFor(() => expect(onResize).toHaveBeenLastCalledWith({ width: 320, height: 180 }));

    element.style.width = '640px';
    element.style.height = '360px';

    await vi.waitFor(() => expect(onResize).toHaveBeenLastCalledWith({ width: 640, height: 360 }));

    stop();
  });

  it('reports a zero box for an element that is not rendered', async () => {
    const element = makeBox(320, 180);
    element.style.display = 'none';
    const onResize = vi.fn<(size: ElementSize) => void>();

    const stop = observeElementSize(element, onResize);

    // Passed through as measured — what a zero box means is the caller's call.
    await vi.waitFor(() => expect(onResize).toHaveBeenLastCalledWith({ width: 0, height: 0 }));

    stop();
  });

  it('stops reporting after cleanup', async () => {
    const element = makeBox(320, 180);
    const onResize = vi.fn<(size: ElementSize) => void>();

    const stop = observeElementSize(element, onResize);
    await vi.waitFor(() => expect(onResize).toHaveBeenCalled());
    stop();

    element.style.width = '640px';
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(onResize).toHaveBeenLastCalledWith({ width: 320, height: 180 });
  });
});

describe('observeRenderedSize', () => {
  it('reports the content box with the current device pixel ratio', async () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const element = makeBox(320, 180);
    const onChange = vi.fn();

    const stop = observeRenderedSize(element, onChange);

    await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ width: 320, height: 180, scale: 2 }));

    stop();
  });

  it('re-reports the last box when the ratio changes', async () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const queries = stubMatchMedia();
    const element = makeBox(320, 180);
    const onChange = vi.fn();

    const stop = observeRenderedSize(element, onChange);
    await vi.waitFor(() => expect(onChange).toHaveBeenCalled());

    vi.stubGlobal('devicePixelRatio', 3);
    queries[0]?.dispatchEvent(new Event('change'));

    // The CSS box is unchanged; its device-pixel size is not.
    expect(onChange).toHaveBeenLastCalledWith({ width: 320, height: 180, scale: 3 });

    stop();
  });

  it('reports nothing before the first box arrives', async () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const queries = stubMatchMedia();
    const element = makeBox(320, 180);
    const onChange = vi.fn();

    const stop = observeRenderedSize(element, onChange);

    // The observer's first delivery is async, so this ratio change lands first —
    // a scale with no box to apply it to is not a measurement.
    vi.stubGlobal('devicePixelRatio', 3);
    queries[0]?.dispatchEvent(new Event('change'));
    expect(onChange).not.toHaveBeenCalled();

    await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ width: 320, height: 180, scale: 3 }));

    stop();
  });

  it('stops both watchers on cleanup', async () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const queries = stubMatchMedia();
    const element = makeBox(320, 180);
    const onChange = vi.fn();

    const stop = observeRenderedSize(element, onChange);
    await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
    stop();

    element.style.width = '640px';
    vi.stubGlobal('devicePixelRatio', 3);
    queries[0]?.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(onChange).toHaveBeenLastCalledWith({ width: 320, height: 180, scale: 2 });
  });
});
