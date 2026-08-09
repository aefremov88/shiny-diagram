/**
 * @behavior Class content-height measurement, resize dispatch, and header blur-discard popup state.
 * @render Class-box node.
 */

import type { MouseEvent, ReactElement } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import ReactFlowConnectionHandlesAdapter from "./ReactFlowConnectionHandlesAdapter/ReactFlowConnectionHandlesAdapter";
import MemberTable from "./MemberTable/MemberTable";
import { useInteractions } from "./useInteractions";
import BoxInteractionOverlay from "../../../../../../../Ui/canvas/composites/BoxInteractionOverlay/BoxInteractionOverlay";
import type { ResizeHandle } from "../../../../../../../Ui/canvas/composites/BoxInteractionOverlay/BoxInteractionOverlay";
import InlineCommitTextField from "../../../../../../../Ui/canvas/composites/InlineCommitTextField/InlineCommitTextField";
import BoxHeaderFrame from "../../../../../../../Ui/canvas/templates/BoxHeaderFrame/BoxHeaderFrame";
import StyledBoxSurfaceFrame from "../../../../../../../Ui/canvas/templates/StyledBoxSurfaceFrame/StyledBoxSurfaceFrame";
import type { Point, Rect } from "../../../../../../../shared/geometry";
import type { ClassId } from "../../../../../../../shared/ids";
import type { EditingState } from "../../../../../../state/editorStates";
import type { ClassView } from "../../../../../../views/schema";
import { CLASS_STYLE_CONSTANTS } from "../../../../../../config/styleConstants";
import {
  CLASS_BOX_HEADER_MIN_HEIGHT,
  INLINE_VALIDATION_POPUP_Z_INDEX,
  NODE_ABOVE_CONTENT_Z_INDEX,
  NODE_BEHIND_CONTENT_Z_INDEX,
} from "../../../../../../config/editorUiConfig";
import InlineValidationPopup from "../../../../../../../Ui/canvas/primitives/InlineValidationPopup/InlineValidationPopup";
import { STYLE_PROPERTIES } from "../../../../../../../shared/style";

type ClassBoxProps = {
  readonly view: ClassView;
  readonly bounds: Rect;
  readonly isSelected: boolean;
  readonly isDragging: boolean;
  readonly isResizeVisible: boolean;
  readonly isConnectSourceEnabled: boolean;
  readonly isPendingMember: boolean;
  readonly haloColor: string | null;
  readonly haloTone: "canvas" | "faint" | null;
  readonly onClassSelect: (classId: ClassId, additive: boolean) => void;
  readonly onClassResizeHandlePress: (
    classId: ClassId,
    bounds: Rect,
    handle: ResizeHandle,
    screenPoint: Point
  ) => void;
  readonly editingState: EditingState;
  readonly onTextBlockEditStart: (
    editingState: Exclude<EditingState, { readonly kind: "none" }>
  ) => void;
  readonly onTextBlockEditCancel: () => void;
  readonly onContentHeightChange: (classId: ClassId, height: number) => void;
};

type ConnectionHandleDescriptor = {
  readonly id: string;
  readonly direction: "source" | "target";
  readonly side: "top" | "right" | "bottom" | "left";
};

const CONNECTION_HANDLES: readonly ConnectionHandleDescriptor[] = [
  { id: "top", direction: "source", side: "top" },
  { id: "right", direction: "source", side: "right" },
  { id: "bottom", direction: "source", side: "bottom" },
  { id: "left", direction: "source", side: "left" },
  { id: "target-top", direction: "target", side: "top" },
  { id: "target-right", direction: "target", side: "right" },
  { id: "target-bottom", direction: "target", side: "bottom" },
  { id: "target-left", direction: "target", side: "left" },
];

