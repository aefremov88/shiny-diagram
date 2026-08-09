/**
 * @fileoverview
 * `WriteIntent` — the contract between the translate and resolve modules.
 *
 * Translation turns semantic `EditorCommand`s into `WriteIntent`s: an
 * operation, optional Mermaid text, and role-typed references to parsed
 * `ProvenanceIndex` areas. Resolution turns them into `SourceEdit`s — resolving
 * areas to positions, deriving indentation/EOL/separators, checking conflicts.
 *
 * Operations, named by the grammar unit they touch:
 *   - statement (a member, class, relationship, style line): insert / delete;
 *   - entry (a `key:value` pair, e.g. a style property): insert / delete;
 *   - clause (an optional statement component, markers included): insert / delete;
 *   - value (a single span — a name, endpoint, coordinate, property value): replace.
 *
 * Rule: standalone units (statement, entry, clause) can be inserted or deleted; a value
 * can only be replaced (it cannot exist without its key, nor be removed without
 * removing its entry). A clause is inserted and deleted whole, including its
 * markers; its inner content is replaced as a value. There is no `replaceClause`
 * or `replaceStatement` — a whole-statement
 * rewrite is `delete` + `insert`, resolved atomically against one snapshot.
 *
 * Every reference is flat: `{ kind; id; selector? }`. Boundaries: translation
 * owns Mermaid syntax (`payload` is zero-indent, `\n`-joined, no EOL); resolution
 * owns coordinates, indentation, EOL, and entry separators. Insertion is always
 * *after* a point — a statement's last line (sibling), or a container's opening
 * (first child). The same/different-kind sibling distinction drives statement
 * newline policy during resolution.
 */

import type {
  AttributeId,
  ClassId,
  LollipopInterfaceId,
  MethodId,
  NamespaceId,
  NoteId,
  RelationshipId,
  StyleApplicationId,
  StyleDefId,
} from "../../shared/ids";
import type { StylePropertyName } from "../../shared/style";
import type { SourceSpan } from "../model/sourceEdit";

// ============================================================================
// References — a statement, an entry, a value, or an insertion anchor
// ============================================================================

/** A whole statement (delete target / insert anchor). No selector — it is the unit. */
export type StatementRef =
  | { readonly kind: "direction" }
  | { readonly kind: "configDirective"; readonly index: number }
  | { readonly kind: "class"; readonly classId: ClassId }
  | { readonly kind: "namespace"; readonly namespaceId: NamespaceId }
  | { readonly kind: "blockMember"; readonly memberId: AttributeId | MethodId }
  | { readonly kind: "shortMember"; readonly memberId: AttributeId | MethodId }
  | { readonly kind: "relationship"; readonly relationshipId: RelationshipId }
  | { readonly kind: "lollipopInterface"; readonly lollipopInterfaceId: LollipopInterfaceId }
  | { readonly kind: "styleDefinition"; readonly styleDefId: StyleDefId }
  | { readonly kind: "classDirectStyle"; readonly classId: ClassId }
  | { readonly kind: "namespaceStyle"; readonly namespaceId: NamespaceId }
  | { readonly kind: "styleApplication"; readonly styleApplicationId: StyleApplicationId }
  | { readonly kind: "classSpatial"; readonly classId: ClassId }
  | { readonly kind: "note"; readonly noteId: NoteId }
  | { readonly kind: "noteAnnotation"; readonly noteId: NoteId };

/** A block whose opening line a first child inserts under. */
export type BlockRef =
  | { readonly kind: "diagram" }
  | { readonly kind: "class"; readonly classId: ClassId }
  | { readonly kind: "namespace"; readonly namespaceId: NamespaceId };

/** A `key:value` entry (delete target). */
export type EntryRef =
  | {
      readonly kind: "directStyleProperty";
      readonly classId: ClassId;
      readonly property: StylePropertyName;
    }
  | {
      readonly kind: "styleDefProperty";
      readonly styleDefId: StyleDefId;
      readonly property: StylePropertyName;
    };

/** An optional statement component (delete target / insert identity). */
export type ClauseRef =
  | { readonly kind: "classGeneric"; readonly classId: ClassId }
  | { readonly kind: "classLabel"; readonly classId: ClassId }
  | { readonly kind: "relationshipLabel"; readonly relationshipId: RelationshipId }
  | { readonly kind: "relationshipSourceMultiplicity"; readonly relationshipId: RelationshipId }
  | { readonly kind: "relationshipTargetMultiplicity"; readonly relationshipId: RelationshipId };

