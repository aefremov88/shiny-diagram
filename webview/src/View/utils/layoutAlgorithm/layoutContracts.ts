import type { Rect } from "../../../shared/geometry";
import type { ClassId, NamespaceId, NoteId, RelationshipId } from "../../../shared/ids";
import type { DiagramDirection, MemberKind, RelationshipEndpointKind } from "../../../shared/uml";

export type LayoutClass = {
  readonly id: ClassId;
  readonly parentNamespaceId: NamespaceId | null;
  readonly headerTexts: readonly string[];
  readonly members: readonly { readonly kind: MemberKind; readonly text: string }[];
  readonly bounds: Rect | null;
};

export type LayoutInput = {
  readonly direction: DiagramDirection | null;
  readonly classes: readonly LayoutClass[];
  readonly namespaces: readonly {
    readonly id: NamespaceId;
    readonly parentNamespaceId: NamespaceId | null;
    readonly memberClassIds: readonly ClassId[];
    readonly childNamespaceIds: readonly NamespaceId[];
  }[];
  readonly relationships: readonly {
    readonly id: RelationshipId;
    readonly sourceClassId: ClassId;
    readonly targetClassId: ClassId;
    readonly sourceEndpointKind: RelationshipEndpointKind;
    readonly targetEndpointKind: RelationshipEndpointKind;
  }[];
  readonly notes: readonly {
    readonly id: NoteId;
    readonly text: string;
    readonly attachedToClassId: ClassId | null;
    readonly bounds: Rect | null;
  }[];
  readonly missingClassIds: readonly ClassId[];
};

export type SpatialAssignment =
  | { readonly kind: "class"; readonly classId: ClassId; readonly bounds: Rect }
  | { readonly kind: "note"; readonly noteId: NoteId; readonly bounds: Rect };
