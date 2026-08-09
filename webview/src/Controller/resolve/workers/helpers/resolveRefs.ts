/**
 * @fileoverview
 * Slice resolution.
 *
 * Maps a logical reference — statement, entry, value, block, or style list — to
 * the concrete source span it names, via `ProvenanceIndex`. Every lookup is
 * required: a missing record means translate emitted a ref with no provenance
 * backing it, which is a contract breach, so resolution throws rather than
 * silently degrading. Anchors and workers build on these spans.
 */

import type {
  ClassRecord,
  DiagramRecord,
  NamespaceRecord,
  ProvenanceIndex,
} from "../../../model/provenanceIndex";
import type { SourceSpan } from "../../../model/sourceEdit";
import type {
  BlockRef,
  ClauseRef,
  EntryRef,
  StatementRef,
  StyleListRef,
  ValueRef,
} from "../../../translate";

export function resolveStatementRef(ref: StatementRef, provenance: ProvenanceIndex): SourceSpan {
  switch (ref.kind) {
    case "direction":
      return requireRecord(provenance.diagram.direction, "diagram direction");
    case "configDirective":
      return requireRecord(
        provenance.diagram.configDirectives[ref.index],
        `config directive ${ref.index}`
      );
    case "class":
      return requireRecord(provenance.classes.get(ref.classId), `class ${ref.classId}`).self;
    case "relationship":
      return requireRecord(
        provenance.relationships.get(ref.relationshipId),
        `relationship ${ref.relationshipId}`
      ).self;
    case "lollipopInterface":
      return requireRecord(
        provenance.lollipopInterfaces.get(ref.lollipopInterfaceId),
        `lollipop interface ${ref.lollipopInterfaceId}`
      ).self;
    case "classDirectStyle":
      return requireRecord(
        provenance.classDirectStyles.get(ref.classId),
        `direct style ${ref.classId}`
      ).self;
    case "namespaceStyle":
      return requireRecord(
        provenance.namespaceStyles.get(ref.namespaceId),
        `namespace style ${ref.namespaceId}`
      ).self;
    case "styleApplication":
      return requireRecord(
        provenance.styleApplications.get(ref.styleApplicationId),
        `style application ${ref.styleApplicationId}`
      ).self;
    case "classSpatial":
      return requireRecord(provenance.classSpatial.get(ref.classId), `spatial ${ref.classId}`).self;
    case "namespace":
      return requireRecord(
        provenance.namespaces.get(ref.namespaceId),
        `namespace ${ref.namespaceId}`
      ).self;
    case "blockMember":
      return requireRecord(provenance.blockMembers.get(ref.memberId), `member ${ref.memberId}`)
        .self;
    case "shortMember":
      return requireRecord(provenance.shortMembers.get(ref.memberId), `member ${ref.memberId}`)
        .self;
    case "styleDefinition":
      return requireRecord(
        provenance.styleDefinitions.get(ref.styleDefId),
        `style definition ${ref.styleDefId}`
      ).self;
    case "note":
      return requireRecord(provenance.notes.get(ref.noteId), `note ${ref.noteId}`).self;
    case "noteAnnotation":
      return requireRecord(
        provenance.noteAnnotations.get(ref.noteId),
        `note annotation ${ref.noteId}`
      ).self;
  }
}

export function resolveEntryRef(ref: EntryRef, provenance: ProvenanceIndex): SourceSpan {
  switch (ref.kind) {
    case "directStyleProperty":
      return requireRecord(
        provenance.classDirectStyles.get(ref.classId)?.fields.properties[ref.property],
        `direct style property ${ref.classId}.${ref.property}`
      ).entry;
    case "styleDefProperty":
      return requireRecord(
        provenance.styleDefinitions.get(ref.styleDefId)?.fields.properties[ref.property],
        `styleDef property ${ref.styleDefId}.${ref.property}`
      ).entry;
  }
}

export function resolveClauseRef(ref: ClauseRef, provenance: ProvenanceIndex): SourceSpan {
  switch (ref.kind) {
    case "classGeneric":
      return requireRecord(
        provenance.classes.get(ref.classId)?.fields.genericType,
        `class generic ${ref.classId}`
      );
    case "classLabel":
      return requireRecord(
        provenance.classes.get(ref.classId)?.fields.labelFull,
        `class label ${ref.classId}`
      );
    case "relationshipLabel":
      return requireRecord(
        provenance.relationships.get(ref.relationshipId)?.fields.label,
        `relationship label ${ref.relationshipId}`
      );
    case "relationshipSourceMultiplicity":
    case "relationshipTargetMultiplicity": {
      const fields = requireRecord(
        provenance.relationships.get(ref.relationshipId),
        `relationship ${ref.relationshipId}`
      ).fields;
      const span =
        ref.kind === "relationshipSourceMultiplicity"
          ? fields.sourceMultiplicity
          : fields.targetMultiplicity;
      return requireRecord(span, `${ref.kind} ${ref.relationshipId}`);
    }
  }
}