/** A single overwrite-able span (replace target). */
export type ValueRef =
  | { readonly kind: "className"; readonly classId: ClassId }
  | { readonly kind: "classGenericType"; readonly classId: ClassId }
  | { readonly kind: "classLabel"; readonly classId: ClassId }
  | { readonly kind: "classLabelFull"; readonly classId: ClassId }
  | { readonly kind: "classAnnotation"; readonly classId: ClassId }
  | { readonly kind: "styleDefName"; readonly styleDefId: StyleDefId }
  | { readonly kind: "namespaceName"; readonly namespaceId: NamespaceId }
  | { readonly kind: "memberName"; readonly memberId: AttributeId | MethodId }
  | { readonly kind: "memberOwner"; readonly memberId: AttributeId | MethodId } // `User` in `User : +name`
  | {
      readonly kind: "relationshipEndpoint";
      readonly relationshipId: RelationshipId;
      readonly side: "source" | "target";
    }
  | {
      readonly kind: "relationshipMultiplicity";
      readonly relationshipId: RelationshipId;
      readonly side: "source" | "target";
    }
  | { readonly kind: "relationshipOperator"; readonly relationshipId: RelationshipId }
  | { readonly kind: "relationshipLabel"; readonly relationshipId: RelationshipId }
  | { readonly kind: "noteText"; readonly noteId: NoteId }
  | {
      readonly kind: "directStylePropertyValue";
      readonly classId: ClassId;
      readonly property: StylePropertyName;
    }
  | { readonly kind: "directStyleTarget"; readonly classId: ClassId }
  | {
      readonly kind: "styleDefPropertyValue";
      readonly styleDefId: StyleDefId;
      readonly property: StylePropertyName;
    }
  | { readonly kind: "styleApplicationTarget"; readonly styleApplicationId: StyleApplicationId }
  | { readonly kind: "styleApplicationName"; readonly styleApplicationId: StyleApplicationId }
  | { readonly kind: "namespaceStyleTarget"; readonly namespaceId: NamespaceId }
  | { readonly kind: "namespaceStyleProperties"; readonly namespaceId: NamespaceId }
  | { readonly kind: "spatialTarget"; readonly target: BlockRef }
  | {
      readonly kind: "spatialCoord";
      readonly target: BlockRef;
      readonly coord: "x" | "y" | "w" | "h";
    }
  | {
      readonly kind: "noteSpatialCoord";
      readonly noteId: NoteId;
      readonly coord: "x" | "y" | "w" | "h";
    };

/** Where a new statement lands — always after a point. */
export type StatementAnchor =
  | { readonly kind: "afterSameKind"; readonly statement: StatementRef } // sibling, same kind
  | { readonly kind: "afterDifferentKind"; readonly statement: StatementRef } // sibling, other kind
  | { readonly kind: "aboveStatement"; readonly statement: StatementRef } // binding write, adjacent above target
  | { readonly kind: "atBlockOpening"; readonly block: BlockRef }; // first child of a block

/** A property list a first entry inserts into. */
export type StyleListRef =
  | { readonly kind: "directStyle"; readonly classId: ClassId }
  | { readonly kind: "styleDef"; readonly styleDefId: StyleDefId };

/** Where a new entry lands — always after a point. */
export type EntryAnchor =
  | { readonly kind: "afterEntry"; readonly entry: EntryRef } // next in the list
  | { readonly kind: "afterListOpening"; readonly list: StyleListRef }; // first in the list

/** Where a new clause lands; the clause identity selects its presentation join. */
export type ClauseAnchor = {
  readonly kind: "afterComponent";
  readonly clause: ClauseRef;
  readonly component: ValueRef;
};

// ============================================================================
// Intents
// ============================================================================

/** New statement after an anchor. `payload` carries the moved source for a move. */
export type InsertStatementIntent = {
  readonly kind: "insertStatement";
  readonly payload: string;
  readonly anchor: StatementAnchor;
};

/** Remove a whole statement (line or block) and its EOL. */
export type DeleteStatementIntent = {
  readonly kind: "deleteStatement";
  readonly target: StatementRef;
};

/** Insert a `key:value` entry; resolution owns the separator comma. */
export type InsertEntryIntent = {
  readonly kind: "insertEntry";
  readonly payload: string;
  readonly anchor: EntryAnchor;
};

/** Remove a `key:value` entry and its adjacent separator. */
export type DeleteEntryIntent = {
  readonly kind: "deleteEntry";
  readonly target: EntryRef;
};

/** Insert a whole optional clause; resolution owns its join to the neighboring component. */
export type InsertClauseIntent = {
  readonly kind: "insertClause";
  readonly payload: string;
  readonly anchor: ClauseAnchor;
};

/** Remove a whole optional clause, including its markers and joining whitespace. */
export type DeleteClauseIntent = {
  readonly kind: "deleteClause";
  readonly target: ClauseRef;
};

/** Overwrite a single value span in place (no newline/indent/separator). */
export type ReplaceValueIntent = {
  readonly kind: "replaceValue";
  readonly payload: string;
  readonly target: ValueRef;
};

/** Delete an exact source range. Reserved for post-pass structural cleanup. */
export type DeleteRangeIntent = {
  readonly kind: "deleteRange";
  readonly target: SourceSpan;
};

export type WriteIntent =
  | InsertStatementIntent
  | DeleteStatementIntent
  | InsertEntryIntent
  | DeleteEntryIntent
  | InsertClauseIntent
  | DeleteClauseIntent
  | ReplaceValueIntent
  | DeleteRangeIntent;
