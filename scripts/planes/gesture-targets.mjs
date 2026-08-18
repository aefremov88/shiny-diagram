import { collectComponents } from "./ui-catalog.mjs";
import {
  generatedWarning,
  generationDate,
  generatorLink,
  renderMetadata,
} from "./document-metadata.mjs";

export const name = "gesture-targets";
export const outputPath = "webview/src/View/GESTURE-TARGETS.md";

const modulePath = "scripts/planes/gesture-targets.mjs";

export async function generate({ repoRoot }) {
  const components = await collectComponents({ repoRoot });
  const lines = [
    "# Gesture targets",
    "",
    renderMetadata({
      kind: "Collecting",
      documentState: "Maintained",
      implementationState: "Implemented",
      lastReviewed: generationDate(),
      scope: "UI-library gesture targets generated from component annotations",
      generatedBy: generatorLink(modulePath),
    }),
    "",
    generatedWarning(name),
    "",
    "This plane lists gesture targets owned locally by UI-library components.",
    "",
    "An address is local to its component. This version does not describe how component instances compose into reachable View paths.",
    "",
    "The future View target tree will combine these local addresses using the actual View composition.",
    "",
    "| Wing | Tier | Component | Address | Query |",
    "| --- | --- | --- | --- | --- |",
  ];

  for (const component of components) {
    for (const target of component.gestureTargets) {
      lines.push(
        `| ${titleCase(component.wing)} | ${titleCase(component.tier)} | ${component.name} | \`${target.address}\` | \`${target.query}\` |`
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

function titleCase(value) {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}
