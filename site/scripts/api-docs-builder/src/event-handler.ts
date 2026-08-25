import type { OxcProject } from './oxc-project.js';
import { parseJSDoc, sourceText, staticName, walkAst } from './oxc-project.js';

/** Collect event descriptions declared with `@fires event-name - Description`. */
export function collectFires(files: readonly string[], project: OxcProject): Map<string, string> {
  const fires = new Map<string, string>();

  for (const filePath of files) {
    const file = project.source(filePath);
    if (!file) continue;

    for (const comment of file.comments) {
      if (comment.type !== 'Block' || !comment.value.startsWith('*')) continue;

      for (const value of parseJSDoc(comment.value).tags.get('fires') ?? []) {
        const match = value.match(/^(\S+)\s*(?:-\s*)?(.*)$/s);

        if (match?.[1] && !fires.has(match[1])) fires.set(match[1], match[2]?.trim() ?? '');
      }
    }
  }

  return fires;
}

/** Collect literal event names dispatched by the given source files. */
export function collectDispatchedEvents(files: readonly string[], project: OxcProject): Set<string> {
  const events = new Set<string>();

  for (const filePath of files) {
    const file = project.source(filePath);
    if (!file) continue;

    walkAst(file.program, (node) => {
      if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'emit') {
        const argument = node.arguments[0];
        const eventName = argument?.type === 'Literal' ? staticName(argument) : undefined;

        if (eventName) events.add(eventName);
      }

      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression' &&
        !node.callee.computed &&
        node.callee.property.type === 'Identifier' &&
        node.callee.property.name === 'dispatchEvent'
      ) {
        const event = node.arguments[0];

        if (
          event?.type !== 'NewExpression' ||
          event.callee.type !== 'Identifier' ||
          !['Event', 'CustomEvent'].includes(event.callee.name)
        ) {
          return;
        }

        const argument = event.arguments[0];
        const eventName = argument?.type === 'Literal' ? staticName(argument) : undefined;

        if (eventName) events.add(eventName);
      }

      if (node.type === 'ForOfStatement' && node.right.type === 'ArrayExpression') {
        const variable =
          node.left.type === 'VariableDeclaration'
            ? staticName(node.left.declarations[0]?.id)
            : node.left.type === 'Identifier'
              ? node.left.name
              : undefined;
        if (!variable || !sourceText(file, node.body).includes(`Event(${variable})`)) return;

        for (const element of node.right.elements) {
          const eventName = element?.type === 'Literal' ? staticName(element) : undefined;

          if (eventName) events.add(eventName);
        }
      }
    });
  }

  return events;
}
