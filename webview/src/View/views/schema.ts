/**
 * @fileoverview Authoritative Shiny View render tree.
 *
 * Single source of truth for the structural view tree that Controller sends to
 * the Shiny View layer and that every View component slices from. It is both the
 * external (Controller -> View) contract and the internal component contract.
 *
 * Discipline:
 * - Components never redeclare these shapes. A component's view prop is a node
 *   type below, or a `Pick` of one.
 * - Child views are produced by slicing only: field access or array selection.
 *   Constructing, deriving, or merging is prohibited in the view lane.
 * - Fixed UML notions and geometry primitives live in `shared/` and are imported
 *   here, never inlined.
 * - Anything added from local View state travels in a separate state lane, not in
 *   this tree.
 */

import type { StyleProperties } from "../../shared/style";
import type { Rect } from "../../shared/geometry";
import type {
  DiagramDirection,
  MemberClassifier,
  MemberKind,
  RelationshipEndpointKind,
  RelationshipLineKind,
} from "../../shared/uml";
import type {
  AttributeId,
  ClassId,
  MethodId,
  NamespaceId,
  NoteId,
  RelationshipId,
  StyleDefId,
} from "../../shared/ids";

/* ── Leaf views ──────────────────────────────────────────────────────────── */

export type ClassHeaderView = {
  readonly name: string;
  readonly label: string;
  readonly stereotype?: string;
};

export type ClassMemberView = {
  readonly memberId: AttributeId | MethodId;
  readonly kind: MemberKind;
  readonly text: string;
  readonly classifier: MemberClassifier | null;
};

/* ── Node views ──────────────────────────────────────────────────────────── */

export type ClassView = {
  readonly classId: ClassId;
  readonly parentNamespaceId: NamespaceId | null;
  readonly bounds: Rect;
  readonly header: ClassHeaderView;
  readonly members: readonly ClassMemberView[];
  readonly style?: StyleProperties;
  readonly appliedStyleId?: StyleDefId;
};

export type UnpositionedClassView = Omit<ClassView, "bounds">;

export type NamespaceView = {
  readonly namespaceId: NamespaceId;
  readonly label: string;
  readonly parentNamespaceId: NamespaceId | null;
  readonly memberClassIds: readonly ClassId[];
  readonly childNamespaceIds: readonly NamespaceId[];
  readonly style?: StyleProperties;
};

export type DeclaredStyleView = {
  readonly kind: "declared";
  readonly styleDefId: StyleDefId;
  readonly name: string;
  readonly properties: StyleProperties;
};

export type StyleView =
  | DeclaredStyleView
  | {
      readonly kind: "direct";
      readonly classId: ClassId;
      readonly properties: StyleProperties;
    }
  | {
      readonly kind: "namespace";
      readonly namespaceId: NamespaceId;
      readonly properties: StyleProperties;
    };

export type RelationshipView = {
  readonly relationshipId: RelationshipId;
  readonly sourceClassId: ClassId;
  readonly targetClassId: ClassId;
  readonly sourceEndpointKind: RelationshipEndpointKind;
  readonly targetEndpointKind: RelationshipEndpointKind;
  readonly lineKind: RelationshipLineKind;
  readonly sourceMultiplicity?: string;
  readonly targetMultiplicity?: string;
  readonly label?: string;
};

export type NoteView = {
  readonly noteId: NoteId;
  readonly text: string;
  readonly bounds: Rect | null;
  readonly attachedToClassId: ClassId | null;
};

/* ── Diagram tree ────────────────────────────────────────────────────────── */

export type DiagramView = {
  readonly direction: DiagramDirection | null;
  readonly classes: readonly ClassView[];
  readonly namespaces: readonly NamespaceView[];
  readonly relationships: readonly RelationshipView[];
  readonly notes: readonly NoteView[];
  readonly styles: readonly StyleView[];
};

/* ── Root contract (Controller -> View) ──────────────────────────────────── */

export type EditorViewModel =
  | {
      readonly status: "unsupportedDiagramType";
      readonly diagramType: string;
    }
  | {
      readonly status: "invalidSyntax";
      readonly errors: readonly string[];
    }
  | {
      readonly status: "missingAnnotations";
      readonly missingClasses: readonly UnpositionedClassView[];
      readonly diagram: DiagramView;
    }
  | {
      readonly status: "ready";
      readonly diagram: DiagramView;
    };
