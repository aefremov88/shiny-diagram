/**
 * @behavior Class member edit, create, delete, move, and edit-state cancellation semantic handlers.
 */

import { useCallback } from "react";
import type { AttributeId, ClassId, MethodId } from "../../../../../../../../shared/ids";
import type { MemberClassifier, MemberKind } from "../../../../../../../../shared/uml";
import { useDispatchTransaction } from "../../../../../../../contexts";
import {
  toMemberCommitTransaction,
  toMemberCreateTransaction,
  toMemberDeleteTransaction,
  toMemberMoveTransaction,
} from "./transactions";
import type { ClassMemberView } from "../../../../../../../views/schema";
import { logAction } from "../../../../../../../../shared/logging";

type Interactions = {
  readonly onMemberCommit: (
    memberKind: MemberKind,
    memberId: AttributeId | MethodId,
    text: string,
    classifier: MemberClassifier | null
  ) => readonly string[];
  readonly onMemberDelete: (
    memberKind: MemberKind,
    memberId: AttributeId | MethodId
  ) => readonly string[];
  readonly onMemberCreate: (
    memberKind: MemberKind,
    text: string,
    classifier: MemberClassifier | null
  ) => readonly string[];
  readonly onMemberMove: (
    memberKind: MemberKind,
    members: readonly ClassMemberView[],
    draggedMemberId: AttributeId | MethodId,
    dropGap: number
  ) => void;
};

export function useInteractions(classId: ClassId, onTextBlockEditCancel: () => void): Interactions {
  const dispatchTransaction = useDispatchTransaction();

  const onMemberCommit = useCallback(
    (
      memberKind: MemberKind,
      memberId: AttributeId | MethodId,
      text: string,
      classifier: MemberClassifier | null
    ) => {
      logAction(`${memberKind}-set`, memberId, { text, classifier });
      const result = dispatchTransaction(
        toMemberCommitTransaction(classId, memberKind, memberId, text, classifier)
      );
      if (result.status === "rejected") return result.errors.map((error) => error.message);
      onTextBlockEditCancel();
      return [];
    },
    [classId, dispatchTransaction, onTextBlockEditCancel]
  );

  const onMemberDelete = useCallback(
    (memberKind: MemberKind, memberId: AttributeId | MethodId) => {
      logAction(`${memberKind}-delete`, memberId);
      const result = dispatchTransaction(toMemberDeleteTransaction(memberKind, memberId));
      if (result.status === "rejected") return result.errors.map((error) => error.message);
      onTextBlockEditCancel();
      return [];
    },
    [dispatchTransaction, onTextBlockEditCancel]
  );

  const onMemberCreate = useCallback(
    (memberKind: MemberKind, text: string, classifier: MemberClassifier | null) => {
      logAction(`${memberKind}-create`, classId, { text, classifier });
      const result = dispatchTransaction(
        toMemberCreateTransaction(classId, memberKind, text, classifier)
      );
      if (result.status === "rejected") return result.errors.map((error) => error.message);
      onTextBlockEditCancel();
      return [];
    },
    [classId, dispatchTransaction, onTextBlockEditCancel]
  );

  const onMemberMove = useCallback(
    (
      memberKind: MemberKind,
      members: readonly ClassMemberView[],
      draggedMemberId: AttributeId | MethodId,
      dropGap: number
    ) => {
      const transaction = toMemberMoveTransaction(
        classId,
        memberKind,
        members,
        draggedMemberId,
        dropGap
      );
      if (transaction.length === 0) return;
      logAction(`${memberKind}-move`, draggedMemberId, { dropGap });
      dispatchTransaction(transaction);
    },
    [classId, dispatchTransaction]
  );

  return { onMemberCommit, onMemberDelete, onMemberCreate, onMemberMove };
}
