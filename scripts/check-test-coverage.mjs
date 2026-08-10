import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const catalog = readFileSync("webview/src/Controller/translate/WRITEBACK-CATALOG.md", "utf8");
const headings = [...catalog.matchAll(/^### \[`([^`]+)`\]/gm)];
const requiredCases = headings.flatMap((match, index) => {
  const command = match[1];
  const body = catalog.slice(match.index, headings[index + 1]?.index ?? catalog.length);
  if (!body.includes("write options:")) return [command];
  const optionBlock = body.slice(body.indexOf("write options:") + "write options:".length);
  const options = [
    ...optionBlock.matchAll(/^([a-z])\. ([\s\S]*?)(?=^[a-z]\. |^No-op|^Errors|(?![\s\S]))/gm),
  ]
    .map((option) => option[2].split("→")[0].replace(/\*\*/g, "").replace(/\s+/g, " ").trim())
    .map((label, index) => `${command} — ${String.fromCharCode(97 + index)}. ${label}`);
  return options;
});
const testText = readdirSync("webview/test/writeback", { recursive: true })
  .filter((name) => name.endsWith(".test.ts") || name.endsWith(".test.tsx"))
  .map((name) => readFileSync(join("webview/test/writeback", name), "utf8"))
  .join("\n");
const missing = requiredCases.filter((name) => !testText.includes(name));

if (missing.length > 0) {
  console.error(`Unmapped write options:\n${missing.map((name) => `- ${name}`).join("\n")}`);
  process.exit(1);
}
console.log(`Write-back coverage: ${requiredCases.length} catalog write options, zero unmapped.`);
