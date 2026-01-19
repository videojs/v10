# Error Documentation Pattern

Document store errors consistently across Video.js packages.

---

## Error Code Reference Table

Always document errors in this format:

| Code         | Meaning                                     | Recovery                                       |
| ------------ | ------------------------------------------- | ---------------------------------------------- |
| `ABORTED`    | Request aborted via signal                  | Expected during cleanup — no action needed     |
| `CANCELLED`  | Cancelled by another request's `cancel: []` | Check request coordination                     |
| `SUPERSEDED` | Same-key request replaced this one          | Expected during rapid input — no action needed |
| `REJECTED`   | Guard returned falsy                        | Check preconditions, show user feedback        |
| `TIMEOUT`    | Guard timed out                             | Increase timeout or check target readiness     |
| `NO_TARGET`  | No target attached                          | Call `attach()` before making requests         |
| `DETACHED`   | Target was detached                         | Re-attach or abort operation                   |
| `DESTROYED`  | Store was destroyed                         | Create new store instance                      |

---

## Expected vs Unexpected Errors

Document which errors are "normal" vs programming errors:

| Code         | Expected? | Notes                                         |
| ------------ | --------- | --------------------------------------------- |
| `SUPERSEDED` | Often     | Rapid user input (scrubbing, repeated clicks) |
| `ABORTED`    | Often     | Component unmount, navigation                 |
| `CANCELLED`  | Sometimes | Intentional coordination between requests     |
| `REJECTED`   | Sometimes | Guard logic blocking execution                |
| `TIMEOUT`    | Rarely    | Slow media load, network issues               |
| `NO_TARGET`  | Never     | Programming error — attach before use         |
| `DETACHED`   | Rarely    | Lifecycle timing issue                        |
| `DESTROYED`  | Never     | Programming error — don't use after destroy   |

---

## Error Handling Patterns

### Global Handler (store config)

```ts
const store = createStore({
  slices: [playbackSlice, volumeSlice],
  onError: ({ error, request }) => {
    if (request) {
      console.error(`${request.name} failed:`, error.code);
    }
    // Report to analytics, show toast, etc.
  },
});
```

### Local Handler (try/catch)

```ts
import { isStoreError } from '@videojs/store';

try {
  await store.request.play();
} catch (error) {
  if (isStoreError(error)) {
    switch (error.code) {
      case 'SUPERSEDED':
        // Another request took over — expected, ignore
        break;
      case 'REJECTED':
        // Guard blocked execution — show feedback
        showMessage('Cannot play right now');
        break;
      case 'TIMEOUT':
        // Took too long — retry or show error
        showMessage('Media not ready');
        break;
      default:
        console.error(`[${error.code}]`, error.message);
    }
  } else {
    throw error; // Re-throw unknown errors
  }
}
```

### Type Guard Pattern

Always show the type guard:

```ts
import { isStoreError } from '@videojs/store';

function handleError(error: unknown) {
  if (isStoreError(error)) {
    // error is StoreError — has .code, .message
    return { code: error.code, message: error.message };
  }
  throw error;
}
```

---

## Troubleshooting Section Format

### Structure

1. Error code/message as heading
2. **Cause:** One sentence
3. **Solution:** Code example

### Examples

#### NO_TARGET

**Cause:** Request made before `attach()` was called.

**Solution:**

```ts
// ❌ Wrong
const store = createStore({ slices: [playbackSlice] });
await store.request.play(); // Error: NO_TARGET

// ✅ Correct
const store = createStore({ slices: [playbackSlice] });
store.attach(videoElement);
await store.request.play();
```

#### SUPERSEDED

**Cause:** Another request with the same key started before this one finished.

**Solution:** This is usually expected behavior. If you need the result, check before making a new request:

```ts
// If you need to know the final state
const result = await store.request.play();
// Result may be from a later request if superseded

// If you want to prevent supersession, use unique keys
request: {
  trackEvent: {
    key: () => Symbol(), // Each call gets unique key
    handler: (data) => analytics.log(data),
  },
}
```

#### REJECTED

**Cause:** A guard returned a falsy value.

**Solution:** Check what condition the guard expects:

```ts
// Guard that checks readyState
const canPlay: Guard<HTMLMediaElement> = ({ target }) => {
  return target.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA;
};

// If rejected, media isn't ready — wait for canplay event
player.on('canplay', () => {
  // Now safe to request play
  store.request.play();
});
```

#### TIMEOUT

**Cause:** A guard didn't resolve within the timeout period.

**Solution:** Increase the timeout or ensure the target is ready:

```ts
import { timeout } from '@videojs/store';

request: {
  play: {
    // Increase timeout for slow connections
    guard: timeout(canMediaPlay, 10000), // 10 seconds
    handler: async (_, { target }) => {
      await target.play();
    },
  },
}
```

#### ABORTED

**Cause:** The abort signal was triggered (usually from component unmount).

**Solution:** This is expected behavior. Ensure cleanup runs:

```ts
// React
useEffect(() => {
  const controller = new AbortController();

  store.request.play(null, { signal: controller.signal });

  return () => controller.abort(); // Cleans up on unmount
}, []);
```

---

## API Reference Format

When documenting error-related APIs:

### isStoreError

Type guard for store errors.

```ts
import { isStoreError } from '@videojs/store';

if (isStoreError(error)) {
  console.log(error.code); // 'ABORTED' | 'CANCELLED' | ...
}
```

#### Parameters

| Parameter | Type      | Description      |
| --------- | --------- | ---------------- |
| `error`   | `unknown` | Any caught error |

#### Returns

`error is StoreError` — Type predicate

### StoreError

Error thrown by store operations.

#### Properties

| Property  | Type             | Description                |
| --------- | ---------------- | -------------------------- |
| `code`    | `StoreErrorCode` | Error classification       |
| `message` | `string`         | Human-readable description |

#### StoreErrorCode

```ts
type StoreErrorCode =
  | 'ABORTED'
  | 'CANCELLED'
  | 'DESTROYED'
  | 'DETACHED'
  | 'NO_TARGET'
  | 'REJECTED'
  | 'SUPERSEDED'
  | 'TIMEOUT';
```

---

## Checklist

When documenting errors:

- [ ] Error code table with all codes
- [ ] Expected vs unexpected classification
- [ ] Global handler example (onError)
- [ ] Local handler example (try/catch)
- [ ] Type guard usage shown
- [ ] Troubleshooting section for common errors
- [ ] Each troubleshooting entry has: Cause + Solution
- [ ] Code examples are self-contained