export function resolveValueRef(ref: ValueRef, provenance: ProvenanceIndex): SourceSpan {
  switch (ref.kind) {
    case "className":
      return requireRecord(provenance.classes.get(ref.classId), `class ${ref.classId}`).fields
        .declaredName;
    case "classGenericType":
      return requireRecord(
        provenance.classes.get(ref.classId)?.fields.genericType,
        `class generic type ${ref.classId}`
      );
    case "classLabel":
      return requireRecord(
        provenance.classes.get(ref.classId)?.fields.label,
        `class label ${ref.classId}`
      );
    case "classLabelFull":
      return requireRecord(
        provenance.classes.get(ref.classId)?.fields.labelFull,
        `class label ${ref.classId}`
      );
    case "classAnnotation":
      return requireRecord(
        provenance.classes.get(ref.classId)?.fields.annotation,
        `class annotation ${ref.classId}`
      );
    case "styleDefName":
      return requireRecord(
        provenance.styleDefinitions.get(ref.styleDefId),
        `style definition ${ref.styleDefId}`
      ).fields.declaredName;
    case "directStylePropertyValue":
      return requireRecord(
        provenance.classDirectStyles.get(ref.classId)?.fields.properties[ref.property],
        `direct style property value ${ref.classId}.${ref.property}`
      ).value;
    case "directStyleTarget":
      return requireRecord(
        provenance.classDirectStyles.get(ref.classId),
        `direct style ${ref.classId}`
      ).fields.target;
    case "spatialCoord": {
      if (ref.target.kind !== "class") {
        throw new Error(`Unsupported spatial target ${ref.target.kind}`);
      }
      return requireRecord(
        provenance.classSpatial.get(ref.target.classId),
        `spatial ${ref.target.classId}`
      ).fields[ref.coord];
    }
    case "spatialTarget": {
      if (ref.target.kind !== "class") {
        throw new Error(`Unsupported spatial target ${ref.target.kind}`);
      }
      return requireRecord(
        provenance.classSpatial.get(ref.target.classId),
        `spatial ${ref.target.classId}`
      ).fields.target;
    }
    case "noteSpatialCoord":
      return requireRecord(
        provenance.noteAnnotations.get(ref.noteId),
        `note annotation ${ref.noteId}`
      ).fields[ref.coord];
    case "relationshipEndpoint": {
      const fields = requireRecord(
        provenance.relationships.get(ref.relationshipId),
        `relationship ${ref.relationshipId}`
      ).fields;
      return ref.side === "source" ? fields.sourceEndpoint : fields.targetEndpoint;
    }
    case "relationshipMultiplicity": {
      const fields = requireRecord(
        provenance.relationships.get(ref.relationshipId),
        `relationship ${ref.relationshipId}`
      ).fields;
      const location =
        ref.side === "source" ? fields.sourceMultiplicity : fields.targetMultiplicity;
      return requireRecord(location, `relationship multiplicity ${ref.relationshipId}.${ref.side}`);
    }
    case "relationshipOperator":
      return requireRecord(
        provenance.relationships.get(ref.relationshipId),
        `relationship ${ref.relationshipId}`
      ).fields.operator;
    case "relationshipLabel":
      return requireRecord(
        provenance.relationships.get(ref.relationshipId)?.fields.label,
        `relationship label ${ref.relationshipId}`
      );
    case "noteText":
      return requireRecord(provenance.notes.get(ref.noteId), `note ${ref.noteId}`).fields.text;
    case "styleApplicationTarget":
      return requireRecord(
        provenance.styleApplications.get(ref.styleApplicationId),
        `style application ${ref.styleApplicationId}`
      ).fields.target;
    case "styleApplicationName":
      return requireRecord(
        provenance.styleApplications.get(ref.styleApplicationId),
        `style application ${ref.styleApplicationId}`
      ).fields.styleName;
    case "namespaceStyleTarget":
      return requireRecord(
        provenance.namespaceStyles.get(ref.namespaceId),
        `namespace style ${ref.namespaceId}`
      ).fields.target;
    case "namespaceStyleProperties":
      return requireRecord(
        provenance.namespaceStyles.get(ref.namespaceId),
        `namespace style ${ref.namespaceId}`
      ).fields.propertyList;
    case "namespaceName":
      return requireRecord(
        provenance.namespaces.get(ref.namespaceId),
        `namespace ${ref.namespaceId}`
      ).fields.declaredName;
    case "memberName":
      return requireRecord(
        provenance.blockMembers.get(ref.memberId) ?? provenance.shortMembers.get(ref.memberId),
        `member ${ref.memberId}`
      ).fields.text;
    case "memberOwner":
      return requireRecord(provenance.shortMembers.get(ref.memberId), `member ${ref.memberId}`)
        .fields.owner;
    case "styleDefPropertyValue":
      return requireRecord(
        provenance.styleDefinitions.get(ref.styleDefId)?.fields.properties[ref.property],
        `styleDef property value ${ref.styleDefId}.${ref.property}`
      ).value;
  }
}

export function resolveBlockRef(
  block: BlockRef,
  provenance: ProvenanceIndex
): DiagramRecord | ClassRecord | NamespaceRecord {
  switch (block.kind) {
    case "diagram":
      return provenance.diagram;
    case "class":
      return requireRecord(provenance.classes.get(block.classId), `class ${block.classId}`);
    case "namespace":
      return requireRecord(
        provenance.namespaces.get(block.namespaceId),
        `namespace ${block.namespaceId}`
      );
  }
}

export function resolveStyleListRef(ref: StyleListRef, provenance: ProvenanceIndex): SourceSpan {
  switch (ref.kind) {
    case "directStyle":
      return requireRecord(
        provenance.classDirectStyles.get(ref.classId),
        `direct style ${ref.classId}`
      ).fields.propertyList;
    case "styleDef":
      return requireRecord(
        provenance.styleDefinitions.get(ref.styleDefId),
        `styleDef ${ref.styleDefId}`
      ).fields.propertyList;
  }
}

/** Asserts a provenance lookup resolved; a miss is a translate/provenance contract breach. */
export function requireRecord<T>(value: T | null | undefined, description: string): T {
  if (!value) throw new Error(`Missing provenance for ${description}`);
  return value;
}
