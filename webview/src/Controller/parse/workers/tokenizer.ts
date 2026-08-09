/**
 * @fileoverview Tokenizes Mermaid source lines for the parse pipeline.
 */

import { IDENTITY_PATTERN } from "../../model/identitySpelling";

export type ParseTokenType =
  | "diagramHeader"
  | "direction"
  | "classDeclaration"
  | "classMember"
  | "relationship"
  | "styleDef"
  | "classDirectStyle"
  | "styleApplication"
  | "spatialAnnotation"
  | "noteAnnotation"
  | "namespaceStyleAnnotation"
  | "configDirective"
  | "noteStatement"
  | "namespace"
  | "directive"
  | "knownIgnored"
  | "blank"
  | "unrecognized";

export type ParseToken = {
  readonly lineNumber: number;
  readonly endLine: number;
  readonly raw: string;
  readonly fullRaw: string;
  readonly type: ParseTokenType;
  readonly blockTokens?: readonly ParseToken[];
};

/**
 * Tokenizes Mermaid source while retaining source lines and nested block structure.
 */
export function tokenize(source: string): ParseToken[] {
  const rawLines = source.split("\n");
  return tokenizeLines(rawLines, 0, rawLines.length).nodes;
}

function tokenizeLines(
  rawLines: string[],
  start: number,
  end: number
): { nodes: ParseToken[]; nextIndex: number } {
  const nodes: ParseToken[] = [];
  let i = start;

  while (i < end) {
    const raw = rawLines[i];

    if (/^\s*\}\s*$/.test(raw)) {
      break;
    }

    const lineNumber = i;
    const type = detectLineType(raw);

    if ((type === "classDeclaration" || type === "namespace") && raw.includes("{")) {
      const closesOnSameLine = /\{[^}]*\}/.test(raw);
      if (closesOnSameLine) {
        nodes.push({ lineNumber, endLine: lineNumber, raw, fullRaw: raw, type, blockTokens: [] });
        i++;
      } else {
        const { nodes: blockTokens, nextIndex } = tokenizeLines(rawLines, i + 1, end);
        nodes.push({
          lineNumber,
          endLine: nextIndex,
          raw,
          fullRaw: rawLines.slice(lineNumber, nextIndex + 1).join("\n"),
          type,
          blockTokens,
        });
        i = nextIndex + 1;
      }
    } else {
      nodes.push({ lineNumber, endLine: lineNumber, raw, fullRaw: raw, type });
      i++;
    }
  }

  return { nodes, nextIndex: i };
}

function detectLineType(raw: string): ParseTokenType {
  const identity = IDENTITY_PATTERN;
  if (/^\s*$/.test(raw)) return "blank";
  if (/^\s*classDiagram(?:-v2)?\b/.test(raw)) return "diagramHeader";
  if (/^\s*direction\s+(?:TB|BT|RL|LR)\s*$/.test(raw)) return "direction";
  if (/^\s*%%\s+@spatial:/.test(raw)) return "spatialAnnotation";
  if (/^\s*%%\s+@note:/.test(raw)) return "noteAnnotation";
  if (/^\s*%%\s+@style:/.test(raw)) return "namespaceStyleAnnotation";
  if (/^\s*%%\{\s*init\s*:.*\}%%\s*$/.test(raw)) return "configDirective";
  if (/^\s*%%/.test(raw)) return "directive";
  if (/^\s*classDef\s+/.test(raw)) return "styleDef";
  if (new RegExp(`^\\s*style\\s+${identity}\\s+`).test(raw)) return "classDirectStyle";
  if (new RegExp(`^\\s*class\\s+${identity}:::\\w+\\s*$`).test(raw)) return "styleApplication";
  if (new RegExp(`^\\s*class\\s+${identity}\\s+\\w+\\s*$`).test(raw)) return "styleApplication";
  if (new RegExp(`^\\s*class\\s+${identity}`).test(raw)) return "classDeclaration";
  if (new RegExp(`^\\s*namespace\\s+${identity}`).test(raw)) return "namespace";
  if (new RegExp(`^\\s*note\\s+(?:for\\s+${identity}\\s+)?"[^"]*"`).test(raw))
    return "noteStatement";
  if (isKnownIgnoredStatement(raw, identity)) return "knownIgnored";
  if (new RegExp(`^\\s*${identity}\\s*:\\s*.+$`).test(raw)) return "classMember";
  if (
    new RegExp(
      `^\\s*${identity}(?:\\s+"[^"]+")?\\s*(?:\\(\\)|<\\||\\|>|<|>|\\*|o)?(?:--|\\.\\.)(?:\\(\\)|<\\||\\|>|<|>|\\*|o)?\\s*(?:"[^"]+"\\s*)?${identity}(?:\\s*:\\s*.*)?\\s*$`
    ).test(raw)
  )
    return "relationship";

  return "unrecognized";
}

function isKnownIgnoredStatement(raw: string, identity: string): boolean {
  // Valid Mermaid statement forms that Shiny does not model in this read path:
  // Accessibility/title, click/callback/link interactions, cssClass,
  // top-level annotation shorthand. They remain in source and are
  // preserved by span-based writes.
  if (/^\s*accTitle\s*:/.test(raw)) return true;
  if (/^\s*accDescr(?:\s*:|\s*\{)/.test(raw)) return true;
  if (/^\s*(?:click|callback|link)\s+/.test(raw)) return true;
  if (/^\s*cssClass\s+/.test(raw)) return true;
  if (new RegExp(`^\\s*<<[^>]+>>\\s+${identity}\\s*$`).test(raw)) return true;
  return false;
}
