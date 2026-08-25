import { isString } from '@videojs/utils/predicate';

import {
  TARGET_EXPRESSION,
  TARGET_SPREAD,
  TARGET_WITH_PROPS,
  type TargetBinding,
  type TargetCode,
  type TargetExpression,
  type TargetExpressionNode,
  type TargetWithProps,
} from './definition';

export function createTargetCode(): TargetCode {
  return {
    param: createBinding,
    fn(parameters, output) {
      return createExpression({ kind: 'function', parameters: parameters.map(readBinding), output });
    },
    when(test, output) {
      return createExpression({ kind: 'conditional', test: readExpression(test), output });
    },
    withProps(children, props) {
      return {
        [TARGET_WITH_PROPS]: true,
        children,
        props: isTargetExpression(props) ? readExpression(props) : props,
      };
    },
  };
}

export function isTargetExpression<Value>(value: Value): value is Value & TargetExpression {
  return Boolean(
    value &&
    typeof value === 'object' &&
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (
      value as Partial<TargetExpression>
    )[TARGET_EXPRESSION]
  );
}

export function isTargetWithProps<Value>(value: Value): value is Value & TargetWithProps {
  return Boolean(
    value &&
    typeof value === 'object' &&
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (
      value as Partial<TargetWithProps>
    )[TARGET_WITH_PROPS] === true
  );
}

export function readTargetExpression(value: TargetExpression): TargetExpressionNode {
  return value[TARGET_EXPRESSION];
}

function createBinding<Value = import('../value').VjscValue>(name: string): TargetBinding<Value> {
  if (!/^[$A-Z_a-z][$\w]*$/.test(name)) {
    throw new Error(`vjsc/target: generated parameter \`${name}\` is not a valid identifier.`);
  }

  return /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ createBindingPath(
    name
  ) as TargetBinding<Value>;
}

function createBindingPath(code: string): TargetBinding {
  const expression = createExpression({ kind: 'reference', code });

  return new Proxy(
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ expression as TargetBinding,
    {
      get(target, property) {
        if (property === TARGET_EXPRESSION) return target[TARGET_EXPRESSION];
        if (isString(property)) return createBindingPath(`${code}.${property}`);
        return /* SAFETY: Target bindings expose generated child bindings by property key. */ (
          target as TargetBinding & Readonly<Record<PropertyKey, import('../value').VjscValue>>
        )[property];
      },
      ownKeys() {
        return [TARGET_SPREAD];
      },
      getOwnPropertyDescriptor(_target, property) {
        return property === TARGET_SPREAD
          ? { configurable: true, enumerable: true, value: expression, writable: false }
          : undefined;
      },
    }
  );
}

function createExpression(expression: TargetExpressionNode): TargetExpression {
  return { [TARGET_EXPRESSION]: expression };
}

function readExpression(expression: TargetExpression): TargetExpressionNode {
  return expression[TARGET_EXPRESSION];
}

function readBinding(binding: TargetBinding): string {
  const expression = readExpression(binding);
  if (expression.kind !== 'reference' || expression.code.includes('.')) {
    throw new Error('vjsc/target: generated function parameters must be direct bindings.');
  }
  return expression.code;
}
