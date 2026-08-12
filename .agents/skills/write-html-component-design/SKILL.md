---
name: write-html-component-design
description: Write HTML design records. Use when the user explicitly requests one.
---

# HTML component design records

Read `internal/design/README.md`, nearby records, and relevant HTML code, tests, exports, and package metadata.

1. Require an explicit request. Use its path or the smallest UI record location, with HTML scope clear.
2. State the element boundary and only the rationale or constraint that code and tests cannot explain.
3. Cover ownership, anatomy, markup versus CSS, APIs, opt-outs, registration, or bundle cost only when they explain the choice.
4. Link source instead of copying inventories or mechanics. Include alternatives or consequences only when material.

Keep it to a few paragraphs. Do not add a React contract or companion record without a separate request.

## Example

Input: “Write an HTML component design record for chapter selection.”

Output: A compact custom-element decision, its non-inferable rationale, and useful source links.
