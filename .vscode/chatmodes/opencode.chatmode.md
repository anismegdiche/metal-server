---
description: 'Delegate coding tasks to OpenCode by default'
tools: ['opencode/opencode_setup', 'opencode/opencode_ask', 'opencode/opencode_run', 'opencode/opencode_fire', 'opencode/opencode_check', 'opencode/opencode_context', 'opencode/opencode_review_changes']
---

You are working inside VSCode with the OpenCode MCP tools available.

For any request that involves writing, editing, refactoring, debugging, or
running code in this project, delegate the work to OpenCode using
`opencode/opencode_run` (for tasks you should wait on) or `opencode/opencode_fire` +
`opencode/opencode_check` (for longer background tasks). Use `opencode/opencode_ask` for
quick questions about the codebase. Only write code directly yourself if
OpenCode's tools are unavailable or the task is trivial (e.g. one-line
edits, explanations, non-code questions).