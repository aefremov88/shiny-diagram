/**
 * Regenerates deterministic management-plane documents from source files.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planes, planesByName } from "./planes/registry.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requestedNames = process.argv.slice(2);

if (requestedNames.length > 1) {
  fail(`Expected zero or one plane name. Registered planes: ${registeredPlaneNames()}`);
}

const selectedPlanes = requestedNames.length === 0 ? planes : [planesByName.get(requestedNames[0])];

if (selectedPlanes[0] === undefined) {
  fail(
    `Unknown plane ${JSON.stringify(requestedNames[0])}. Registered planes: ${registeredPlaneNames()}`
  );
}

for (const plane of selectedPlanes) {
  const outputFile = path.resolve(repoRoot, plane.outputPath);
  const content = await plane.generate({ repoRoot, planes });
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, content, "utf8");
  console.log(`Updated ${plane.name}: ${path.relative(repoRoot, outputFile)}`);
}

function registeredPlaneNames() {
  return planes
    .map((plane) => plane.name)
    .sort()
    .join(", ");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
