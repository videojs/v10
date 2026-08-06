import { describe, expect, it } from 'vitest';
import { createPublicPromise } from '../public-promise';

describe('createPublicPromise', () => {
  it('resolves from outside the executor', async () => {
    const promise = createPublicPromise<string>();

    promise.resolve('done');

    await expect(promise).resolves.toBe('done');
  });

  it('rejects from outside the executor', async () => {
    const promise = createPublicPromise<void>();

    promise.reject(new Error('nope'));

    await expect(promise).rejects.toThrow('nope');
  });

  it('settles awaiters that started before it was resolved', async () => {
    const promise = createPublicPromise<number>();
    const awaited = Promise.all([promise, promise]);

    promise.resolve(1);

    await expect(awaited).resolves.toEqual([1, 1]);
  });

  it('ignores a second settle, as promises do', async () => {
    const promise = createPublicPromise<string>();

    promise.resolve('first');
    promise.resolve('second');

    await expect(promise).resolves.toBe('first');
  });

  it('is a real promise, so it chains', async () => {
    const promise = createPublicPromise<number>();

    promise.resolve(2);

    await expect(promise.then((value) => value * 2)).resolves.toBe(4);
  });
});
