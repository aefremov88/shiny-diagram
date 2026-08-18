import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  generatedWarning,
  generationDate,
  generatorLink,
  renderMetadata,
} from "./document-metadata.mjs";

export const name = "writeback-catalog";
export const outputPath = "webview/src/Controller/translate/WRITEBACK-CATALOG.md";

const modulePath = "scripts/planes/writeback-catalog.mjs";
const fragmentPath = fileURLToPath(
  new URL("./fragments/writeback-catalog-preamble.md", import.meta.url)
);
const families = ["class", "relationship", "note", "namespace", "style"];

export async function generate({ repoRoot }) {
  const preamble = await readFile(fragmentPath, "utf8");
  const entries = await collectWritebackEntries({ repoRoot });
  const sections = [
    "# Write-back catalog",
    renderMetadata({
      kind: "Collecting",
      documentState: "Maintained",
      implementationState: "Implemented",
      lastReviewed: generationDate(),
      scope: "Write-back command rules generated from translator annotations",
      generatedBy: generatorLink(modulePath),
    }),
    generatedWarning(name),
    normalizeFragment(preamble),
    renderCoverage(entries),
    renderContents(entries),
    renderCatalog(entries),
  ];
  return `${sections.filter(Boolean).join("\n\n")}\n`;
}

export async function collectWritebackEntries({ repoRoot }) {
  const translateRoot = path.join(repoRoot, "webview", "src", "Controller", "translate");
  const dispatcherPath = path.join(translateRoot, "translateCommands.ts");
  const commandsPath = path.join(
    repoRoot,
    "webview",
    "src",
    "View",
    "commands",
    "editorCommands.ts"
  );
  const [dispatcher, commandsSource] = await Promise.all([
    readFile(dispatcherPath, "utf8"),
    readFile(commandsPath, "utf8"),
  ]);
  const imports = parseWorkerImports(dispatcher);
  const dispatches = parseDispatches(dispatcher);
  const sourceCache = new Map();
  const entries = [];

  for (const dispatch of dispatches) {
    const imported = imports.get(dispatch.translatorName);
    if (imported === undefined) {
      throw new Error(
        `Cannot resolve dispatcher translator ${dispatch.translatorName} for ${dispatch.commandName}`
      );
    }
    const absoluteFilePath = path.resolve(translateRoot, `${imported.modulePath}.ts`);
    let source = sourceCache.get(absoluteFilePath);
    if (source === undefined) {
      source = await readFile(absoluteFilePath, "utf8");
      sourceCache.set(absoluteFilePath, source);
    }
    const payloadType = extractPayloadType(commandsSource, dispatch.commandName);
    if (payloadType === null) {
      throw new Error(`Cannot slice EditorCommand payload type for ${dispatch.commandName}`);
    }
    entries.push({
      ...dispatch,
      family: dispatch.commandName.split(".")[0],
      filePath: path.relative(repoRoot, absoluteFilePath).replaceAll(path.sep, "/"),
      sourcePath: `./${path.relative(translateRoot, absoluteFilePath).replaceAll(path.sep, "/")}`,
      annotation: extractAnnotation(source, imported.exportedName),
      payloadType,
    });
  }

  return entries;
}

function parseWorkerImports(source) {
  const imports = new Map();
  const pattern = /import\s*{([^}]*)}\s*from\s*"([^"]+)";/g;
  for (const match of source.matchAll(pattern)) {
    if (!match[2].startsWith("./workers/")) continue;
    for (const specifier of match[1].split(",")) {
      const parts = specifier.trim().split(/\s+as\s+/);
      if (!parts[0]) continue;
      imports.set(parts[1] ?? parts[0], {
        exportedName: parts[0],
        modulePath: match[2],
      });
    }
  }
  return imports;
}

