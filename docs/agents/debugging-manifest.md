# Debugging Manual

> **Kind:** Defining  
> **Document state:** Maintained  
> **Implementation state:** Aspirational  
> **Last reviewed:** 2026-08-18  
> **Scope:** Instructions for an agent running a debug session: evidence, instruments, process, and rules  

## 0. Before you start

Read `docs/agents/general-manifest.md` first — your onboarding, decision levels, and standing rules are there. Additionally, for debugging: `docs/engineering/architecture/debug-harness.md` — the debug harness drivers and scenario API.

You are the debugging agent. The user found a bug. Your job: replicate it, fix it, and prove the fix — following this manual.

## 1. Your evidence

- **The session log** — `.shiny/session.log` in the workspace. The editor wrote it during the user's session. It contains, in time order: the initial source of the opened file, user actions, dispatched commands, applied source edits (as summaries with line positions), failures, and marks. A mark is a `[USER]` line: the user's free-text note written at the moment the bug was observed.
- **The brief** — your task. It may add description beyond the mark.
- **A GitHub issue** — when the bug was filed instead of marked (for example, found in a released version). The issue then carries the description and any attached files; a session log may be absent.

When the evidence is a log: the user's session is over, and the log is its only record.

## 2. Your instruments

Choose the cheapest instrument that can show the bug:

1. **Direct function calls.** Most of Shiny is plain functions: the pipeline (parse, translate, resolve, layout) and the view logic (transaction builders, hook logic). Import them in a script or test and call them with any source text, command, or action values. Components that must render run under vitest with jsdom. No editor involved.
2. **The debug harness.** Launches your own VS Code with Shiny loaded, driven by a scenario file you write. Use it when the bug needs the real editor: document saving, the bridge, rendering, interactions. Its capabilities: open a `.mmd` file in the Shiny editor, run VS Code commands, read and save the document, read the webview DOM, perform real clicks and drags and typing, take screenshots. A scenario is a TypeScript file importing the harness drivers, run as `npm run debug-harness -- <scenario-file>`; the driver API is in the debug harness doc.

## 3. The process

1. **Read the evidence.** Find the mark. Read upward from it. Form a hypothesis: which hand-off produced the first wrong result.
2. **Replicate.** Make the bug happen under your control with the cheapest sufficient instrument. Do not change code before the bug reproduces. If you cannot replicate it, stop and report why; continue only if the user explicitly agrees.
3. **Fix.** The decision levels of the general manifest apply to the fix's depth: changes within modules and layers (levels 1–2) are yours; a fix that touches a contract or the fixed structure (levels 3–4) stops here — draft the proposal and get approval before implementing.
4. **Prove.** Re-run your replication — the wrong result is gone. Run `npm run check` — it passes in full.
5. **Close.** If the bug came from a GitHub issue, state the issue number in your report — the user references it in the PR. Then check the bug against the testing framework:
   - If an existing case-source entry covers this bug, its mirrored test failed to catch it. Strengthen that test.
   - If no entry covers it and you believe one should, flag the case-source gap. Extending a case source is a contract decision, not yours.
   - Otherwise, no test is written. Bugs do not create tests; case sources do.

## 4. Rules

- Your editor instance opens a throwaway workspace folder. Never open the user's files in it.
- One bug, one scenario file. Delete the scenario after the fix is proven. Scenarios are not a test suite.
- Treat the session log as read-only.
- Do not leave debug logging, flags, or instrumentation in source code as part of a fix. If an instrument is missing, report it.
- A bug is not a license for a deep fix. However clear the bug, a fix at levels 3–4 of the general manifest waits for approval like any other change at that depth.
