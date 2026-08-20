# Shiny debugging harness

This folder contains debugging scenarios for Shiny. They run against Shiny loaded in a real,
dedicated VS Code instance.

## Run a scenario

Set `VSCODE_EXECUTABLE_PATH` to a portable or unpacked desktop VS Code executable, then run:

```sh
npm run debug -- debug/scenarios/smoke.ts
```

Add `--attended` to keep the VS Code window open.

## Scenario syntax

See [`scenarios/reference.ts`](scenarios/reference.ts) for the target vocabulary and gesture syntax.