function parseDispatches(source) {
  const functionStart = source.indexOf("function translateCommand(");
  const functionEnd = source.indexOf("\ntype RelationshipOperatorPatch", functionStart);
  if (functionStart < 0 || functionEnd < 0)
    throw new Error("Cannot locate translateCommand switch");
  const body = source.slice(functionStart, functionEnd);
  const matches = [...body.matchAll(/case\s+"([^"]+)":/g)];
  const dispatches = [];
  const seen = new Set();
  for (let index = 0; index < matches.length; index += 1) {
    const commandName = matches[index][1];
    if (seen.has(commandName)) continue;
    const start = (matches[index].index ?? 0) + matches[index][0].length;
    const end = matches[index + 1]?.index ?? body.length;
    const returnMatch = /\breturn\s+([A-Za-z_$][\w$]*)\s*\(/.exec(body.slice(start, end));
    if (returnMatch === null) {
      throw new Error(`Cannot resolve dispatcher return for ${commandName}`);
    }
    seen.add(commandName);
    dispatches.push({ commandName, translatorName: returnMatch[1] });
  }
  return dispatches;
}

function extractAnnotation(source, functionName) {
  const escapedName = escapeRegExp(functionName);
  const exportPattern = new RegExp(`export\\s+function\\s+${escapedName}\\b`);
  const exportMatch = exportPattern.exec(source);
  if (exportMatch === null) return null;
  const preceding = source.slice(0, exportMatch.index);
  const blockMatch = [...preceding.matchAll(/\/\*\*([\s\S]*?)\*\//g)].at(-1);
  if (
    blockMatch === undefined ||
    preceding.slice((blockMatch.index ?? 0) + blockMatch[0].length).trim().length > 0
  ) {
    return null;
  }
  const lines = blockMatch[1].split(/\r?\n/).map((line) => line.replace(/^\s*\* ?/, "").trimEnd());
  const content = trimBlankLines(lines);
  if (content.length === 0 || content[0].trim().startsWith("@fileoverview")) return null;
  return content.join("\n");
}

function extractPayloadType(source, commandName) {
  const needle = `readonly type: "${commandName}"`;
  const target = source.indexOf(needle);
  if (target < 0) return null;
  const stack = [];
  for (let index = 0; index <= target; index += 1) {
    if (source[index] === "{") stack.push(index);
    else if (source[index] === "}") stack.pop();
  }
  const openBrace = stack.at(-1);
  if (openBrace === undefined) return null;
  const closeBrace = findMatchingBrace(source, openBrace);
  if (closeBrace < 0) return null;
  const payload = source.slice(openBrace, closeBrace + 1);
  if (!payload.includes(needle)) return null;
  return dedentPayload(payload);
}

function findMatchingBrace(source, openBrace) {
  let depth = 0;
  for (let index = openBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") depth -= 1;
    if (depth === 0) return index;
  }
  return -1;
}

function dedentPayload(payload) {
  const lines = payload.split(/\r?\n/);
  const indents = lines
    .slice(1, -1)
    .filter((line) => line.trim().length > 0)
    .map((line) => /^\s*/.exec(line)[0].length);
  const remove = Math.max(0, Math.min(...indents) - 2);
  return lines.map((line, index) => (index === 0 ? line : line.slice(remove))).join("\n");
}

function renderCoverage(entries) {
  const lines = ["# Coverage", "", "| Family | Annotated | Total |", "|---|---:|---:|"];
  let annotatedTotal = 0;
  for (const family of families) {
    const matching = entries.filter((entry) => entry.family === family);
    const annotated = matching.filter((entry) => entry.annotation !== null).length;
    annotatedTotal += annotated;
    lines.push(`| ${titleCase(family)} | ${annotated} | ${matching.length} |`);
  }
  lines.push(`| **Overall** | **${annotatedTotal}** | **${entries.length}** |`);
  return lines.join("\n");
}

function renderContents(entries) {
  const lines = ["# Contents", ""];
  for (const family of families) {
    lines.push(`- [${titleCase(family)}](#${family})`);
    for (const entry of entries.filter((candidate) => candidate.family === family)) {
      lines.push(
        `  - [${entry.commandName}](#${entry.commandName.replaceAll(".", "").toLowerCase()})`
      );
    }
  }
  return lines.join("\n");
}

function renderCatalog(entries) {
  const sections = [];
  for (const family of families) {
    sections.push(`# ${titleCase(family)}`);
    for (const entry of entries.filter((candidate) => candidate.family === family)) {
      sections.push(
        [
          `### [\`${entry.commandName}\`](${entry.sourcePath})`,
          "",
          "```ts",
          entry.payloadType,
          "```",
          "",
          entry.annotation ?? "_not yet annotated_",
        ].join("\n")
      );
    }
  }
  return sections.join("\n\n");
}

function normalizeFragment(fragment) {
  return fragment.replace(/\r\n/g, "\n").trimEnd();
}

function trimBlankLines(lines) {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim().length === 0) start += 1;
  while (end > start && lines[end - 1].trim().length === 0) end -= 1;
  return lines.slice(start, end);
}

function titleCase(value) {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
