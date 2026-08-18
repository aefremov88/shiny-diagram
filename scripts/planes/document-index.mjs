import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  generatedWarning,
  generationDate,
  generatorLink,
  parseDocumentMetadata,
  renderMetadata,
} from "./document-metadata.mjs";

export const name = "document-index";
export const outputPath = "docs/index.md";

const modulePath = "scripts/planes/document-index.mjs";

export async function generate({ repoRoot, planes }) {
  const documentPaths = (await collectMarkdownFiles(path.join(repoRoot, "docs")))
    .map((filePath) => path.relative(repoRoot, filePath).replaceAll(path.sep, "/"))
    .filter((filePath) => filePath !== outputPath);
  const planePaths = planes
    .map((plane) => plane.outputPath)
    .filter((filePath) => filePath !== outputPath);
  const paths = [...new Set([...documentPaths, ...planePaths])].sort(compareText);
  const documents = [];

  for (const filePath of paths) {
    const source = await readFile(path.join(repoRoot, filePath), "utf8");
    documents.push({ filePath, ...parseDocumentMetadata(source, filePath) });
  }

  documents.push({
    filePath: outputPath,
    title: "Documentation index",
    kind: "Collecting",
    documentState: "Maintained",
    implementationState: "Implemented",
    lastReviewed: generationDate(),
    scope: indexScope(),
    generatedBy: generatorLink(modulePath),
  });
  documents.sort((left, right) => compareText(left.filePath, right.filePath));

  const lines = [
    "# Documentation index",
    "",
    renderMetadata({
      kind: "Collecting",
      documentState: "Maintained",
      implementationState: "Implemented",
      lastReviewed: generationDate(),
      scope: indexScope(),
      generatedBy: generatorLink(modulePath),
    }),
    "",
    generatedWarning(name),
    "",
  ];

  for (const group of groupDocuments(documents)) {
    lines.push(
      `## ${group.title}`,
      "",
      "| Path | Kind | State | Scope |",
      "| --- | --- | --- | --- |"
    );
    for (const document of group.documents) {
      lines.push(
        `| [\`${document.filePath}\`](${linkFromIndex(document.filePath)}) | ${document.kind} | ${document.documentState} | ${escapeTableCell(document.scope)} |`
      );
    }
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function groupDocuments(documents) {
  const groups = new Map();
  for (const document of documents) {
    const key = documentGroup(document.filePath);
    const group = groups.get(key) ?? { title: key, documents: [] };
    group.documents.push(document);
    groups.set(key, group);
  }
  const orderedKeys = [...groups.keys()].sort((left, right) => {
    if (left === "Planes") return 1;
    if (right === "Planes") return -1;
    return compareText(left, right);
  });
  return orderedKeys.map((key) => groups.get(key));
}

function documentGroup(filePath) {
  if (!filePath.startsWith("docs/")) return "Planes";
  const directory = path.posix.dirname(filePath);
  return `\`${directory}/\``;
}

async function collectMarkdownFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectMarkdownFiles(entryPath)));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(entryPath);
  }
  return files;
}

function linkFromIndex(filePath) {
  if (filePath.startsWith("docs/")) return `./${filePath.slice("docs/".length)}`;
  return `../${filePath}`;
}

function escapeTableCell(value) {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function compareText(left, right) {
  return left.localeCompare(right, "en");
}

function indexScope() {
  return "Index of defining documents and registered planes";
}
