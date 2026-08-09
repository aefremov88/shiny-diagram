/**
 * @fileoverview Builds applied-style edges from style-application tokens.
 */

import { toClassId, toStyleApplicationId, toStyleDefId } from "../../../../shared/ids";
import { IDENTITY_PATTERN, readIdentity } from "../../../model/identitySpelling";
import type { StyleApplicationEdge } from "../../../model/diagramGraph";
import type { SourceSpan } from "../../../model/sourceEdit";
import type { ParseToken } from "../tokenizer";
import { toSourceSpan } from "../toSourceSpan";

export type ParsedStyleApplicationEdge = {
  readonly edge: StyleApplicationEdge;
  readonly location: SourceSpan;
};

/**
 * Builds an applied-style edge from a style-application token.
 */
export function buildAppliesStyleEdge(
  token: ParseToken,
  index: number
): ParsedStyleApplicationEdge | null {
  if (token.type !== "styleApplication") return null;

  const match =
    new RegExp(`^\\s*class\\s+(${IDENTITY_PATTERN}):::(\\w+)\\s*$`).exec(token.raw) ??
    new RegExp(`^\\s*class\\s+(${IDENTITY_PATTERN})\\s+(\\w+)\\s*$`).exec(token.raw);
  if (!match) return null;

  const targetId = toClassId(readIdentity(match[1]));
  const styleDefId = toStyleDefId(match[2]);
  return {
    location: toSourceSpan(token),
    edge: {
      kind: "styleApplication",
      id: toStyleApplicationId(`${targetId}:::${styleDefId}:${index}`),
      targetId,
      styleDefId,
    },
  };
}
