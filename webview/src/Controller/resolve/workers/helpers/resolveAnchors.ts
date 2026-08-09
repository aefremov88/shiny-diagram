/**
 * @fileoverview
 * Insertion-point resolution.
 *
 * An anchor is a placement, not a slice: it names a point new text is written
 * at, never a span to overwrite. This module turns each anchor into that concrete
 * position, plus the context its insertion kind needs —
 * - a statement lands on its own new line, so it carries the block indent;
 * - an entry lands inline in a list, so it carries the separator to prefix
 *   (a comma when appending after an existing entry, nothing as the first).
 *
 * Folding the start-vs-end and separator choices in here is deliberate: workers
 * receive a ready insertion point and never re-inspect the anchor's shape.
 * Composes slice resolution (`refs`) with text mechanics (`text`).
 */

import type { ProvenanceIndex } from "../../../model/provenanceIndex";
import type { SourcePosition } from "../../../model/sourceEdit";
import type { BlockRef, EntryAnchor, StatementAnchor } from "../../../translate";
import {
  resolveBlockRef,
  resolveEntryRef,
  resolveStatementRef,
  resolveStyleListRef,
} from "./resolveRefs";
import { getLine, getLineIndent } from "./textUtils";

/** A resolved statement insertion: where the new line goes, and the indent to prefix each line with. */
export type ResolvedStatementAnchor =
  | {
      readonly side: "after";
      readonly position: SourcePosition;
      readonly indent: string;
      readonly blankBefore: boolean;
    }
  | {
      readonly side: "above";
      readonly position: SourcePosition;
      readonly indent: string;
    };

/** A resolved entry insertion: where the entry goes, and the separator to prefix it with. */
export type ResolvedEntryAnchor = {
  readonly position: SourcePosition;
  readonly separator: string;
};

export function resolveStatementAnchor(
  anchor: StatementAnchor,
  provenance: ProvenanceIndex,
  sourceText: string
): ResolvedStatementAnchor {
  if (anchor.kind === "afterSameKind" || anchor.kind === "afterDifferentKind") {
    const location = resolveStatementRef(anchor.statement, provenance);
    return {
      side: "after",
      position: location.end,
      indent: getLineIndent(sourceText, location.start.line),
      blankBefore: anchor.kind === "afterDifferentKind",
    };
  }

  if (anchor.kind === "aboveStatement") {
    const location = resolveStatementRef(anchor.statement, provenance);
    return {
      side: "above",
      position: location.start,
      indent: getLineIndent(sourceText, location.start.line),
    };
  }

  const header = resolveBlockRef(anchor.block, provenance).header;
  return {
    side: "after",
    position: header.end,
    indent: `${getLineIndent(sourceText, header.start.line)}${deriveIndentStep(
      anchor.block,
      provenance,
      sourceText
    )}`,
    blankBefore: false,
  };
}

export function resolveEntryAnchor(
  anchor: EntryAnchor,
  provenance: ProvenanceIndex
): ResolvedEntryAnchor {
  if (anchor.kind === "afterEntry") {
    return { position: resolveEntryRef(anchor.entry, provenance).end, separator: "," };
  }
  return { position: resolveStyleListRef(anchor.list, provenance).start, separator: "" };
}

/**
 * The one indentation step of a block, inferred from its first non-trivial child
 * line; falls back to two spaces for an empty block.
 */
function deriveIndentStep(
  block: BlockRef,
  provenance: ProvenanceIndex,
  sourceText: string
): string {
  const record = resolveBlockRef(block, provenance);
  const body = record.body;
  if (body) {
    const parentIndent = getLineIndent(sourceText, record.header.start.line);
    for (let line = body.start.line; line <= body.end.line; line++) {
      const raw = getLine(sourceText, line);
      if (raw.trim() === "" || raw.trim() === "}") continue;
      const childIndent = getLineIndent(sourceText, line);
      if (childIndent.length > parentIndent.length) return childIndent.slice(parentIndent.length);
    }
  }
  return "  ";
}
