# API Reference Template

Use this template for documenting functions, classes, and modules.

---

## Function Template

```markdown
## functionName

Brief description of what the function does.

import { functionName } from '@videojs/core';

const result = functionName(arg1, arg2);

### Parameters

| Parameter | Type      | Description           |
| --------- | --------- | --------------------- |
| `arg1`    | `string`  | Description of arg1   |
| `arg2`    | `Options` | Configuration options |

### Options

| Option    | Type      | Default     | Description |
| --------- | --------- | ----------- | ----------- |
| `option1` | `string`  | `'default'` | Description |
| `option2` | `boolean` | `false`     | Description |

### Returns

`ReturnType` — Description of return value.

| Property | Type     | Description |
| -------- | -------- | ----------- |
| `prop1`  | `string` | Description |
| `prop2`  | `number` | Description |

### Throws

| Error           | Condition               |
| --------------- | ----------------------- |
| `TypeError`     | When arg1 is invalid    |
| `NotFoundError` | When resource not found |

### Examples

#### Basic Usage

const result = functionName('value');

#### With Options

const result = functionName('value', {
option1: 'custom',
option2: true,
});

### See Also

- [relatedFunction](/api/related-function)
- [Concept Guide](/guides/concept)
```

---

## Class Template

```markdown
## ClassName

Brief description of the class.

import { ClassName } from '@videojs/core';

const instance = new ClassName(options);

### Constructor

#### Parameters

| Parameter | Type           | Description   |
| --------- | -------------- | ------------- |
| `options` | `ClassOptions` | Configuration |

#### Options

| Option    | Type      | Default | Description     |
| --------- | --------- | ------- | --------------- |
| `option1` | `string`  | —       | Required option |
| `option2` | `boolean` | `false` | Optional        |

### Properties

| Property         | Type     | Description        |
| ---------------- | -------- | ------------------ |
| `readonly prop1` | `string` | Read-only property |
| `prop2`          | `number` | Writable property  |

### Methods

#### methodName()

Description of method.

instance.methodName(arg);

**Parameters:**

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `arg`     | `string` | Description |

**Returns:** `ReturnType` — Description.

#### anotherMethod()

Description of another method.

await instance.anotherMethod();

**Returns:** `Promise<void>`

### Events

| Event    | Payload            | Description   |
| -------- | ------------------ | ------------- |
| `event1` | `{ data: string }` | Fired when... |
| `event2` | `void`             | Fired when... |

### Example

import { ClassName } from '@videojs/core';

const instance = new ClassName({
option1: 'value',
});

instance.on('event1', ({ data }) => {
console.log(data);
});

await instance.methodName('arg');

### See Also

- [Related Class](/api/related-class)
- [Usage Guide](/guides/usage)
```

---

## Hook Template (React/Vue/Solid)

```markdown
## useHookName

Brief description of what the hook provides.

import { useHookName } from '@videojs/react';

function Component() {
const { value, setValue } = useHookName();
return <div>{value}</div>;
}

### Parameters

| Parameter | Type          | Description   |
| --------- | ------------- | ------------- |
| `options` | `HookOptions` | Configuration |

### Options

| Option         | Type                 | Default | Description     |
| -------------- | -------------------- | ------- | --------------- |
| `initialValue` | `T`                  | —       | Initial value   |
| `onChange`     | `(value: T) => void` | —       | Change callback |

### Returns

| Property   | Type                 | Description      |
| ---------- | -------------------- | ---------------- |
| `value`    | `T`                  | Current value    |
| `setValue` | `(value: T) => void` | Update value     |
| `reset`    | `() => void`         | Reset to initial |

### Examples

#### Basic

function Player() {
const { volume, setVolume } = useVolume();

return (
<input
type="range"
value={volume}
onChange={(e) => setVolume(Number(e.target.value))}
/>
);
}

#### With Initial Value

const { volume } = useVolume({ initialValue: 0.5 });

### See Also

- [useRelatedHook](/api/use-related-hook)
- [State Guide](/guides/state)
```

---

## Module/Namespace Template

