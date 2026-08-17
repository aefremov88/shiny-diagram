# Debugging Manual

> **Implementation state:** Aspirational — neither library is built yet
>
> **Document state:** Stale
>
> **Last reviewed:** 2026-08-12
>
> **Scope:** The holistic picture of debugging Shiny live: the two libraries, setup, running scenarios, the Shiny-side API

## 1. The two libraries

- **`vscode-debug-harness`** — separate repo (`anton-efremov/vscode-debug-harness`). Launches a real VS Code with Shiny loaded and runs your scenario inside it. Provides the generic API: gestures, targets, commands, document access, screenshots. Knows nothing about Shiny. Its README owns the install detail and the full API; its architecture doc lives in that repo.
- **`shiny-debug-utils`** — this repo, `debug/shiny-debug-utils/`. Target queries that name Shiny's UI elements (`classBox("Order")`) and return targets for the harness gestures. Nothing else. Architecture: `docs/engineering/architecture/shiny-debug-utils.md`.

A **scenario** is a TypeScript file that describes one debugging run. It imports from both libraries and calls the functions with top-level `await`:

```ts
import { openWith, drag, at, exists, readSource } from "vscode-debug-harness";
import { classBox, edgeLine } from "shiny-debug-utils";

await openWith("../fixtures/case.mmd", "shiny.diagram");
await drag(classBox("Order"), at(400, 200));
console.log(await exists(edgeLine("Customer", "Order")));
console.log(await readSource());
```

## 2. Setup

- `vscode-debug-harness` is a devDependency of this repo; `npm install` is the whole setup.
- `shiny-debug-utils` is repo code; nothing to install.
- A display server must exist — desktop VS Code has no headless mode. In WSL, WSLg provides it. On a machine with no display, wrap the run in `xvfb-run`.

## 3. Running a scenario

- `npm run debug-harness -- <scenario-file>` — the script calls the harness's binary. Scenario home: `debug/scenarios/` (gitignored); reusable source files: `debug/fixtures/`.
- `--attended` — leave the VS Code open after the scenario finishes. Default: run to completion, tear down.
A run produces output on two channels.

To the terminal:

- The scenario's `console` output, streamed during the run.
- The path of the run's workspace.
- Exit code: zero when the scenario ran to completion; non-zero when it threw or the run failed to start.

To the file system — the run's workspace folder, kept after the run:

1. The `.mmd` diagram files — as the scenario left them. You read these to check what was actually written to disk.
2. `.shiny/session.log` — Shiny's own log of the session, written by the extension as in any normal workspace.
3. Screenshot files — created only if the scenario called `screenshot(name)`.

## 4. API of `vscode-debug-harness`

Owned by the harness README — the single source: targets and the waiting rule, gestures (`click`, `doubleClick`, `drag`, `type`, `press`), `openWith`, `runCommand`, `readSource`, `exists`, `screenshot`, `webview()`.

Shiny-specific notes on two of them:

- `openWith(sourceFile, "shiny.diagram")` — Shiny's view type; this is how a diagram opens in the Shiny editor.
- `runCommand` — Shiny's own commands work too, e.g. `shiny.exportPng`, and `shiny.mark` (writes a note into the session log — useful to mark phases of a run).

## 5. API of `shiny-debug-utils`

Target queries: functions that name a Shiny UI element and return a target for the harness gestures. The set is defined by the target plane (`webview/src/View/GESTURE-TARGETS.md`); until the plane exists, the list below is the contract.

- `classBox(name)` — a class box surface. A second argument names a region for gestures that depend on where inside the box the pointer lands: `classBox("Order", "header")`.
- `resizeHandle(name, edge)` — a class's resize handle: `"left"`, `"right"`, `"top"`, `"bottom"`, or a corner.
- `edgeLine(from, to)` — an edge between two classes.
- `noteBox(id)` — a note surface.
- `namespaceBox(name)` — a namespace surface.
- `option(name)` — an option in the currently open selection control.

Composition — chrome actions are harness gestures on targets, no special functions:

```ts
await click(deleteButton());                 // press a button
await click(nameField()); await type("Order"); await press("Enter");   // set a text field
await click(strokeDropdown()); await click(option("dashed"));          // pick from a dropdown
```

The pane target queries (`deleteButton()`, `nameField()`, `strokeDropdown()` above) are placeholders: their real names come from the target plane.
