/**
 * @behavior Namespace selection event routing.
 * @render Namespace hull box.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import type { NamespaceId } from "../../../../../../../shared/ids";
import type { Point, Rect } from "../../../../../../../shared/geometry";
import type { NamespaceView } from "../../../../../../views/schema";
import type { EditingState } from "../../../../../../state/editorStates";
import type { TransactionResult } from "../../../../../../commands/editorCommands";
import BoxInteractionOverlay from "../../../../../../../Ui/canvas/composites/BoxInteractionOverlay/BoxInteractionOverlay";
import type { ResizeHandle } from "../../../../../../../Ui/canvas/composites/BoxInteractionOverlay/BoxInteractionOverlay";
import InlineCommitTextField from "../../../../../../../Ui/canvas/composites/InlineCommitTextField/InlineCommitTextField";
import InlineValidationPopup from "../../../../../../../Ui/canvas/primitives/InlineValidationPopup/InlineValidationPopup";
import HullHeaderFrame from "../../../../../../../Ui/canvas/templates/HullHeaderFrame/HullHeaderFrame";
import HullSurfaceFrame from "../../../../../../../Ui/canvas/templates/HullSurfaceFrame/HullSurfaceFrame";
import {
  INLINE_VALIDATION_POPUP_Z_INDEX,
  NODE_ABOVE_CONTENT_Z_INDEX,
  NODE_BEHIND_CONTENT_Z_INDEX,
} from "../../../../../../config/editorUiConfig";
import { NAMESPACE_STYLE_CONSTANTS } from "../../../../../../config/styleConstants";
import { useInteractions } from "./useInteractions";

type NamespaceBoxProps = {
  readonly view: NamespaceView;
  readonly bounds: Rect;
  readonly isSelected: boolean;
  readonly isPendingMember: boolean;
  readonly onNamespaceSelect: (namespaceId: NamespaceId) => void;
  readonly onNamespaceResizeHandlePress: (
    namespaceId: NamespaceId,
    bounds: Rect,
    handle: ResizeHandle,
    screenPoint: Point
  ) => void;
  readonly editingState: EditingState;
  readonly onTextBlockEditStart: (
    editingState: Exclude<EditingState, { readonly kind: "none" }>
  ) => void;
  readonly onTextBlockEditCancel: () => void;
  readonly onNamespaceRenameCommitted: (
    result: TransactionResult,
    previousNamespaceId: NamespaceId
  ) => void;
};

export default function NamespaceBox({
  view,
  bounds,
  isSelected,
  isPendingMember,
  onNamespaceSelect,
  onNamespaceResizeHandlePress,
  editingState,
  onTextBlockEditStart,
  onTextBlockEditCancel,
  onNamespaceRenameCommitted,
}: NamespaceBoxProps): ReactElement {
  // State creation: local state - blur-discard validation messages for namespace name edits
  const [discardErrors, setDiscardErrors] = useState<readonly string[]>([]);

  // UI props derivation
  const strokeWidth = toCssLength(view.style?.strokeWidth ?? NAMESPACE_STYLE_CONSTANTS.strokeWidth);
  const selectionCenterOffset = toPixelLength(strokeWidth) + 2;
  const lineStyle = toCssLineStyle(
    view.style?.strokeDasharray ?? NAMESPACE_STYLE_CONSTANTS.strokeDasharray
  );

  // Event handler props derivation
  const { onNamespaceClick, onNamespacePress, onLabelClick, onLabelDoubleClick, onNameCommit } =
    useInteractions({
      namespaceId: view.namespaceId,
      isSelected,
      onNamespaceSelect,
      onTextBlockEditStart,
      onTextBlockEditCancel,
      onNamespaceRenameCommitted,
    });
  const onResizeGrab = (handle: ResizeHandle, point: Point) => {
    onNamespaceResizeHandlePress(view.namespaceId, bounds, handle, point);
  };

  return (
    <HullSurfaceFrame
      title={view.namespaceId}
      fill={view.style?.fill ?? NAMESPACE_STYLE_CONSTANTS.fill}
      stroke={view.style?.stroke ?? NAMESPACE_STYLE_CONSTANTS.stroke}
      strokeWidth={strokeWidth}
      lineStyle={lineStyle}
      color={view.style?.color ?? NAMESPACE_STYLE_CONSTANTS.color}
      onPressStart={onNamespacePress}
      onClick={onNamespaceClick}
    >
      {discardErrors.length > 0 ? (
        <InlineValidationPopup
          messages={discardErrors}
          stacking={INLINE_VALIDATION_POPUP_Z_INDEX}
          onDismiss={() => setDiscardErrors([])}
        />
      ) : null}
      <HullHeaderFrame>
        <InlineCommitTextField
          initialValue={view.label}
          displayText={view.label}
          onEditRequest={isSelected ? onLabelDoubleClick : onLabelClick}
          isEditing={
            editingState.kind === "namespaceName" && editingState.namespaceId === view.namespaceId
          }
          treatment="heading"
          validate={onNameCommit}
          ariaLabel="Namespace name"
          validationStacking={INLINE_VALIDATION_POPUP_Z_INDEX}
          surface={view.style?.fill ?? undefined}
          onCommit={onTextBlockEditCancel}
          onDiscard={(messages) => {
            setDiscardErrors(messages);
            onTextBlockEditCancel();
          }}
          onCancel={onTextBlockEditCancel}
        />
      </HullHeaderFrame>
      <BoxInteractionOverlay
        selected={isSelected}
        pending={isPendingMember}
        resizeVisible={isSelected}
        centerOffset={selectionCenterOffset}
        haloStacking={NODE_BEHIND_CONTENT_Z_INDEX}
        affordanceStacking={NODE_ABOVE_CONTENT_Z_INDEX}
        onResizeGrab={onResizeGrab}
      />
    </HullSurfaceFrame>
  );
}

function toCssLength(value: string): string {
  return /^-?(?:\d+|\d*\.\d+)$/.test(value.trim()) ? `${value.trim()}px` : value;
}

function toPixelLength(value: string): number {
  return Number.parseFloat(value);
}

function toCssLineStyle(value: string | null | undefined): "solid" | "dashed" | "dotted" {
  const normalized = value?.trim().replace(/\s+/g, " ");
  if (!normalized || normalized === "0" || normalized === "none") return "solid";
  return normalized.startsWith("1 ") ? "dotted" : "dashed";
}
