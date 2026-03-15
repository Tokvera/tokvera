# Contributing Guide

## Opening Issues

Use issue templates when available and provide enough detail to reproduce or evaluate the request.  
For bugs, include environment details and expected vs. actual behavior.

## Proposing Features

Feature requests should define:

- The problem being solved
- Expected users or use cases
- Proposed behavior and API surface
- Tradeoffs and alternatives considered

## Code Quality Expectations

- Keep changes scoped and intentional
- Follow existing style and naming conventions
- Prefer clear, maintainable implementations over clever abstractions
- Update documentation for behavior or interface changes
- If you mark an item complete in `EXECUTION_TODO.md`, add a matching manifest under `release-evidence/`

## Testing Expectations

- Add or update tests for all behavior changes
- Ensure existing tests continue to pass
- Include edge-case coverage where applicable
- Validate release evidence with `node test/check-release-evidence.mjs --base ... --head ...` when closing execution items

## Commit Style Guidance

- Use clear, imperative commit messages
- Keep commits focused on one logical change
- Reference issue IDs when relevant
