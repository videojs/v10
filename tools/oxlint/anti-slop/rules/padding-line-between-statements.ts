import { defineRule } from "@oxlint/plugins";

import type { ESTree, Fixer, SourceCode } from "@oxlint/plugins";

type Statement = ESTree.Directive | ESTree.Statement;

const CONTROL_FLOW_TYPES = new Set([
	"DoWhileStatement",
	"ForInStatement",
	"ForOfStatement",
	"ForStatement",
	"IfStatement",
	"SwitchStatement",
	"TryStatement",
	"WhileStatement",
]);

// Padding detection and comment anchoring follow the behavior of
// `@stylistic/padding-line-between-statements` (MIT).
// https://eslint.style/rules/default/padding-line-between-statements

function unwrapLabeledStatement(statement: Statement): Statement {
	while (statement.type === "LabeledStatement") statement = statement.body;

	return statement;
}

function isVariableDeclaration(statement: Statement): boolean {
	return unwrapLabeledStatement(statement).type === "VariableDeclaration";
}

function variableDeclaration(statement: Statement): ESTree.VariableDeclaration | null {
	const unwrapped = unwrapLabeledStatement(statement);

	return unwrapped.type === "VariableDeclaration" ? unwrapped : null;
}

function isControlFlowStatement(statement: Statement): boolean {
	return CONTROL_FLOW_TYPES.has(unwrapLabeledStatement(statement).type);
}

function isAbruptStatement(statement: Statement): boolean {
	const unwrapped = unwrapLabeledStatement(statement);
	if (unwrapped.type === "BlockStatement") {
		return unwrapped.body.length === 1 && isAbruptStatement(unwrapped.body[0]);
	}

	return (
		unwrapped.type === "BreakStatement" ||
		unwrapped.type === "ContinueStatement" ||
		unwrapped.type === "ReturnStatement" ||
		unwrapped.type === "ThrowStatement"
	);
}

function guardIfStatement(statement: Statement): ESTree.IfStatement | null {
	const unwrapped = unwrapLabeledStatement(statement);

	return unwrapped.type === "IfStatement" &&
		unwrapped.alternate === null &&
		isAbruptStatement(unwrapped.consequent)
		? unwrapped
		: null;
}

function testReferencesDeclaration(
	sourceCode: SourceCode,
	declaration: ESTree.VariableDeclaration,
	test: ESTree.Expression,
): boolean {
	return sourceCode.scopeManager.scopes.some((scope) =>
		scope.references.some((reference) => {
			const identifier = reference.identifier;
			if (identifier.range[0] < test.range[0] || identifier.range[1] > test.range[1]) {
				return false;
			}

			return reference.resolved?.defs.some(
				(definition) =>
					definition.type === "Variable" && definition.node.parent === declaration,
			);
		}),
	);
}

function isDeclarationBackedGuard(
	sourceCode: SourceCode,
	previous: Statement,
	current: Statement,
): boolean {
	const declaration = variableDeclaration(previous);
	const guard = guardIfStatement(current);

	return (
		declaration !== null &&
		guard !== null &&
		testReferencesDeclaration(sourceCode, declaration, guard.test)
	);
}

function requiresBlankLine(previous: Statement, current: Statement): boolean {
	if (isVariableDeclaration(previous) && isVariableDeclaration(current)) return false;

	return (
		isVariableDeclaration(previous) ||
		isControlFlowStatement(previous) ||
		isControlFlowStatement(current)
	);
}

function hasBlankLine(sourceCode: SourceCode, previous: Statement, current: Statement): boolean {
	const lastToken = sourceCode.getLastToken(previous);
	if (!lastToken) return true;

	let previousToken: ESTree.Comment | ESTree.Token = lastToken;

	while (previousToken.range[0] < current.range[0]) {
		const nextToken: ESTree.Comment | ESTree.Token | null = sourceCode.getTokenAfter(previousToken, {
			includeComments: true,
		});
		if (!nextToken) return true;

		if (nextToken.loc.start.line - previousToken.loc.end.line >= 2) return true;

		if (nextToken.range[0] >= current.range[0]) return false;

		previousToken = nextToken;
	}

	return false;
}

