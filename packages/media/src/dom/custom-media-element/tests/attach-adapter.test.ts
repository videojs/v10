import { describe, expect, it } from 'vite-plus/test';

import { AdapterAttachment } from '../attach-adapter';

class OpaqueAdapter extends EventTarget {
  attached: EventTarget[] = [];
  detachCount = 0;
  destroyCount = 0;

  attach(target: EventTarget): void {
    this.attached.push(target);
  }

  detach(): void {
    this.detachCount++;
  }

  destroy(): void {
    this.destroyCount++;
  }
}

describe('AdapterAttachment', () => {
  it('tracks attachment without requiring the adapter to expose its target', () => {
    const element = document.createElement('div');
    const adapter = new OpaqueAdapter();
    const first = new EventTarget();
    const second = new EventTarget();
    let target: EventTarget | null = first;
    const attachment = new AdapterAttachment(element, adapter, () => target);

    expect('target' in adapter).toBe(false);
    expect(attachment.attach()).toBe(true);
    expect(adapter.attached).toEqual([first]);

    expect(attachment.attach()).toBe(false);
    expect(adapter.attached).toEqual([first]);
    expect(adapter.detachCount).toBe(0);

    target = second;
    expect(attachment.attach()).toBe(true);
    expect(adapter.attached).toEqual([first, second]);
    expect(adapter.detachCount).toBe(1);

    target = null;
    expect(attachment.attach()).toBe(true);
    expect(adapter.attached).toEqual([first, second]);
    expect(adapter.detachCount).toBe(2);
  });

  it('destroys the adapter after the owning element detaches from the document', async () => {
    const element = document.createElement('div');
    const adapter = new OpaqueAdapter();
    const attachment = new AdapterAttachment(element, adapter, () => new EventTarget());

    attachment.attach();
    attachment.detach();
    await Promise.resolve();

    expect(adapter.destroyCount).toBe(1);
  });
});
