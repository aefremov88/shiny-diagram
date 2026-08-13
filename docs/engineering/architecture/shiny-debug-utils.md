# shiny-debug-utils

> **Implementation state:** Aspirational
>
> **Document state:** Work-in-Progress
>
> **Last reviewed:** 2026-08-12
>
> **Scope:** The Shiny companion library for debugging: what it contains, its dependencies, the debug hooks it requires inside Shiny. The API lives in `docs/engineering/debugging-manual.md`; this document contains no API chapter.

`shiny-debug-utils` is the Shiny vocabulary for debugging: target queries that name Shiny's UI elements. Nothing else. It is a companion to `vscode-debug-harness`, used alongside it, not a layer over it: a scenario imports from both libraries directly.

## 1. Position and dependencies

- Depends on `vscode-debug-harness` for one thing: the target contract. A target query returns an object of the harness's target type; harness gestures accept it without knowing what produced it.
- Depends on Shiny's DOM: every target query encodes how a Shiny UI element is found on the page. This library is the only debugging code that must track Shiny's UI changes.
- The harness knows nothing of this library. The dependency is one-directional and thin.

## 2. Source of truth: the target plane

- The UI catalog owns what targets exist and how they are addressed: each catalog entry declares whether the component is a target and under what address (`Target: yes / Address: classBox(name)`).
- The **target plane** — `webview/src/View/GESTURE-TARGETS.md` — is a flat Component → Address extract of these declarations, referencing the catalog entries, never describing the UI again.
- This library implements the target queries of the plane against the DOM, one-to-one: every plane entry has a query; no query exists without a plane entry.
- The plane is flat. Combining targets correctly — which control sits in which pane, what must be open first — is the scenario author's job. A target query resolves its address as given: no reachability or nesting checks. If the address matches nothing or the control is hidden, the gesture fails at run time.
- A tree view of reachable targets may be assembled later; it would be a view over the plane, not a second source.

## 3. Module architecture

One small library: a single module of target queries. Each query finds its element by the address the plane assigns and returns a harness target.

Shiny itself carries no debug code: no hooks, no environment variable, no debug commands. Readiness is covered by the harness's target waiting; the session log is written into the run's workspace as in any session.

Rules inherited from the harness: no module state (live handles come from the harness's global context object); part of this repo's `npm run typecheck` and lint scope; no tests of its own.

Home: `debug/shiny-debug-utils/`, with scenarios in `debug/scenarios/` (gitignored) and reusable source files in `debug/fixtures/`. Documentation stays centralized in `docs/`.

## 4. Deferred

- **Tree view of reachable gesture targets** — a possible later view over the flat plane, showing nesting and reachability. Not needed for this library.
