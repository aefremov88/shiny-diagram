# Development Process

> **Implementation state:** Current
> 
> **Document state:** Maintained
> 
> **Last reviewed:** 2026-08-10
> 
> **Scope:** The three development loops, and the checks

## 1. Workflows

Three nested loops. The commit loop runs inside the pull request loop; the pull request loop runs inside the release loop.

### 1.1 Commit loop

- **Unit of work:** one commit - few hours of work
- **Steps:**
    1. Execute a work
    2. In case of significant changes (specified by the brief) by the agent, agent runs holistic check suite with `npm run check`
    3. Commit and push. Always done by the user. Message format: one line, starts with `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `style`
- **Automation:** triggered by `git commit`, defined in `.githooks/pre-commit`
	- `npm run format:check` on staged files

### 1.2 Pull request loop

- **Unit of work:** sprint deliverable - few days of **planned work** in development phase or one-few **issues** in maintenance phase
- **Steps:**
    1. Branch from up-to-date `main`.
        - `git checkout main`
        - `git pull`
        - `git checkout -b feat/<topic>` (or `fix/`, `refactor/`, `docs/`)
    2. Run commit loops until the work item is done
    3. Open a PR to `main`. 
	    - If the PR resolves an issue, reference it in the description and provide title `fixes #N`; the issue closes on merge.
        - If PR closes a chunk of a planned work, provide title `feat: <description>` (`fix:` / `refactor:` / `docs:` / `chore:`)
    4. Review the diff
    5. Squash-merge, then delete the branch. The squash message mirrors PR title
- **Automation:** triggered by opening or updating a PR, defined in `.github/workflows/ci.yml` 
	- `npm run check`
	- `npm run build` — compiles the extension host and bundles the webview into `out/`; serves here as a compile check

### 1.3 Release loop

- **Unit of work:** one version.
- **Steps:**
    1. Run pull request loops until the version's scope is delivered
    2. Run one pull request loop (`chore: release vX.Y.Z`) for the release commit: 
	    - bump `version` in `package.json`: fixes bump patch, features bump minor
	    - add a dated entry to `CHANGELOG.md` above the previous one
    3. Tag the release commit on up-to-date `main`
        - `git checkout main`
		- `git pull`
		- `git tag vX.Y.Z`
		- `git push origin vX.Y.Z`
    4. Install the packaged `.vsix` locally and smoke-test the main journeys (the F5 debug host runs from source, so packaging mistakes appear only here; package contents are controlled by `.vscodeignore` and differ from source) 
        - `npx @vscode/vsce package`
    5. Draft a GitHub Release from the tag: 
	    - title `vX.Y.Z`
	    - notes mirror the changelog entry
	    - attach the `.vsix`
- **Automation:** triggered by pushing a `v*` tag, defined in `.github/workflows/release.yml`.
    - `npm run build`
    - `npx @vscode/vsce package`
    - `npx @vscode/vsce publish --pre-release`

## 2. Checks

Checks verify the code and change nothing. Some have a paired rewrite command that fixes what the check found; rewrite commands run only when a check fails, so they have no schedule of their own.

### 2.1 Formatting

- **Does:** enforces one mechanical code style, so diffs contain only real changes. Covers code files only; markdown is excluded — documentation follows its own conventions and is not machine-checked.
- **Scope:** per file.
- **Check:** `npm run format:check`.
- **Rewrite:** `npm run format`.
- **Files:** `.prettierrc`, `.prettierignore`.
- **Runs:**
  - on every commit, staged files only (hook)
  - gate of agent iteration (as part of `npm run check`)
  - on every PR (as part of `npm run check`)

### 2.2 Linting

- **Does:** enforces code-quality rules on `extension-host/` and `webview/src/`.
- **Scope:** per file.
- **Check:** `npm run lint`.
- **Files:** `eslint.config.mjs`.
- **Runs:**
  - gate of agent iteration (as part of `npm run check`)
  - on every PR (as part of `npm run check`)

### 2.3 Type checking

- **Does:** verifies type correctness of both parts of the code — extension host and webview — including regression test files.
- **Scope:** whole repo — a change in one file can break types in another.
- **Check:** `npm run typecheck`.
- **Files:** `tsconfig.json`, `tsconfig.webview.json`.
- **Runs:**
  - gate of agent iteration (as part of `npm run check`)
  - on every PR (as part of `npm run check`)

### 2.4 Boundary constraints

- **Does:** verifies the Webview module boundaries defined in `docs/engineering/architecture/architectural-standards.md` — which layers may import which, and the protocol-file contract between webview and extension host.
- **Scope:** whole repo — the import graph is global.
- **Check:** `npm run check:boundaries`.
- **Files:** `scripts/check-webview-boundaries.mjs`.
- **Runs:**
  - gate of agent iteration (as part of `npm run check`)
  - on every PR (as part of `npm run check`)

### 2.5 Planes

- **Does:** verifies the generated management planes stay in sync with the code, and that their annotation contracts hold. The planes:
  - **UI catalog** (`webview/src/Ui/UI-CATALOG.md`) — collects the component inventory: primitives, composites, and templates, with their annotations. Sources: `webview/src/Ui/{chrome,canvas}/` component folders.
  - **Write-back catalog** (`webview/src/Controller/translate/WRITEBACK-CATALOG.md`) — collects the editor commands and their write options. Sources: `webview/src/Controller/translate/` and `webview/src/View/commands/editorCommands.ts`.
- **Scope:** whole repo — planes are assembled from all contributing sources at once. A stale plane found late is fixed lazily by regenerating.
- **Check:** `npm run check:planes`.
- **Rewrite:** `npm run planes`.
- **Files:** `scripts/check-planes.mjs`, `scripts/update-planes.mjs`, `scripts/planes/`.
- **Runs:**
  - gate of agent iteration (as part of `npm run check`)
  - on every PR (as part of `npm run check`)

### 2.6 Regression tests

- **Does:** runs the regression test suites. The suites, their structure, and their coverage rules are defined in `docs/engineering/testing-framework.md`.
- **Scope:** whole repo.
- **Check:** `npm run test`.
- **Files:** see the testing framework doc.
- **Runs:**
  - gate of agent iteration (as part of `npm run check`)
  - on every PR (as part of `npm run check`)

### 2.7 Holistic check suite

- **Does:** runs every check in this chapter, in one command. The single gate for agent iterations and for the PR.
- **Scope:** whole repo.
- **Check:** `npm run check`.
- **Files:** the `check` script in `package.json`.
- **Runs:**
  - gate of agent iteration
  - on every PR