```markdown
## moduleName

Brief description of the module.

import \* as moduleName from '@videojs/core/module';

// or specific imports
import { func1, func2 } from '@videojs/core/module';

### Exports

| Export   | Type       | Description     |
| -------- | ---------- | --------------- |
| `func1`  | `Function` | Does X          |
| `func2`  | `Function` | Does Y          |
| `Const1` | `string`   | Constant value  |
| `Type1`  | `type`     | Type definition |

### func1

[Full documentation...]

### func2

[Full documentation...]

### Types

#### Type1

type Type1 = {
prop1: string;
prop2: number;
};

### Constants

| Constant | Value     | Description |
| -------- | --------- | ----------- |
| `Const1` | `'value'` | Description |
| `Const2` | `42`      | Description |
```

---

## Type Template

```markdown
## TypeName

Brief description of the type.

import type { TypeName } from '@videojs/core';

const value: TypeName = {
prop1: 'value',
prop2: 42,
};

### Definition

type TypeName = {
prop1: string;
prop2: number;
prop3?: boolean;
};

### Properties

| Property | Type      | Required | Description |
| -------- | --------- | -------- | ----------- |
| `prop1`  | `string`  | Yes      | Description |
| `prop2`  | `number`  | Yes      | Description |
| `prop3`  | `boolean` | No       | Description |

### Usage

function process(input: TypeName): void {
console.log(input.prop1, input.prop2);
}

### Related Types

- [RelatedType](/api/types/related-type)
- [AnotherType](/api/types/another-type)
```

---

## Slice Template

For `@videojs/store` slices:

```markdown
## sliceName

Brief description of what state this slice manages.

import { sliceName } from '@videojs/core/dom';
// or
import { createSlice } from '@videojs/store';

const sliceName = createSlice<HTMLMediaElement>()({
initialState: {
property1: defaultValue,
property2: defaultValue,
},

getSnapshot: ({ target }) => ({
property1: target.property1,
property2: target.property2,
}),

subscribe: ({ target, update, signal }) => {
listen(target, 'eventname', update, { signal });
},

request: {
requestName: (input, { target }) => {
target.property = input;
return target.property;
},
},
});

### State

| Property    | Type   | Description |
| ----------- | ------ | ----------- |
| `property1` | `type` | Description |
| `property2` | `type` | Description |

### Requests

| Request       | Input       | Output       | Description  |
| ------------- | ----------- | ------------ | ------------ |
| `requestName` | `InputType` | `OutputType` | What it does |

### Type Inference

import type { InferSliceState, InferSliceRequests } from '@videojs/store';

type SliceNameState = InferSliceState<typeof sliceName>;
type SliceNameRequests = InferSliceRequests<typeof sliceName>;

### See Also

- [Related Slice](/api/slices/related)
- [Store Guide](/guides/store)
```

---

## Lit Controller Template

For `@videojs/store/lit` controllers:

```markdown
## ControllerName

Brief description of what this controller does.

import { ControllerName } from '@videojs/store/lit';

class MyElement extends LitElement {
#controller = new ControllerName(this, source, ...args);

render() {
return html`<div>${this.#controller.value}</div>`;
}
}

### Constructor

new ControllerName(host, source, ...args)

#### Parameters

| Parameter | Type                                   | Description             |
| --------- | -------------------------------------- | ----------------------- |
| `host`    | `ReactiveControllerHost & HTMLElement` | The Lit element         |
| `source`  | `Store \| Context<Store>`              | Direct store or context |

### Properties

| Property | Type | Description       |
| -------- | ---- | ----------------- |
| `value`  | `T`  | The current value |

### Lifecycle

| Method               | Description                  |
| -------------------- | ---------------------------- |
| `hostConnected()`    | Called when host connects    |
| `hostDisconnected()` | Called when host disconnects |

### Example

import { SnapshotController } from '@videojs/store/lit';

class PlayButton extends LitElement {
#state = new SnapshotController(this, store.state);
#play = new RequestController(this, context, 'play');

render() {
return html\`
<button @click=\${() => this.#play.value()}>
\${this.#state.value.paused ? 'Play' : 'Pause'}
</button>
\`;
}
}

### See Also

- [Related Controller](/api/controllers/related)
- [Lit Integration Guide](/guides/lit)
```

---

## Checklist

When writing API reference:

- [ ] Brief description at top
- [ ] Import statement shown
- [ ] Basic example immediately after
- [ ] All parameters documented
- [ ] All options with types and defaults
- [ ] Return value documented
- [ ] Errors/throws documented if applicable
- [ ] Multiple examples (basic → advanced)
- [ ] See Also section with related items
- [ ] Types linked or inline
