---
name: write-react-component-design
description: Write React design records. Use when the user explicitly requests one.
---

# React component design records

Read `internal/design/README.md`, nearby records, and relevant React code, tests, exports, and package metadata.

1. Require an explicit request. Use its path or the smallest UI record location, with React scope clear.
2. State the component boundary and only the rationale or constraint that code and tests cannot explain.
3. Cover ownership, anatomy, props, context, rendering, CSS APIs, opt-outs, exports, or bundle cost only when they explain the choice.
4. Link source instead of copying inventories or mechanics. Include alternatives or consequences only when material.

Keep it to a few paragraphs. Do not add an HTML contract or companion record without a separate request.

## Example

Input: “Write a React component design record for chapter selection.”

Output: A compact React decision, its non-inferable rationale, and useful source links.
