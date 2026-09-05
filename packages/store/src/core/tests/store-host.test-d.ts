import { assertType } from 'vite-plus/test';

import type { Store, StoreHost } from '../store';

interface TestState {
  count: number;
  title: number;
  increment(): void;
}

type TestStore = Store<unknown, TestState>;
type TestHost = StoreHost<TestStore, { title: string }>;

declare const host: TestHost;

assertType<number>(host.count);
assertType<string>(host.title);
assertType<() => void>(host.increment);
assertType<TestStore>(host.store);
assertType<() => void>(host.subscribe(() => {}));

// @ts-expect-error Direct store state is read-only.
host.count = 1;
