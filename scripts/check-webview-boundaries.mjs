/**
 * @fileoverview Enforces project-owned Webview module boundaries from
 * docs/engineering/architecture/architectural-standards.md.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const repoRoot = path.resolve(process.cwd());
const sourceRoot = path.join(repoRoot, "webview", "src");
const sourcePrefix = "webview/src";
const WEBVIEW_PROTOCOL_FILE = "Bridge/protocol.ts";
const HOST_PROTOCOL_FILE = "extension-host/protocol.ts";
const UI_ROOT = "Ui";

const PROTOCOL_FILES = [
  {
    absolutePath: path.join(sourceRoot, WEBVIEW_PROTOCOL_FILE),
    file: WEBVIEW_PROTOCOL_FILE,
    displayFile: `${sourcePrefix}/${WEBVIEW_PROTOCOL_FILE}`,
  },
  {
    absolutePath: path.join(repoRoot, HOST_PROTOCOL_FILE),
    file: HOST_PROTOCOL_FILE,
    displayFile: HOST_PROTOCOL_FILE,
  },
];

const CONTROLLER_COMPONENTS = ["parse", "deriveViews", "translate", "resolve"];
const CONTROLLER_COMPONENT_SET = new Set(CONTROLLER_COMPONENTS);

const REQUIRED_FACADES = new Set([
  "Shell/index.ts",
  "Controller/parse/index.ts",
  "Controller/deriveViews/index.ts",
  "Controller/translate/index.ts",
  "Controller/resolve/index.ts",
  "View/EditorRoot/index.ts",
  "View/commands/index.ts",
  "View/views/index.ts",
]);

const SHINY_VIEW_FACADES = new Set([
  "View/EditorRoot/index.ts",
  "View/commands/index.ts",
  "View/views/index.ts",
]);

const PROHIBITED_BARRELS = [
  "Shell/WebViewShell/index.ts",
  "View/index.ts",
  "Controller/model/index.ts",
  "shared/index.ts",
];

const violations = [];

main();

function main() {
  if (!existsSync(sourceRoot) || !statSync(sourceRoot).isDirectory()) {
    failConfiguration(`Webview source directory not found: ${sourceRoot}`);
  }

  const compilerOptions = readWebviewCompilerOptions();
  const moduleResolutionCache = ts.createModuleResolutionCache(
    repoRoot,
    (fileName) => (ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase()),
    compilerOptions
  );

  checkRequiredAndProhibitedFiles();

  const protocolSources = new Map();
  const compositeImportGraph = new Map();

  for (const absoluteFile of listSourceFiles(sourceRoot)) {
    const file = toSourceRelative(absoluteFile);

    const sourceText = readFileSync(absoluteFile, "utf8");
    const sourceFile = ts.createSourceFile(
      absoluteFile,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      absoluteFile.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    if (file === "Controller/ShinyController.tsx") {
      checkShinyControllerStateHooks(file, sourceFile);
    }

    if (file === WEBVIEW_PROTOCOL_FILE) {
      protocolSources.set(file, sourceFile);
      checkProtocolDependencies(file, sourceFile);
    }

    if (REQUIRED_FACADES.has(file)) {
      checkFacade(file, sourceFile, compilerOptions, moduleResolutionCache);
    }

    for (const dependency of collectDependencies(sourceFile)) {
      const projectTarget = resolveProjectDependency(
        absoluteFile,
        dependency.specifier,
        compilerOptions,
        moduleResolutionCache
      );
      const target = projectTarget ?? resolveProjectCSSDependency(file, dependency.specifier);

      checkIconCatalogImport(file, dependency, target);
      checkUILibraryImport(file, dependency, target, compositeImportGraph);
      if (projectTarget) {
        checkDependency(file, dependency, projectTarget);
      }
    }
  }

  checkCompositeImportCycles(compositeImportGraph);
  checkStylesheetOwnership();
  checkCSSModuleClassIntegrity();
  checkCSSBrandbookImports();
  checkTokenConsumption();
  checkBrandTokenUsage();
  checkCSSModuleShinyTokenDefinitions();
  checkCSSModuleLiteralColors();

  for (const protocolFile of PROTOCOL_FILES) {
    if (!existsSync(protocolFile.absolutePath)) {
      reportFileWithDisplay(
        protocolFile.file,
        protocolFile.displayFile,
        "protocol file is missing"
      );
      continue;
    }

    if (protocolSources.has(protocolFile.file)) continue;

    const sourceText = readFileSync(protocolFile.absolutePath, "utf8");
    const sourceFile = ts.createSourceFile(
      protocolFile.absolutePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
    protocolSources.set(protocolFile.file, sourceFile);
    checkProtocolDependencies(protocolFile.file, sourceFile, protocolFile.displayFile);
  }

  checkProtocolSynchronization(protocolSources);

  violations.sort(compareViolations);

  if (violations.length > 0) {
    console.error(`Webview boundary check failed with ${violations.length} violation(s):`);
    for (const violation of violations) {
      console.error(
        `${displayFile(violation)}:${violation.line}:${violation.column} ` +
          `[${violation.kind}] ${JSON.stringify(violation.specifier)}\n` +
          `  rule: ${violation.rule}`
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log("Webview boundary check passed.");
}

function checkIconCatalogImport(file, dependency, target) {
  if (path.basename(file) !== "icons.ts") return;
  if (target && isUnder(target, "shared")) return;

  reportDependency(
    file,
    dependency,
    "Domain glyph catalogs: icons.ts files may import only descriptor contracts from shared"
  );
}

function readWebviewCompilerOptions() {
  const configPath = firstExistingPath([
    path.join(repoRoot, "webview", "tsconfig.json"),
    path.join(repoRoot, "tsconfig.webview.json"),
  ]);

  if (!configPath) {
    return {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2022,
    };
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    failConfiguration(formatDiagnostics([configFile.error]));
  }

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
    undefined,
    configPath
  );

  if (parsed.errors.length > 0) {
    failConfiguration(formatDiagnostics(parsed.errors));
  }

  return parsed.options;
}

function firstExistingPath(candidates) {
  return candidates.find((candidate) => existsSync(candidate));
}

function formatDiagnostics(diagnostics) {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => repoRoot,
    getNewLine: () => "\n",
  });
}

function failConfiguration(message) {
  console.error(`Webview boundary checker configuration error:\n${message}`);
  process.exit(2);
}

function checkRequiredAndProhibitedFiles() {
  for (const facade of [...REQUIRED_FACADES].sort()) {
    if (!existsSync(path.join(sourceRoot, facade))) {
      reportFile(facade, "required facade file is missing");
    }
  }

  for (const barrel of PROHIBITED_BARRELS) {
    if (existsSync(path.join(sourceRoot, barrel))) {
      reportFile(barrel, "root barrel is prohibited");
    }
  }

  const uiRoot = path.join(sourceRoot, UI_ROOT);
  if (existsSync(uiRoot)) {
    for (const absoluteFile of listFiles(uiRoot)) {
      if (!/^index\.(?:ts|tsx)$/.test(path.basename(absoluteFile))) continue;
      reportFile(
        toSourceRelative(absoluteFile),
        "UI library outbound surface: barrel files are prohibited everywhere under ui"
      );
    }
  }
}

function listSourceFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory).sort()) {
    const absolutePath = path.join(directory, entry);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      files.push(...listSourceFiles(absolutePath));
    } else if (/\.(?:ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) {
      files.push(absolutePath);
    }
  }

  return files;
}

function listFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory).sort()) {
    const absolutePath = path.join(directory, entry);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      files.push(...listFiles(absolutePath));
    } else {
      files.push(absolutePath);
    }
  }

  return files;
}

function collectDependencies(sourceFile) {
  const dependencies = [];

  function add(node, specifier, isTypeOnly, kind) {
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    dependencies.push({
      specifier,
      isTypeOnly,
      kind,
      line: position.line + 1,
      column: position.character + 1,
    });
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
      add(
        node.moduleSpecifier,
        node.moduleSpecifier.text,
        isTypeOnlyImportDeclaration(node),
        node.importClause ? "import" : "side-effect import"
      );
      return;
    }

    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      add(
        node.moduleSpecifier,
        node.moduleSpecifier.text,
        isTypeOnlyExportDeclaration(node),
        "re-export"
      );
      return;
    }

    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      const expression = node.moduleReference.expression;
      if (expression && ts.isStringLiteralLike(expression)) {
        add(expression, expression.text, node.isTypeOnly === true, "import equals");
      }
      return;
    }

    if (ts.isImportTypeNode(node)) {
      const argument = node.argument;
      if (ts.isLiteralTypeNode(argument) && ts.isStringLiteralLike(argument.literal)) {
        add(argument.literal, argument.literal.text, true, "import type expression");
      }
      return;
    }

    if (
      ts.isCallExpression(node) &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      const specifier = node.arguments[0].text;
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        add(node.arguments[0], specifier, false, "dynamic import");
        return;
      }
      if (ts.isIdentifier(node.expression) && node.expression.text === "require") {
        add(node.arguments[0], specifier, false, "require");
        return;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return dependencies;
}

function isTypeOnlyImportDeclaration(node) {
  const clause = node.importClause;
  if (!clause) return false;
  if (clause.isTypeOnly) return true;
  if (clause.name) return false;

  const bindings = clause.namedBindings;
  return (
    bindings !== undefined &&
    ts.isNamedImports(bindings) &&
    bindings.elements.length > 0 &&
    bindings.elements.every((element) => element.isTypeOnly)
  );
}

function isTypeOnlyExportDeclaration(node) {
  if (node.isTypeOnly) return true;
  const clause = node.exportClause;
  return (
    clause !== undefined &&
    ts.isNamedExports(clause) &&
    clause.elements.length > 0 &&
    clause.elements.every((element) => element.isTypeOnly)
  );
}

function resolveProjectDependency(importerFile, specifier, compilerOptions, cache) {
  const resolved = ts.resolveModuleName(
    specifier,
    importerFile,
    compilerOptions,
    ts.sys,
    cache
  ).resolvedModule;

  if (!resolved) return null;

  const resolvedFile = path.resolve(resolved.resolvedFileName);
  const relative = path.relative(sourceRoot, resolvedFile);

  if (relative === "" || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return null;
  }

  const target = toPosix(relative);
  if (!/\.(?:ts|tsx)$/.test(target) || target.endsWith(".d.ts")) return null;

  return target;
}

function resolveProjectCSSDependency(importerFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  if (!specifier.endsWith(".css")) return null;
  const importerDirectory = path.dirname(path.join(sourceRoot, importerFile));
  const resolvedFile = path.resolve(importerDirectory, specifier);
  const relative = path.relative(sourceRoot, resolvedFile);
  if (relative === "" || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return null;
  }
  if (!existsSync(resolvedFile)) return null;
  return toPosix(relative);
}

function uiComponent(file) {
  const match = /^Ui\/(chrome|canvas)\/(primitives|composites|templates)\/([^/]+)\//.exec(file);
  if (!match) return null;
  return {
    wing: match[1],
    tier: match[2],
    name: match[3],
    root: `Ui/${match[1]}/${match[2]}/${match[3]}`,
  };
}

function uiLocation(file) {
  if (file === "Ui/core" || isUnder(file, "Ui/core")) {
    return { wing: "core", tier: "core" };
  }

  const match = /^Ui\/(chrome|canvas)\/(primitives|composites|templates)(?:\/|$)/.exec(file);
  return match ? { wing: match[1], tier: match[2] } : null;
}

function uiBrandbookWing(file) {
  const match = /^Ui\/(chrome|canvas)\/tokens\.(?:css|ts)$/.exec(file);
  return match?.[1] ?? null;
}

function toLineColumn(source, index) {
  const prefix = source.slice(0, index);
  const lines = prefix.split("\n");
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function checkDependency(file, dependency, target) {
  const sourceComponent = controllerComponent(file);
  const targetComponent = controllerComponent(target);

  if (targetComponent && sourceComponent !== targetComponent) {
    const facade = controllerFacade(targetComponent);
    if (target !== facade) {
      reportDependency(
        file,
        dependency,
        `imports from outside Controller/${targetComponent} must target ${facade}`
      );
    }
  }

  if (
    sourceComponent &&
    file.includes("/workers/") &&
    target === controllerFacade(sourceComponent)
  ) {
    reportDependency(
      file,
      dependency,
      `Controller/${sourceComponent} workers must not import through their own public facade`
    );
  }

  if (isUnder(file, "View") && !SHINY_VIEW_FACADES.has(file) && SHINY_VIEW_FACADES.has(target)) {
    reportDependency(
      file,
      dependency,
      "Shiny View implementation modules must use direct local imports, not Shiny View public facades"
    );
  }

  const matrixRule = permittedDependencyRule(file, dependency, target);
  if (matrixRule !== true) {
    reportDependency(file, dependency, matrixRule);
  }
}

function permittedDependencyRule(file, dependency, target) {
  if (file === "main.tsx") {
    return target === "Bridge/ExtensionBridge.tsx"
      ? true
      : "main.tsx may depend only on the Extension Bridge runtime entry";
  }

  if (isUnder(file, "Bridge")) {
    if (isUnder(target, "Bridge") || isUnder(target, "shared")) {
      return true;
    }
    if (target === "Shell/index.ts") return true;
    if (target === "Controller/model/sourceEdit.ts" && dependency.isTypeOnly) {
      return true;
    }
    if (target === "Controller/model/sourceEdit.ts") {
      return "Extension Bridge may consume Controller/model/sourceEdit only through a type-only dependency";
    }
    return "Extension Bridge may depend only on its own modules, Shell, type-only Controller/model/sourceEdit, or shared";
  }

  if (isUnder(file, "Shell")) {
    if (isUnder(target, "Shell") || isUnder(target, "shared")) {
      return true;
    }
    if (isUnder(target, "Ui/chrome")) return true;
    if (isUnder(target, "mermaidRenderer")) return true;
    if (target === "Controller/ShinyController.tsx") return true;
    if (target === "Controller/model/sourceEdit.ts" && dependency.isTypeOnly) {
      return true;
    }
    if (target === "Controller/model/sourceEdit.ts") {
      return "Shell may consume Controller/model/sourceEdit only through a type-only dependency";
    }
    return "Shell may depend only on its own modules, mermaidRenderer, Controller/ShinyController, type-only Controller/model/sourceEdit, ui/chrome, or shared";
  }

  if (isUnder(file, "mermaidRenderer")) {
    return isUnder(target, "mermaidRenderer") || isUnder(target, "shared")
      ? true
      : "Mermaid renderer may depend only on its own modules or shared";
  }

  if (file === "Controller/ShinyController.tsx") {
    if (isControllerComponentFacade(target)) return true;
    if (isUnder(target, "Controller/model") || isUnder(target, "shared")) {
      return true;
    }
    if (SHINY_VIEW_FACADES.has(target)) return true;
    return "Controller/ShinyController may depend only on Controller component facades, Controller/model, View/EditorView, View/commands, View/views, or shared";
  }

  const sourceComponent = controllerComponent(file);
  if (sourceComponent === "parse") {
    if (
      isUnder(target, "Controller/parse") ||
      isUnder(target, "Controller/model") ||
      isUnder(target, "shared")
    ) {
      return true;
    }
    return "Controller/parse may depend only on its own component, Controller/model, or shared";
  }

  if (sourceComponent === "deriveViews") {
    if (
      isUnder(target, "Controller/deriveViews") ||
      isUnder(target, "Controller/model") ||
      target === "View/views/index.ts" ||
      isUnder(target, "shared")
    ) {
      return true;
    }
    return "Controller/deriveViews may depend only on its own component, Controller/model, View/views, or shared";
  }

  if (sourceComponent === "translate") {
    if (
      isUnder(target, "Controller/translate") ||
      isUnder(target, "Controller/model") ||
      target === "View/commands/index.ts" ||
      isUnder(target, "shared")
    ) {
      return true;
    }
    return "Controller/translate may depend only on its own component, Controller/model, View/commands, or shared";
  }

  if (sourceComponent === "resolve") {
    if (
      isUnder(target, "Controller/resolve") ||
      isUnder(target, "Controller/model") ||
      target === "Controller/translate/index.ts" ||
      isUnder(target, "shared")
    ) {
      return true;
    }
    return "Controller/resolve may depend only on its own component, Controller/model, Controller/translate, or shared";
  }

  if (isUnder(file, "Controller/model")) {
    return isUnder(target, "Controller/model") || isUnder(target, "shared")
      ? true
      : "Controller/model may depend only on Controller/model or shared";
  }

  if (isUnder(file, "View")) {
    return isUnder(target, "View") ||
      isUnder(target, "shared") ||
      isUnder(target, "Ui/chrome") ||
      isUnder(target, "Ui/canvas")
      ? true
      : "Shiny View modules may depend only on Shiny View modules, ui/chrome, ui/canvas, or shared";
  }

  if (isUnder(file, UI_ROOT)) {
    if (isUnder(target, UI_ROOT)) return true;
    if (isUnder(target, "shared")) return true;
    return "UI library inbound imports may target only allowed ui paths or shared contracts";
  }

  if (isUnder(file, "shared")) {
    return isUnder(target, "shared")
      ? true
      : "shared modules may depend only on other shared modules";
  }

  return "source module is outside the configured Webview architecture areas";
}

function checkUILibraryImport(file, dependency, resolvedTarget, compositeImportGraph) {
  const sourceIsUI = isUnder(file, UI_ROOT);
  const targetIsUI = resolvedTarget && isUnder(resolvedTarget, UI_ROOT);

  if (sourceIsUI) {
    checkUILibraryInboundImport(file, dependency, resolvedTarget);
  }

  if (!targetIsUI) return;

  checkUILibraryLayerConsumption(file, dependency, resolvedTarget);
  checkUILibraryPublicSurface(file, dependency, resolvedTarget);

  if (sourceIsUI) {
    checkUILibraryTierImport(file, dependency, resolvedTarget, compositeImportGraph);
  }
}

function checkUILibraryLayerConsumption(file, dependency, target) {
  if (isUnder(file, UI_ROOT)) return;

  if (uiBrandbookWing(target)) {
    reportDependency(
      file,
      dependency,
      "UI wing brandbook isolation: wing brandbook files are internal and must not be imported outside ui"
    );
    return;
  }

  if (isUnder(target, "Ui/core")) {
    reportDependency(
      file,
      dependency,
      "UI core isolation: ui/core is internal and must not be imported outside ui"
    );
    return;
  }

  if (isUnder(file, "View")) {
    if (isUnder(target, "Ui/chrome") || isUnder(target, "Ui/canvas")) return;
  } else if (isUnder(file, "Shell")) {
    if (isUnder(target, "Ui/chrome")) return;
    reportDependency(
      file,
      dependency,
      "UI layer consumption: Shell may import only the ui/chrome wing"
    );
    return;
  } else if (
    isUnder(file, "Controller") ||
    isUnder(file, "Bridge") ||
    isUnder(file, "mermaidRenderer")
  ) {
    reportDependency(
      file,
      dependency,
      "UI layer consumption: Controller, Bridge, and mermaidRenderer must not import ui"
    );
    return;
  }

  reportDependency(
    file,
    dependency,
    "UI layer consumption: ui may be imported only by View, or by Shell through ui/chrome"
  );
}

function checkUILibraryPublicSurface(file, dependency, target) {
  if (uiBrandbookWing(target)) return;

  const targetComponent = uiComponent(target);
  if (targetComponent) {
    if (file === targetComponent.root || isUnder(file, targetComponent.root)) return;
    if (target === `${targetComponent.root}/${targetComponent.name}.tsx`) return;

    reportDependency(
      file,
      dependency,
      "UI library outbound surface: import a component only through its defining <Component>/<Component>.tsx file; owned children, CSS modules, and internals are private"
    );
    return;
  }

  if (!isUnder(file, UI_ROOT) && !isUnder(target, "Ui/core")) {
    reportDependency(
      file,
      dependency,
      "UI library outbound surface: consumers may import only component defining files, never tier internals or tokens.css"
    );
  }
}

function checkUILibraryInboundImport(file, dependency, target) {
  if (!target) {
    if (dependency.specifier === "react" || dependency.specifier.startsWith("react/")) {
      return;
    }
    if (dependency.specifier.startsWith(".")) return;

    const isFramework =
      dependency.specifier === "@xyflow/react" || dependency.specifier.startsWith("@xyflow/");
    reportDependency(
      file,
      dependency,
      isFramework
        ? "UI library inbound imports: framework libraries are forbidden inside ui"
        : "UI library inbound imports: package imports inside ui are limited to React"
    );
    return;
  }

  if (isUnder(target, UI_ROOT)) return;

  if (isUnder(target, "shared")) {
    return;
  }

  reportDependency(
    file,
    dependency,
    "UI library inbound imports: ui must not import View, Controller, Shell, Bridge, mermaidRenderer, or other application modules"
  );
}

function checkUILibraryTierImport(file, dependency, target, compositeImportGraph) {
  const targetBrandbookWing = uiBrandbookWing(target);
  if (targetBrandbookWing) {
    const sourceLocation = uiLocation(file);
    if (!sourceLocation || sourceLocation.wing !== targetBrandbookWing) {
      reportDependency(
        file,
        dependency,
        "UI wing brandbook isolation: a wing brandbook file may be imported only by elements in its own wing"
      );
    }
    return;
  }

  const sourceLocation = uiLocation(file);
  const targetLocation = uiLocation(target);
  if (!sourceLocation || !targetLocation) return;

  if (sourceLocation.wing === "core") {
    if (targetLocation.wing !== "core") {
      reportDependency(
        file,
        dependency,
        "UI core isolation: ui/core must not import chrome or canvas"
      );
    }
    return;
  }

  if (targetLocation.wing !== "core" && sourceLocation.wing !== targetLocation.wing) {
    reportDependency(
      file,
      dependency,
      "UI wing isolation: ui/chrome and ui/canvas must never import each other"
    );
    return;
  }

  if (targetLocation.wing === "core") return;

  const sourceComponent = uiComponent(file);
  const targetComponent = uiComponent(target);
  if (sourceComponent && targetComponent && sourceComponent.root === targetComponent.root) {
    return;
  }

  if (sourceLocation.tier === "primitives" || sourceLocation.tier === "templates") {
    reportDependency(
      file,
      dependency,
      "UI tier matrix: primitives and templates may import from the library only ui/core"
    );
    return;
  }

  if (sourceLocation.tier !== "composites") return;

  if (targetLocation.tier !== "primitives" && targetLocation.tier !== "composites") {
    reportDependency(
      file,
      dependency,
      "UI tier matrix: composites may import only own-wing primitives, own-wing composites, and ui/core"
    );
    return;
  }

  if (
    targetLocation.tier === "composites" &&
    sourceComponent &&
    targetComponent &&
    sourceComponent.root !== targetComponent.root
  ) {
    const entries = compositeImportGraph.get(sourceComponent.root) ?? [];
    entries.push({ target: targetComponent.root, file, dependency });
    compositeImportGraph.set(sourceComponent.root, entries);
  }
}

function checkCompositeImportCycles(graph) {
  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  function visit(component) {
    if (visited.has(component)) return;
    const cycleStart = stack.indexOf(component);
    if (cycleStart >= 0) {
      const cycle = [...stack.slice(cycleStart), component].join(" -> ");
      const edge = graph.get(component)?.[0];
      report({
        file: edge?.file ?? "ui",
        line: edge?.dependency.line ?? 1,
        column: edge?.dependency.column ?? 1,
        kind: "UI library tiers",
        specifier: cycle,
        rule: "UI tier matrix: composite imports must be acyclic",
      });
      return;
    }
    if (visiting.has(component)) return;

    visiting.add(component);
    stack.push(component);
    for (const edge of graph.get(component) ?? []) {
      visit(edge.target);
    }
    stack.pop();
    visiting.delete(component);
    visited.add(component);
  }

  for (const component of graph.keys()) {
    visit(component);
  }
}

function checkStylesheetOwnership() {
  for (const absoluteFile of listFiles(sourceRoot)) {
    if (!absoluteFile.endsWith(".module.css")) continue;
    const file = toSourceRelative(absoluteFile);
    if (!isUnder(file, "View")) continue;

    report({
      file,
      line: 1,
      column: 1,
      kind: "stylesheet ownership",
      specifier: file,
      rule: "View stylesheet ownership: .module.css files must live under ui, never View",
    });
  }
}

function checkCSSModuleClassIntegrity() {
  const moduleRecords = new Map();

  for (const absoluteFile of listFiles(sourceRoot)) {
    if (!absoluteFile.endsWith(".module.css")) continue;
    const source = readFileSync(absoluteFile, "utf8");
    const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
    const declarations = new Map();
    for (const match of withoutComments.matchAll(/\.([_a-zA-Z][_a-zA-Z0-9-]*)/g)) {
      const name = match[1];
      if (declarations.has(name)) continue;
      declarations.set(name, toLineColumn(source, source.indexOf(match[0])));
    }
    moduleRecords.set(path.normalize(absoluteFile), {
      file: toSourceRelative(absoluteFile),
      source,
      declarations,
      references: new Set(),
      computedCandidates: new Set(),
      computedPrefixes: new Set(),
    });
  }

  for (const absoluteFile of listSourceFiles(sourceRoot)) {
    const source = readFileSync(absoluteFile, "utf8");
    const sourceFile = ts.createSourceFile(
      absoluteFile,
      source,
      ts.ScriptTarget.Latest,
      true,
      absoluteFile.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    const imports = new Map();

    for (const statement of sourceFile.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !statement.importClause?.name ||
        !ts.isStringLiteralLike(statement.moduleSpecifier) ||
        !statement.moduleSpecifier.text.endsWith(".module.css")
      ) {
        continue;
      }
      const cssPath = path.normalize(
        path.resolve(path.dirname(absoluteFile), statement.moduleSpecifier.text)
      );
      if (moduleRecords.has(cssPath)) {
        imports.set(statement.importClause.name.text, moduleRecords.get(cssPath));
      }
    }
    if (imports.size === 0) continue;

    const literalValues = new Set();
    function collectLiteralValues(node) {
      if (ts.isLiteralTypeNode(node) && ts.isStringLiteralLike(node.literal)) {
        literalValues.add(node.literal.text);
      }
      ts.forEachChild(node, collectLiteralValues);
    }
    collectLiteralValues(sourceFile);

    function visit(node) {
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        imports.has(node.expression.text)
      ) {
        const record = imports.get(node.expression.text);
        const name = node.name.text;
        record.references.add(name);
        if (!record.declarations.has(name)) {
          const location = sourceFile.getLineAndCharacterOfPosition(node.name.getStart(sourceFile));
          report({
            file: toSourceRelative(absoluteFile),
            line: location.line + 1,
            column: location.character + 1,
            kind: "CSS module integrity",
            specifier: `${node.expression.text}.${name}`,
            rule: `CSS module class integrity: static access ${node.expression.text}.${name} must resolve to a class declared by the imported module`,
          });
        }
      }

      if (
        ts.isElementAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        imports.has(node.expression.text)
      ) {
        const record = imports.get(node.expression.text);
        const argument = node.argumentExpression;
        if (argument && ts.isStringLiteralLike(argument)) {
          record.references.add(argument.text);
          if (!record.declarations.has(argument.text)) {
            const location = sourceFile.getLineAndCharacterOfPosition(
              argument.getStart(sourceFile)
            );
            report({
              file: toSourceRelative(absoluteFile),
              line: location.line + 1,
              column: location.character + 1,
              kind: "CSS module integrity",
              specifier: `${node.expression.text}[${JSON.stringify(argument.text)}]`,
              rule: `CSS module class integrity: computed literal access must resolve to a class declared by the imported module`,
            });
          }
        } else {
          for (const value of literalValues) record.computedCandidates.add(value);
          if (argument && ts.isTemplateExpression(argument)) {
            record.computedPrefixes.add(argument.head.text);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }

  for (const record of moduleRecords.values()) {
    for (const [name, location] of record.declarations) {
      const isComputedReference =
        record.computedCandidates.has(name) ||
        [...record.computedPrefixes].some((prefix) => prefix && name.startsWith(prefix));
      if (record.references.has(name) || isComputedReference) continue;
      report({
        file: record.file,
        line: location.line,
        column: location.column,
        kind: "CSS module integrity",
        specifier: `.${name}`,
        rule: "CSS module class integrity: every declared class must be referenced statically or belong to a computed access domain in its importing source file",
      });
    }
  }
}

function checkBrandTokenUsage() {
  const definitions = new Map();
  const references = new Set();

  for (const absoluteFile of listFiles(sourceRoot)) {
    if (!/\.(?:css|ts|tsx)$/.test(absoluteFile)) continue;
    const file = toSourceRelative(absoluteFile);
    const source = readFileSync(absoluteFile, "utf8");
    for (const match of source.matchAll(/--shiny-[\w-]+/g)) {
      const token = match[0];
      const after = source.slice((match.index ?? 0) + token.length);
      const isDefinition = /^\s*:/.test(after);
      const isBrandbook = /^Ui\/(?:chrome|canvas)\/tokens\.css$/.test(file);
      if (isDefinition && isBrandbook) {
        const entries = definitions.get(token) ?? [];
        entries.push({ file, source, index: match.index ?? 0 });
        definitions.set(token, entries);
      } else {
        references.add(token);
      }
    }
  }

  for (const [token, entries] of definitions) {
    if (references.has(token)) continue;
    const entry = entries[0];
    const location = toLineColumn(entry.source, entry.index);
    report({
      file: entry.file,
      line: location.line,
      column: location.column,
      kind: "token consumption",
      specifier: token,
      rule: "Brandbook token consumption: every --shiny-* definition must have at least one consumer; delete orphan tokens",
    });
  }
}

function checkTokenConsumption() {
  for (const absoluteFile of listFiles(sourceRoot)) {
    if (!/\.(?:css|ts|tsx)$/.test(absoluteFile)) continue;
    const file = toSourceRelative(absoluteFile);
    const source = readFileSync(absoluteFile, "utf8");

    for (const match of source.matchAll(/--vscode-/g)) {
      const isWingCSSBrandbook = /^Ui\/(?:chrome|canvas)\/tokens\.css$/.test(file);
      if (isWingCSSBrandbook || isUnder(file, "mermaidRenderer")) continue;
      const location = toLineColumn(source, match.index ?? 0);
      report({
        file,
        line: location.line,
        column: location.column,
        kind: "token consumption",
        specifier: "--vscode-",
        rule: "Theme token boundary: --vscode-* strings may appear only in wing tokens.css brandbooks or mermaidRenderer",
      });
    }

    for (const match of source.matchAll(/--shiny-/g)) {
      const isAllowed =
        isUnder(file, UI_ROOT) ||
        file === "View/config/styleConstants.ts" ||
        (absoluteFile.endsWith(".css") && isUnder(file, "Shell")) ||
        file === "styles.css";
      if (isAllowed) continue;
      const location = toLineColumn(source, match.index ?? 0);
      report({
        file,
        line: location.line,
        column: location.column,
        kind: "token consumption",
        specifier: "--shiny-",
        rule: "Brand token boundary: --shiny-* strings may appear only in ui, View/config/styleConstants.ts, Shell CSS, or styles.css; Controller, Bridge, and mermaidRenderer are not brand consumers",
      });
    }

    const consumerWing =
      isUnder(file, "Ui/chrome") ||
      (absoluteFile.endsWith(".css") && isUnder(file, "Shell")) ||
      file === "styles.css"
        ? "chrome"
        : isUnder(file, "Ui/canvas")
          ? "canvas"
          : null;
    if (!consumerWing) continue;
    const foreignWing = consumerWing === "chrome" ? "canvas" : "chrome";
    const foreignPrefix = `--shiny-${foreignWing}-`;
    for (const match of source.matchAll(new RegExp(foreignPrefix, "g"))) {
      const location = toLineColumn(source, match.index ?? 0);
      report({
        file,
        line: location.line,
        column: location.column,
        kind: "token consumption",
        specifier: foreignPrefix,
        rule: `UI wing brandbook isolation: ${consumerWing} consumers must not read ${foreignWing}-prefixed brand tokens`,
      });
    }
  }
}

function checkCSSBrandbookImports() {
  for (const absoluteFile of listFiles(sourceRoot)) {
    if (!absoluteFile.endsWith(".css")) continue;
    const file = toSourceRelative(absoluteFile);
    const source = readFileSync(absoluteFile, "utf8");

    for (const match of source.matchAll(/@import\s+["']([^"']+)["']/g)) {
      const target = resolveProjectCSSDependency(file, match[1]);
      const targetWing = target ? uiBrandbookWing(target) : null;
      if (!targetWing) continue;
      if (file === "styles.css") continue;

      const sourceWing = uiLocation(file)?.wing;
      if (sourceWing === targetWing) continue;
      const location = toLineColumn(source, match.index ?? 0);
      report({
        file,
        line: location.line,
        column: location.column,
        kind: "token consumption",
        specifier: match[1],
        rule: "UI wing brandbook isolation: a wing tokens.css file may be imported only by its own wing; styles.css is the sole dual-wing load site",
      });
    }
  }
}

function checkCSSModuleShinyTokenDefinitions() {
  for (const absoluteFile of listFiles(sourceRoot)) {
    if (!absoluteFile.endsWith(".module.css")) continue;
    const file = toSourceRelative(absoluteFile);
    const source = readFileSync(absoluteFile, "utf8");
    const match = /--shiny-[\w-]+\s*:/.exec(source);
    if (!match) continue;
    const location = toLineColumn(source, match.index);
    report({
      file,
      line: location.line,
      column: location.column,
      kind: "UI library tiers",
      specifier: match[0].replace(/\s*:\s*$/, ""),
      rule: "--shiny-* custom properties may be defined only in wing tokens.css brandbooks, not component CSS modules",
    });
  }
}

function checkCSSModuleLiteralColors() {
  const literalColor = /#[\da-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\s*\(/g;

  for (const absoluteFile of listFiles(sourceRoot)) {
    if (!absoluteFile.endsWith(".module.css")) continue;
    const file = toSourceRelative(absoluteFile);
    const source = readFileSync(absoluteFile, "utf8");
    for (const match of source.matchAll(literalColor)) {
      const location = toLineColumn(source, match.index ?? 0);
      report({
        file,
        line: location.line,
        column: location.column,
        kind: "Design system",
        specifier: match[0],
        rule: "literal colors are forbidden in CSS modules; use a --shiny-* token or a data-bound custom property",
      });
    }
  }
}

function checkFacade(file, sourceFile, compilerOptions, cache) {
  const reExports = [];

  for (const statement of sourceFile.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteralLike(statement.moduleSpecifier)
    ) {
      reExports.push(statement);
      continue;
    }

    const position = sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile));
    report({
      file,
      line: position.line + 1,
      column: position.character + 1,
      kind: "facade",
      specifier: "<local declaration>",
      rule: "facade files may contain only comments and re-export declarations",
    });
  }

  if (reExports.length === 0) {
    reportFile(file, "facade must expose at least one re-export declaration");
  }

  for (const declaration of reExports) {
    const dependency = dependencyFromExportDeclaration(sourceFile, declaration);
    const target = resolveProjectDependency(
      sourceFile.fileName,
      dependency.specifier,
      compilerOptions,
      cache
    );
    if (!target) {
      reportDependency(
        file,
        dependency,
        "facade re-exports must resolve to a Webview-owned module"
      );
      continue;
    }

    checkFacadeTarget(file, dependency, target);
  }

  if (file === "Shell/index.ts") {
    checkSingleRuntimeFacade(
      file,
      sourceFile,
      reExports,
      compilerOptions,
      cache,
      "Shell",
      "WebViewShell"
    );
  }

  if (file === "View/EditorView/index.ts") {
    checkSingleRuntimeFacade(
      file,
      sourceFile,
      reExports,
      compilerOptions,
      cache,
      "View/EditorView",
      "EditorView"
    );
  }
}

function dependencyFromExportDeclaration(sourceFile, declaration) {
  const moduleSpecifier = declaration.moduleSpecifier;
  const position = sourceFile.getLineAndCharacterOfPosition(moduleSpecifier.getStart(sourceFile));
  return {
    specifier: moduleSpecifier.text,
    isTypeOnly: isTypeOnlyExportDeclaration(declaration),
    kind: "re-export",
    line: position.line + 1,
    column: position.character + 1,
  };
}

function checkFacadeTarget(file, dependency, target) {
  if (target === file) {
    reportDependency(file, dependency, "facade must not re-export itself");
    return;
  }

  const component = controllerComponent(file);
  if (component && !isUnder(target, `Controller/${component}`)) {
    reportDependency(
      file,
      dependency,
      `Controller/${component} facade may re-export only contracts and runtime entries owned by that component`
    );
    return;
  }

  if (file === "Shell/index.ts") {
    if (!isUnder(target, "Shell")) {
      reportDependency(
        file,
        dependency,
        "Shell facade may re-export only the WebViewShell runtime from Shell"
      );
    }
    return;
  }

  if (file === "View/EditorView/index.ts") return;

  if (SHINY_VIEW_FACADES.has(file)) {
    if (!isUnder(target, "View") || SHINY_VIEW_FACADES.has(target)) {
      reportDependency(
        file,
        dependency,
        "Shiny View semantic facades may re-export Shiny View-owned implementation contracts, not another facade or another layer"
      );
    }
  }
}

function checkShinyControllerStateHooks(file, sourceFile) {
  const reactStateHookNames = new Set();
  const reactObjectNames = new Set();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteralLike(statement.moduleSpecifier)) continue;
    if (statement.moduleSpecifier.text !== "react") continue;

    const clause = statement.importClause;
    if (!clause || clause.isTypeOnly) continue;

    if (clause.name) {
      reactObjectNames.add(clause.name.text);
    }

    const bindings = clause.namedBindings;
    if (!bindings) continue;

    if (ts.isNamespaceImport(bindings)) {
      reactObjectNames.add(bindings.name.text);
      continue;
    }

    if (ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        if (element.isTypeOnly) continue;
        const importedName = element.propertyName?.text ?? element.name.text;
        if (importedName === "useState" || importedName === "useReducer") {
          reactStateHookNames.add(element.name.text);
        }
      }
    }
  }

  function visit(node) {
    if (ts.isCallExpression(node) && isReactStateHookCall(node.expression)) {
      const position = sourceFile.getLineAndCharacterOfPosition(
        node.expression.getStart(sourceFile)
      );
      report({
        file,
        line: position.line + 1,
        column: position.character + 1,
        kind: "controller state",
        specifier: node.expression.getText(sourceFile),
        rule: "ShinyController may derive and orchestrate source-backed data but must not own transient View state with React useState/useReducer",
      });
      return;
    }

    ts.forEachChild(node, visit);
  }

  function isReactStateHookCall(expression) {
    if (ts.isIdentifier(expression)) {
      return reactStateHookNames.has(expression.text);
    }

    if (!ts.isPropertyAccessExpression(expression)) return false;
    if (expression.name.text !== "useState" && expression.name.text !== "useReducer") {
      return false;
    }

    return (
      ts.isIdentifier(expression.expression) && reactObjectNames.has(expression.expression.text)
    );
  }

  visit(sourceFile);
}

function checkProtocolDependencies(file, sourceFile, displayFileName) {
  for (const dependency of collectDependencies(sourceFile)) {
    reportDependencyWithDisplay(
      file,
      dependency,
      "protocol dependency",
      "protocol modules must be self-contained and must not import, re-export, dynamically import, or require dependencies",
      displayFileName
    );
  }
}

function checkProtocolSynchronization(protocolSources) {
  const webviewProtocol = protocolSources.get(WEBVIEW_PROTOCOL_FILE);
  const hostProtocol = protocolSources.get(HOST_PROTOCOL_FILE);
  if (!webviewProtocol || !hostProtocol) return;

  const webviewDeclarations = collectProtocolDeclarations(webviewProtocol);
  const hostDeclarations = collectProtocolDeclarations(hostProtocol);

  const declarationNames = [
    ...new Set([...webviewDeclarations.keys(), ...hostDeclarations.keys()]),
  ].sort();

  for (const name of declarationNames) {
    const webviewDeclaration = webviewDeclarations.get(name);
    const hostDeclaration = hostDeclarations.get(name);

    if (!webviewDeclaration) {
      reportProtocolMismatch(
        HOST_PROTOCOL_FILE,
        HOST_PROTOCOL_FILE,
        name,
        hostDeclaration,
        `protocol mismatch: declaration ${name} exists only in host protocol`
      );
      continue;
    }

    if (!hostDeclaration) {
      reportProtocolMismatch(
        WEBVIEW_PROTOCOL_FILE,
        `${sourcePrefix}/${WEBVIEW_PROTOCOL_FILE}`,
        name,
        webviewDeclaration,
        `protocol mismatch: declaration ${name} exists only in Webview protocol`
      );
      continue;
    }

    if (webviewDeclaration.signature !== hostDeclaration.signature) {
      reportProtocolMismatch(
        WEBVIEW_PROTOCOL_FILE,
        `${sourcePrefix}/${WEBVIEW_PROTOCOL_FILE}`,
        name,
        webviewDeclaration,
        `protocol mismatch: declaration ${name} differs from host protocol`
      );
      reportProtocolMismatch(
        HOST_PROTOCOL_FILE,
        HOST_PROTOCOL_FILE,
        name,
        hostDeclaration,
        `protocol mismatch: declaration ${name} differs from Webview protocol`
      );
    }
  }
}

function collectProtocolDeclarations(sourceFile) {
  const declarations = new Map();

  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement)) continue;

    if (ts.isTypeAliasDeclaration(statement)) {
      declarations.set(statement.name.text, {
        line:
          sourceFile.getLineAndCharacterOfPosition(statement.name.getStart(sourceFile)).line + 1,
        column:
          sourceFile.getLineAndCharacterOfPosition(statement.name.getStart(sourceFile)).character +
          1,
        signature: normalizeTypeNode(statement.type),
      });
      continue;
    }

    if (ts.isInterfaceDeclaration(statement)) {
      declarations.set(statement.name.text, {
        line:
          sourceFile.getLineAndCharacterOfPosition(statement.name.getStart(sourceFile)).line + 1,
        column:
          sourceFile.getLineAndCharacterOfPosition(statement.name.getStart(sourceFile)).character +
          1,
        signature: normalizeMembers(statement.members),
      });
    }
  }

  return declarations;
}

function hasExportModifier(node) {
  return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true;
}

function normalizeTypeNode(node) {
  if (ts.isTypeLiteralNode(node)) {
    return `{${normalizeMembers(node.members)}}`;
  }

  if (ts.isLiteralTypeNode(node)) {
    return `literal:${normalizeLiteral(node.literal)}`;
  }

  if (ts.isTypeReferenceNode(node)) {
    const typeArguments =
      node.typeArguments && node.typeArguments.length > 0
        ? `<${node.typeArguments.map(normalizeTypeNode).join(",")}>`
        : "";
    return `ref:${node.typeName.getText() + typeArguments}`;
  }

  if (ts.isUnionTypeNode(node)) {
    return `union:${node.types.map(normalizeTypeNode).join("|")}`;
  }

  if (ts.isArrayTypeNode(node)) {
    return `array:${normalizeTypeNode(node.elementType)}`;
  }

  if (ts.isTypeOperatorNode(node)) {
    return `operator:${ts.tokenToString(node.operator) ?? node.operator}:${normalizeTypeNode(
      node.type
    )}`;
  }

  if (ts.isParenthesizedTypeNode(node)) {
    return normalizeTypeNode(node.type);
  }

  if (ts.isTupleTypeNode(node)) {
    return `tuple:${node.elements.map(normalizeTypeNode).join(",")}`;
  }

  return `syntax:${node.kind}:${node.getText().replace(/\s+/g, "")}`;
}

function normalizeMembers(members) {
  return [...members]
    .map((member) => {
      if (!ts.isPropertySignature(member) || !member.type) {
        return `unsupported:${member.kind}:${member.getText().replace(/\s+/g, "")}`;
      }
      const name = propertyNameText(member.name);
      const readonly = hasReadonlyModifier(member) ? "readonly " : "";
      const optional = member.questionToken ? "?" : "";
      return `${readonly}${name}${optional}:${normalizeTypeNode(member.type)}`;
    })
    .join(";");
}

function normalizeLiteral(literal) {
  if (ts.isStringLiteralLike(literal)) return JSON.stringify(literal.text);
  if (literal.kind === ts.SyntaxKind.TrueKeyword) return "true";
  if (literal.kind === ts.SyntaxKind.FalseKeyword) return "false";
  if (literal.kind === ts.SyntaxKind.NullKeyword) return "null";
  return literal.getText();
}

function propertyNameText(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return name.text;
  return name.getText();
}

function hasReadonlyModifier(node) {
  return (
    node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) === true
  );
}

function checkSingleRuntimeFacade(
  file,
  sourceFile,
  reExports,
  compilerOptions,
  cache,
  ownerDirectory,
  runtimeEntryName
) {
  const runtimeExports = [];
  let invalidShape = false;

  for (const declaration of reExports) {
    const dependency = dependencyFromExportDeclaration(sourceFile, declaration);
    const target = resolveProjectDependency(
      sourceFile.fileName,
      dependency.specifier,
      compilerOptions,
      cache
    );

    if (!target || !isUnder(target, ownerDirectory)) {
      reportDependency(
        file,
        dependency,
        `${file} must re-export the ${runtimeEntryName} runtime from a module owned by ${ownerDirectory}`
      );
      invalidShape = true;
    }

    if (
      declaration.isTypeOnly ||
      !declaration.exportClause ||
      !ts.isNamedExports(declaration.exportClause)
    ) {
      invalidShape = true;
      continue;
    }

    for (const element of declaration.exportClause.elements) {
      if (element.isTypeOnly) {
        invalidShape = true;
        continue;
      }
      runtimeExports.push(element.name.text);
    }
  }

  if (invalidShape || runtimeExports.length !== 1 || runtimeExports[0] !== runtimeEntryName) {
    reportFile(file, `${file} may expose exactly one runtime entry: ${runtimeEntryName}`);
  }
}

function controllerComponent(file) {
  const match = /^Controller\/([^/]+)\//.exec(file);
  return match && CONTROLLER_COMPONENT_SET.has(match[1]) ? match[1] : null;
}

function controllerFacade(component) {
  return `Controller/${component}/index.ts`;
}

function isControllerComponentFacade(file) {
  const component = controllerComponent(file);
  return component !== null && file === controllerFacade(component);
}

function isUnder(file, directory) {
  return file.startsWith(`${directory}/`);
}

function toSourceRelative(absoluteFile) {
  return toPosix(path.relative(sourceRoot, absoluteFile));
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function reportDependency(file, dependency, rule) {
  reportDependencyWithDisplay(file, dependency, null, rule);
}

function reportDependencyWithDisplay(file, dependency, kind, rule, displayFileName) {
  report({
    file,
    line: dependency.line,
    column: dependency.column,
    kind: kind ?? (dependency.isTypeOnly ? `${dependency.kind} type-only` : dependency.kind),
    specifier: dependency.specifier,
    rule,
    displayFile: displayFileName,
  });
}

function reportFile(file, rule) {
  reportFileWithDisplay(file, null, rule);
}

function reportFileWithDisplay(file, displayFileName, rule) {
  report({
    file,
    line: 1,
    column: 1,
    kind: "file",
    specifier: "<file>",
    rule,
    displayFile: displayFileName,
  });
}

function reportProtocolMismatch(file, displayFileName, declaration, location, rule) {
  report({
    file,
    line: location?.line ?? 1,
    column: location?.column ?? 1,
    kind: "protocol mismatch",
    specifier: declaration,
    rule,
    displayFile: displayFileName,
  });
}

function report(violation) {
  const key = [
    violation.file,
    violation.line,
    violation.column,
    violation.kind,
    violation.specifier,
    violation.rule,
  ].join("\u0000");

  if (violations.some((existing) => existing.key === key)) return;
  violations.push({ ...violation, key });
}

function displayFile(violation) {
  return violation.displayFile ?? `${sourcePrefix}/${violation.file}`;
}

function compareViolations(left, right) {
  return (
    displayFile(left).localeCompare(displayFile(right)) ||
    left.line - right.line ||
    left.column - right.column ||
    left.rule.localeCompare(right.rule)
  );
}
