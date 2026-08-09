/**
 * @behavior Class member grouping and command routing.
 * @render Persistent attribute and method compartments inside a class box.
 */

import type { ReactElement, Ref } from "react";
import { useState } from "react";
import type { ClassId } from "../../../../../../../../shared/ids";
import type { MemberClassifier } from "../../../../../../../../shared/uml";
import EditableTextList from "../../../../../../../../Ui/canvas/composites/EditableTextList/EditableTextList";
import type {
  EditableTextListRow,
  TextEmphasis,
} from "../../../../../../../../Ui/canvas/composites/EditableTextList/EditableTextList";
import type { EditingState } from "../../../../../../../state/editorStates";
import type { ClassMemberView, ClassView } from "../../../../../../../views/schema";
import InlineValidationPopup from "../../../../../../../../Ui/canvas/primitives/InlineValidationPopup/InlineValidationPopup";
import BoxBodyFrame from "../../../../../../../../Ui/canvas/templates/BoxBodyFrame/BoxBodyFrame";
import CompartmentStack from "../../../../../../../../Ui/canvas/templates/CompartmentStack/CompartmentStack";
import {
  INLINE_VALIDATION_POPUP_Z_INDEX,
  NODE_ABOVE_CONTENT_Z_INDEX,
} from "../../../../../../../config/editorUiConfig";
import { useInteractions } from "./useInteractions";

type MemberTableProps = {
  readonly view: Pick<ClassView, "classId" | "members">;
  readonly isSelected: boolean;
  readonly editingState: EditingState;
  readonly separatorColor?: string;
  readonly separatorThickness?: string;
  readonly separatorLineStyle: "solid" | "dashed" | "dotted";
  readonly inlineSurface?: string;
  readonly onTextBlockEditStart: (
    editingState: Exclude<EditingState, { readonly kind: "none" }>
  ) => void;
  readonly onTextBlockEditCancel: () => void;
  readonly onClassSelect: (classId: ClassId, additive: boolean) => void;
  readonly elementRef?: Ref<HTMLDivElement>;
};

export default function MemberTable({
  view,
  isSelected,
  separatorColor,
  separatorThickness,
  separatorLineStyle,
  inlineSurface,
  onTextBlockEditStart,
  onTextBlockEditCancel,
  elementRef,
}: MemberTableProps): ReactElement {
  const [discardErrors, setDiscardErrors] = useState<readonly string[]>([]);
  const fields = view.members.filter((member) => member.kind === "field");
  const methods = view.members.filter((member) => member.kind === "method");
  const { onMemberCommit, onMemberDelete, onMemberCreate, onMemberMove } = useInteractions(
    view.classId,
    onTextBlockEditCancel
  );

  const validation =
    discardErrors.length > 0 ? (
      <InlineValidationPopup
        messages={discardErrors}
        stacking={INLINE_VALIDATION_POPUP_Z_INDEX}
        onDismiss={() => setDiscardErrors([])}
      />
    ) : null;
  const fieldList = (
    <EditableTextList
      rows={toRows(fields)}
      addLabel="+ attribute"
      addTitle="Add attribute"
      validate={() => []}
      isEditable={isSelected}
      isEmphasisEditable
      actionStacking={NODE_ABOVE_CONTENT_Z_INDEX}
      validationStacking={INLINE_VALIDATION_POPUP_Z_INDEX}
      surface={inlineSurface}
      onRowCommit={(index, value, emphasis) => {
        const member = fields[index];
        const errors =
          value === ""
            ? onMemberDelete(member.kind, member.memberId)
            : onMemberCommit(member.kind, member.memberId, value, toClassifier(emphasis));
        if (errors.length > 0) setDiscardErrors(errors);
      }}
      onRowAdd={(value, emphasis) => {
        const errors = onMemberCreate("field", value, toClassifier(emphasis));
        if (errors.length > 0) setDiscardErrors(errors);
      }}
      onRowReorder={(from, to) => {
        const member = fields[from];
        if (!member) return;
        onMemberMove("field", fields, member.memberId, to);
      }}
      onEditStart={(target) => {
        onTextBlockEditStart(
          target === "new"
            ? { kind: "newMember", classId: view.classId, memberKind: "field" }
            : {
                kind: "member",
                classId: view.classId,
                memberKind: "field",
                memberId: fields[target].memberId,
              }
        );
      }}
      onEditEnd={onTextBlockEditCancel}
    />
  );
  const methodList = (
    <EditableTextList
      rows={toRows(methods)}
      addLabel="+ method"
      addTitle="Add member"
      validate={() => []}
      isEditable={isSelected}
      isEmphasisEditable
      actionStacking={NODE_ABOVE_CONTENT_Z_INDEX}
      validationStacking={INLINE_VALIDATION_POPUP_Z_INDEX}
      surface={inlineSurface}
      onRowCommit={(index, value, emphasis) => {
        const member = methods[index];
        const errors =
          value === ""
            ? onMemberDelete(member.kind, member.memberId)
            : onMemberCommit(member.kind, member.memberId, value, toClassifier(emphasis));
        if (errors.length > 0) setDiscardErrors(errors);
      }}
      onRowAdd={(value, emphasis) => {
        const errors = onMemberCreate("method", value, toClassifier(emphasis));
        if (errors.length > 0) setDiscardErrors(errors);
      }}
      onRowReorder={(from, to) => {
        const member = methods[from];
        if (!member) return;
        onMemberMove("method", methods, member.memberId, to);
      }}
      onEditStart={(target) => {
        onTextBlockEditStart(
          target === "new"
            ? { kind: "newMember", classId: view.classId, memberKind: "method" }
            : {
                kind: "member",
                classId: view.classId,
                memberKind: "method",
                memberId: methods[target].memberId,
              }
        );
      }}
      onEditEnd={onTextBlockEditCancel}
    />
  );

  return (
    <BoxBodyFrame validation={validation} elementRef={elementRef}>
      <CompartmentStack
        compartments={[fieldList, methodList]}
        separatorColor={separatorColor}
        separatorThickness={separatorThickness}
        separatorLineStyle={separatorLineStyle}
      />
    </BoxBodyFrame>
  );
}

function toRows(members: readonly ClassMemberView[]): readonly EditableTextListRow[] {
  return members.map((member) => ({
    text: member.text,
    emphasis: toEmphasis(member.classifier),
  }));
}

function toEmphasis(classifier: MemberClassifier | null): TextEmphasis | null {
  if (classifier === "static") return "underline";
  if (classifier === "abstract") return "italic";
  return null;
}

function toClassifier(emphasis: TextEmphasis | null): MemberClassifier | null {
  if (emphasis === "underline") return "static";
  if (emphasis === "italic") return "abstract";
  return null;
}