function insertBlankLine(
	sourceCode: SourceCode,
	previous: Statement,
	current: Statement,
	fixer: Fixer,
) {
	let previousToken: ESTree.Comment | ESTree.Token | null = sourceCode.getLastToken(previous);
	if (!previousToken) return null;

	const nextToken =
		sourceCode.getFirstTokenBetween(previousToken, current, {
			includeComments: true,
			filter(token) {
				if (previousToken && previousToken.loc.end.line === token.loc.start.line) {
					previousToken = token;

					return false;
				}

				return true;
			},
		}) ?? current;
	const newline = sourceCode.text.includes("\r\n") ? "\r\n" : "\n";
	const text = previousToken.loc.end.line === nextToken.loc.start.line ? `${newline}${newline}` : newline;

	return fixer.insertTextAfter(previousToken, text);
}

function removeBlankLines(
	sourceCode: SourceCode,
	previous: Statement,
	current: Statement,
	fixer: Fixer,
) {
	const fixes = [];
	let previousToken: ESTree.Comment | ESTree.Token | null = sourceCode.getLastToken(previous);
	const newline = sourceCode.text.includes("\r\n") ? "\r\n" : "\n";

	while (previousToken !== null && previousToken.range[0] < current.range[0]) {
		const nextToken: ESTree.Comment | ESTree.Token | null = sourceCode.getTokenAfter(previousToken, {
			includeComments: true,
		});
		if (nextToken === null || nextToken.range[0] > current.range[0]) break;

		if (nextToken.loc.start.line - previousToken.loc.end.line >= 2) {
			const gap = sourceCode.text.slice(previousToken.range[1], nextToken.range[0]);
			const indentation = gap.slice(gap.lastIndexOf("\n") + 1);

			fixes.push(
				fixer.replaceTextRange(
					[previousToken.range[1], nextToken.range[0]],
					`${newline}${indentation}`,
				),
			);
		}

		previousToken = nextToken;
	}

	return fixes;
}

/** Keep declarations, their guards, and control flow in semantic visual paragraphs. */
export const paddingLineBetweenStatementsRule = defineRule({
	meta: {
		type: "layout",
		docs: {
			description:
				"Require semantic statement groups, including declaration-backed guards, to use consistent blank lines.",
		},
		fixable: "whitespace",
		messages: {
			expectedBlankLine: "Expected a blank line between these statements.",
			unexpectedBlankLine:
				"Unexpected blank line between a declaration and its guard clause.",
		},
	},
	createOnce(context) {
		const inspectStatements = (statements: Statement[]) => {
			for (let index = 1; index < statements.length; index++) {
				const previous = statements[index - 1];
				const current = statements[index];
				const declarationBackedGuard = isDeclarationBackedGuard(
					context.sourceCode,
					previous,
					current,
				);
				const blankLine = hasBlankLine(context.sourceCode, previous, current);

				if (declarationBackedGuard) {
					if (!blankLine) continue;

					context.report({
						node: current,
						messageId: "unexpectedBlankLine",
						fix: (fixer) => removeBlankLines(context.sourceCode, previous, current, fixer),
					});

					continue;
				}

				if (!requiresBlankLine(previous, current) || blankLine) {
					continue;
				}

				context.report({
					node: current,
					messageId: "expectedBlankLine",
					fix: (fixer) => insertBlankLine(context.sourceCode, previous, current, fixer),
				});
			}
		};

		return {
			before() {
				return !context.sourceCode.text.startsWith("/** Generated by ");
			},
			BlockStatement: (node) => inspectStatements(node.body),
			Program: (node) => inspectStatements(node.body),
			StaticBlock: (node) => inspectStatements(node.body),
			SwitchCase: (node) => inspectStatements(node.consequent),
			TSModuleBlock: (node) => inspectStatements(node.body),
		};
	},
});