export default function ClassBox({
  view,
  bounds,
  isSelected,
  isDragging,
  isResizeVisible,
  isConnectSourceEnabled,
  isPendingMember,
  haloColor,
  haloTone,
  onClassSelect,
  onClassResizeHandlePress,
  editingState,
  onTextBlockEditStart,
  onTextBlockEditCancel,
  onContentHeightChange,
}: ClassBoxProps): ReactElement {
  // State creation: local state - blur-discard validation messages for header direct edits
  const [headerDiscardErrors, setHeaderDiscardErrors] = useState<readonly string[]>([]);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const header = headerRef.current;
    const body = bodyRef.current;
    if (!frame || !header || !body) return undefined;
    const measure = () => {
      const style = window.getComputedStyle(frame);
      const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      onContentHeightChange(
        view.classId,
        Math.ceil(header.offsetHeight + body.offsetHeight + borders)
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    observer.observe(body);
    return () => observer.disconnect();
  }, [onContentHeightChange, view.classId]);

  // Event handler props derivation
  const { onClassBoxClick, onHeaderCommit } = useInteractions(view.classId, onClassSelect);

  // UI props derivation
  const resolvedStyle = Object.fromEntries(
    STYLE_PROPERTIES.flatMap(({ name }) => {
      return [[name, view.style?.[name] ?? CLASS_STYLE_CONSTANTS[name]]];
    })
  );
  const separatorColor = resolvedStyle.stroke;
  const separatorThickness = toCssLength(resolvedStyle.strokeWidth);
  const separatorThicknessPixels = toPixelLength(separatorThickness);
  const selectionCenterOffset =
    separatorThicknessPixels === undefined ? undefined : separatorThicknessPixels + 2;
  const separatorLineStyle = toCssLineStyle(resolvedStyle.strokeDasharray);

  const onResizeGrab = (handle: ResizeHandle, point: Point) => {
    onClassResizeHandlePress(view.classId, bounds, handle, point);
  };

  const requestHeaderEdit =
    (block: "annotation" | "name" | "label") => (event: MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (isSelected) {
        onTextBlockEditStart({ kind: "header", classId: view.classId, block });
      } else {
        onClassSelect(view.classId, false);
      }
    };

  const annotation = view.header.stereotype ? (
    <InlineCommitTextField
      initialValue={view.header.stereotype}
      displayText={`<<${view.header.stereotype}>>`}
      onEditRequest={requestHeaderEdit("annotation")}
      isEditing={isHeaderEditing(editingState, view.classId, "annotation")}
      isEditEnabled={isSelected}
      treatment="secondary"
      validate={(text) => onHeaderCommit("annotation", text.trim() || null)}
      ariaLabel="Annotation"
      validationStacking={INLINE_VALIDATION_POPUP_Z_INDEX}
      surface={resolvedStyle.fill}
      onCommit={onTextBlockEditCancel}
      onDiscard={(messages) => {
        setHeaderDiscardErrors(messages);
        onTextBlockEditCancel();
      }}
      onCancel={onTextBlockEditCancel}
    />
  ) : null;
  const name = (
    <InlineCommitTextField
      initialValue={view.header.name}
      displayText={view.header.name}
      onEditRequest={requestHeaderEdit("name")}
      isEditing={isHeaderEditing(editingState, view.classId, "name")}
      isEditEnabled={isSelected}
      treatment="primary"
      validate={(text) => onHeaderCommit("name", text.trim())}
      ariaLabel="Class name"
      validationStacking={INLINE_VALIDATION_POPUP_Z_INDEX}
      surface={resolvedStyle.fill}
      onCommit={onTextBlockEditCancel}
      onCancel={onTextBlockEditCancel}
      onDiscard={(messages) => {
        setHeaderDiscardErrors(messages);
        onTextBlockEditCancel();
      }}
    />
  );
  const label =
    view.header.label !== view.header.name ? (
      <InlineCommitTextField
        initialValue={view.header.label}
        displayText={`as ${view.header.label}`}
        onEditRequest={requestHeaderEdit("label")}
        isEditing={isHeaderEditing(editingState, view.classId, "label")}
        isEditEnabled={isSelected}
        treatment="secondary"
        validate={(text) => onHeaderCommit("label", text.trim() || null)}
        ariaLabel="Class label"
        validationStacking={INLINE_VALIDATION_POPUP_Z_INDEX}
        surface={resolvedStyle.fill}
        onCommit={onTextBlockEditCancel}
        onCancel={onTextBlockEditCancel}
        onDiscard={(messages) => {
          setHeaderDiscardErrors(messages);
          onTextBlockEditCancel();
        }}
      />
    ) : null;

  return (
    <StyledBoxSurfaceFrame
      elementRef={frameRef}
      title={view.classId}
      fill={resolvedStyle.fill}
      stroke={resolvedStyle.stroke}
      strokeWidth={separatorThickness}
      lineStyle={separatorLineStyle}
      color={resolvedStyle.color}
      dragging={isDragging}
      placementCursor={isConnectSourceEnabled}
      onClick={onClassBoxClick}
    >
      <BoxInteractionOverlay
        selected={isSelected}
        pending={isPendingMember}
        resizeVisible={isResizeVisible}
        centerOffset={selectionCenterOffset}
        haloTint={haloColor ?? undefined}
        haloTone={haloTone ?? undefined}
        haloStacking={NODE_BEHIND_CONTENT_Z_INDEX}
        affordanceStacking={NODE_ABOVE_CONTENT_Z_INDEX}
        onResizeGrab={onResizeGrab}
      />
      <ReactFlowConnectionHandlesAdapter
        handles={CONNECTION_HANDLES}
        isConnectSourceEnabled={isConnectSourceEnabled}
      />
      <BoxHeaderFrame
        elementRef={headerRef}
        minHeight={CLASS_BOX_HEADER_MIN_HEIGHT}
        separatorColor={separatorColor}
        separatorThickness={separatorThickness}
        separatorLineStyle={separatorLineStyle}
        validation={
          headerDiscardErrors.length > 0 ? (
            <InlineValidationPopup
              messages={headerDiscardErrors}
              stacking={INLINE_VALIDATION_POPUP_Z_INDEX}
              onDismiss={() => setHeaderDiscardErrors([])}
            />
          ) : undefined
        }
        leading={annotation}
        primary={name}
        trailing={label}
      />
      <MemberTable
        elementRef={bodyRef}
        view={{ classId: view.classId, members: view.members }}
        isSelected={isSelected}
        separatorColor={separatorColor}
        separatorThickness={separatorThickness}
        separatorLineStyle={separatorLineStyle}
        inlineSurface={resolvedStyle.fill}
        editingState={editingState}
        onTextBlockEditStart={onTextBlockEditStart}
        onTextBlockEditCancel={onTextBlockEditCancel}
        onClassSelect={onClassSelect}
      />
    </StyledBoxSurfaceFrame>
  );
}

function toCssLength(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return /^-?(?:\d+|\d*\.\d+)$/.test(value.trim()) ? `${value.trim()}px` : value;
}

function toPixelLength(value: string | undefined): number | undefined {
  if (!value || !/^-?(?:\d+|\d*\.\d+)(?:px)?$/.test(value.trim())) return undefined;
  return Number.parseFloat(value);
}

function toCssLineStyle(value: string | null | undefined): "solid" | "dashed" | "dotted" {
  const normalized = value?.trim().replace(/\s+/g, " ");
  if (!normalized || normalized === "0" || normalized === "none") return "solid";
  return normalized.startsWith("1 ") ? "dotted" : "dashed";
}

function isHeaderEditing(
  editingState: EditingState,
  classId: ClassId,
  block: "annotation" | "name" | "label"
): boolean {
  return (
    editingState.kind === "header" &&
    editingState.classId === classId &&
    editingState.block === block
  );
}
