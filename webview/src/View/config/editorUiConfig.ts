/**
 * @fileoverview UI constants shared across Shiny View editor interactions.
 */

export const DUPLICATE_OFFSET = 24;

export const LAYOUT_CLASS_HEADER_HEIGHT = 42;
export const LAYOUT_MEMBER_ROW_HEIGHT = 23;
export const LAYOUT_CLASS_BODY_VERTICAL_PADDING = 12;
export const LAYOUT_CLASS_ADD_MEMBER_AFFORDANCE_HEIGHT = 14;
export const LAYOUT_CLASS_MEMBER_COMPARTMENT_COUNT = 2;
export const LAYOUT_CLASS_COMPARTMENT_SEPARATOR_HEIGHT = 1;
export const LAYOUT_CLASS_OUTER_BORDER_HEIGHT = 2;
export const LAYOUT_CLASS_CHAR_WIDTH = 8;
export const LAYOUT_CLASS_PREFIX_WIDTH = 28;
export const LAYOUT_CLASS_HORIZONTAL_PADDING = 28;
export const LAYOUT_CLASS_MIN_WIDTH = 160;
export const LAYOUT_CLASS_MAX_WIDTH = 420;
export const LAYOUT_NOTE_WIDTH = 180;
export const LAYOUT_NOTE_CHARS_PER_LINE = 24;
export const LAYOUT_NOTE_LINE_HEIGHT = 20;
export const LAYOUT_NOTE_PADDING = 24;
export const LAYOUT_DAGRE_NODE_SEPARATION = 50;
export const LAYOUT_DAGRE_RANK_SEPARATION = 60;
export const LAYOUT_DAGRE_EDGE_SEPARATION = 10;
export const LAYOUT_DAGRE_MARGIN_X = 40;
export const LAYOUT_DAGRE_MARGIN_Y = 40;
export const INCREMENTAL_LAYOUT_MARKED_EDGE_WEIGHT = 3;
export const INCREMENTAL_LAYOUT_UNMARKED_EDGE_WEIGHT = 1;
export const INCREMENTAL_LAYOUT_WRONG_SIDE_MULTIPLIER = 3;
export const INCREMENTAL_LAYOUT_BBOX_GROWTH_WEIGHT = 0.02;
export const INCREMENTAL_LAYOUT_OWN_NAMESPACE_BONUS = 20_000;
export const INCREMENTAL_LAYOUT_MIN_GAP_RATIO = 0.25;
export const INCREMENTAL_LAYOUT_CANDIDATE_PITCH = 50;
export const INCREMENTAL_LAYOUT_WINDOW_SIZE_MULTIPLIER = 3;
export const INCREMENTAL_LAYOUT_MAX_WINDOW_WIDENINGS = 3;

export const PLACEMENT_OVERLAY_DRAG_THRESHOLD = 4;
export const DIAGRAM_EMPTY_STATE_Z_INDEX = 5; // Product-asserted empty-state plane above the canvas.
export const PLACEMENT_OVERLAY_Z_INDEX = 20; // Product-asserted active gesture plane.
export const INLINE_VALIDATION_POPUP_Z_INDEX = 10000; // Framework-imposed escape plane above React Flow stacking.
export const NODE_BEHIND_CONTENT_Z_INDEX = -1; // Product-asserted plane behind node content.
export const NODE_ABOVE_CONTENT_Z_INDEX = 2; // Product-asserted plane above node content.
export const CHROME_PANE_EDGE_CONTROL_ABOVE_PANE_Z_INDEX = 5; // Product-asserted pane-edge control plane above pane content.
export const CHROME_MENU_ABOVE_CONTROL_Z_INDEX = 10; // Product-asserted menu plane above its chrome control.
export const CHROME_SELECTOR_POPUP_ABOVE_CONTROL_Z_INDEX = 100; // Product-asserted selector-popup plane above its chrome control.
export const CHROME_VALIDATION_ABOVE_CONTROL_Z_INDEX = 10000; // Product-asserted validation plane above its chrome control.
export const TOOL_PANE_WIDTH = 96;
export const EDIT_PANE_WIDTH = 200;
export const EXPORT_IMAGE_MARGIN = 40;
export const EXPORT_IMAGE_PIXEL_RATIO = 2;
export const CLASS_BOX_MIN_WIDTH = 80;
export const CLASS_BOX_MIN_HEIGHT = 48;
export const CLASS_BOX_HEADER_MIN_HEIGHT = 42;
export const CLASS_DEFAULT_STROKE_WIDTH = "1px";
export const DEFAULT_STROKE_DASHARRAY = "0";

export const DEFAULT_NOTE_WIDTH = 180;
export const DEFAULT_NOTE_HEIGHT = 96;
export const NOTE_MIN_WIDTH = 120;
export const NOTE_MIN_HEIGHT = 64;
export const UNANNOTATED_NOTE_MARGIN = 48;
export const UNANNOTATED_NOTE_STACK_GAP = 18;
export const NOTE_ATTACH_GHOST_Z_INDEX = 40; // Product-asserted note attachment preview plane.

export const RELATIONSHIP_RECONNECT_RADIUS = 16;
export const RELATIONSHIP_EDGE_MULTIPLICITY_NORMAL_OFFSET = 10;
export const RELATIONSHIP_EDGE_MULTIPLICITY_POSITION_FRACTION = 0.3;

export const NAMESPACE_MARGIN = 32;
export const NAMESPACE_DEFAULT_STROKE_WIDTH = 1;
export const NAMESPACE_NODE_Z_INDEX = 0; // Framework-imposed React Flow node ordering.
export const RELATIONSHIP_EDGE_Z_INDEX = 1; // Framework-imposed plane above namespace hulls and below content nodes.
export const CLASS_NODE_Z_INDEX = 10; // Framework-imposed React Flow node ordering.
export const NOTE_NODE_Z_INDEX = 12; // Framework-imposed React Flow node ordering.
export const NAMESPACE_GESTURE_Z_INDEX = 30; // Framework-imposed plane above React Flow nodes.
