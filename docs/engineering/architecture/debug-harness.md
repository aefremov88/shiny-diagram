# Debug Harness

> **Implementation state:** Aspirational — nothing is built
>
> **Document state:** Draft — captures the design discussion; to be finalized before the build briefs
>
> **Last reviewed:** 2026-08-11
>
> **Scope:** The debug harness: its driver API for scenario authors, and its runtime and module architecture

The debug harness lets an agent drive its own VS Code with Shiny loaded, from the terminal. Its user manual is `docs/agents/debugging-manifest.md`. This document defines what the harness offers (chapter 1) and how it is built (chapters 2–3).

## 1. Scenario API

A scenario is a TypeScript file that imports the harness drivers and describes one debugging experiment. Run: `npm run debug-harness -- <scenario-file>`. The runner launches a VS Code, executes the scenario, tears everything down, and exits with the scenario's result.

Example shape:

```ts
import { openDiagram, readSource } from "harness/hostDriver";
import { dragClass, elementExists } from "harness/canvasDriver";

await openDiagram("case.mmd");
await dragClass("Order", 400, 200);
console.log(await elementExists("edge", "Customer", "Order"));
console.log(await readSource());
```

### 1.1 Host driver

Functions that act through the extension host:

- `openDiagram(file)` — open a `.mmd` file from the scenario workspace in the Shiny editor.
- `runCommand(id, args?)` — run any VS Code command.
- `readSource()` — the current document text.
- `saveAll()` — save open documents.
- `postBridgeMessage(message)` — post a message into the webview over the bridge, imitating a webview-side event without the canvas.

### 1.2 Canvas driver

Functions that act through the webview page. Two levels:

- Raw: the Playwright page handle for the Shiny webview — DOM queries, element positions, screenshots.
- Shiny actions on top (the app-specific layer): `dragClass(name, x, y)`, `connectEdge(from, to, kind)`, `selectElement(...)`, `editPaneField(pane, field, value)`, `pressToolButton(name)`, `elementExists(kind, ...)`. Exact list to be finalized against the UI catalog.

### 1.3 Conventions

- Scenarios live in the harness's scenarios folder. One bug, one scenario. Deleted after the fix is proven (rule in the debugging manifest).
- The workspace a scenario sees is a throwaway folder created by the runner; the scenario declares which fixture files to place in it.
- Modes: headless (default, for automated runs) and windowed (for a human watching).

## 2. Runtime architecture

Processes during a harness run:

1. **The runner** — a Node.js process started by `npm run debug-harness`. It orchestrates everything below and executes the scenario.
2. **The VS Code under test** — launched by the runner with `--extensionDevelopmentPath` pointing at `out/`: a client (headless or windowed), a server, an extension host with Shiny, and the Shiny webview inside the client.
3. **Two control connections** held by the runner at once:
   - **Host connection** — into the extension host, provided by the launch machinery (`@vscode/test-electron` runs a script inside the host). Serves the host driver.
   - **Canvas connection** — CDP into the webview page, via the client launched with `--remote-debugging-port`; Playwright attaches to it. Serves the canvas driver.
4. **The throwaway workspace** — a temp folder with the scenario's fixture files; also where the session log of the run lands.

Holding both connections in one runner is the harness's defining property: one scenario can inject a real drag (canvas) and then read the saved file (host) — full-chain replication.

Known platform issue to resolve at build time: in the WSL setup, the extension host and the runner live in WSL while the client and its debug port live on Windows — the port must be reached across that boundary (localhost forwarding). Headless mode may allow running the client in WSL instead; verify.

## 3. Module architecture

One package, four modules. Proposed home: `harness/` in the repo root (movable to a separate repo later).

1. **Launcher** — boots the VS Code under test with the right flags, creates the throwaway workspace, resolves the debug port, attaches Playwright, tears down. Wraps `@vscode/test-electron`.
2. **Host driver** — the 1.1 functions, implemented over the in-host script channel.
3. **Canvas driver** — the 1.2 functions, implemented over the Playwright page handle. The Shiny-action layer speaks the app's DOM; it is the only module that must track UI changes.
4. **Scenario runner** — resolves the scenario file, wires the drivers, executes, reports pass/fail.

Build order: launcher first (everything depends on it); host driver and canvas driver are independent of each other; scenario runner last. Each module lands as its own brief and is verifiable alone.

## 4. Open questions for finalization

1. Prior-art check (one hour, before building): does `vscode-extension-tester`'s webview support cover our page, replacing part of the Playwright glue?
2. Exact Shiny-action list for the canvas driver, derived from the UI catalog.
3. WSL/Windows port handling, or WSL-side headless client.
4. Interactive mode (a long-lived instance accepting commands one by one) — deferred; file mode first.
5. An MCP interface over the drivers — deferred to the tester project; the drivers are designed to be wrappable.
6. Where the harness's own session log goes and whether the editor's logger needs a harness mode.
