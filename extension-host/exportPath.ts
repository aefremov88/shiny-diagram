/**
 * @fileoverview Derives export targets beside Mermaid source files.
 */

import * as path from "node:path";

export function toPngPath(sourcePath: string): string {
  const parsed = path.parse(sourcePath);
  return path.join(parsed.dir, `${parsed.name}.png`);
}
