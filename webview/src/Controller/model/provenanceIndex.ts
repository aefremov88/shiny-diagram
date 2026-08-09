/**
 * @fileoverview
 * `ProvenanceIndex` — source areas for addressable `DiagramGraph` facts.
 *
 * `DiagramGraph` is the meaning half of parse output; provenance is the source
 * half. Both are keyed by the same ids. A writeback address asks for a parsed
 * syntax area such as "User's class declaration", "User's class body", or
 * "the fill value in User's style line"; a record here answers with
 * `SourceSpan`s.
 *
 * Provenance stores parsed syntax areas, not write anchors. The translate layer
 * reads these records to choose Mermaid syntax and derive logical write
 * locations; the resolve layer turns those locations into concrete `SourceEdit`s
 * by applying source positions, indentation, EOL, and conflict checks.
 *
 * Record convention:
 *   - `self` is the whole source area for a fact, used for move/delete/replace;
 *   - structural areas (`header`, `body`, `propertyList`) are explicit because
 *     braces and inline syntax can vary;
 *   - `fields` contains token/value ranges for surgical patches;
 *   - absence is meaningful: implicit classes, unstyled classes, and missing
 *     style properties have no source area yet, so translation synthesizes one.
 *
 * Records do not store indentation. Resolution derives indentation from the
 * referenced source line.
 *
 * Not yet produced: some element decorator properties are missing.
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
import type { SourceSpan } from "./sourceEdit";

// ============================================================================
// Diagram
// ============================================================================

/** The parsed class diagram area. `body` is the top-level diagram interior. */
export type DiagramRecord = {
  readonly self: SourceSpan;
  readonly header: SourceSpan; // `classDiagram`
  readonly body: SourceSpan;
  readonly direction: SourceSpan | null;
  readonly configDirectives: readonly SourceSpan[];
};

// ============================================================================
// Classes
// ============================================================================

/** A class with a declaration in source. Missing map entry means implicit class. */
export type ClassRecord = {
  readonly self: SourceSpan; // line for simple form, whole brace block for block form
  readonly header: SourceSpan; // declaration/header line
  readonly body: SourceSpan | null; // interior of `{ ... }`, only for block form
  readonly fields: {
    readonly declaredName: SourceSpan; // `User` in `class User`
    readonly genericType?: SourceSpan; // `~T~` in `class Box~T~`
    readonly label?: SourceSpan; // `"Human User"` in `class User["Human User"]`
    readonly labelFull?: SourceSpan; // `["Human User"]`
    readonly annotation?: SourceSpan; // `<<Interface>>` line inside class block
  };
};

// ============================================================================
// Namespaces
// ============================================================================

/** A namespace declaration block: `namespace Domain { ... }`. */
export type NamespaceRecord = {
  readonly self: SourceSpan;
  readonly header: SourceSpan;
  readonly body: SourceSpan;
  readonly fields: {
    readonly declaredName: SourceSpan;
  };
};

/** A namespace style annotation line: `%% @style:Domain fill=...`. */
export type NamespaceStyleRecord = {
  readonly self: SourceSpan;
  readonly fields: {
    readonly target: SourceSpan;
    readonly propertyList: SourceSpan;
  };
};

// ============================================================================
// Members (attributes, methods)
// ============================================================================

/** A member inside a class block: `+string name`. */
export type BlockMemberRecord = {
  readonly self: SourceSpan;
  readonly fields: {
    readonly text: SourceSpan;
  };
};

/** A member as a short-form line: `User : +string name`. */
export type ShortMemberRecord = {
  readonly self: SourceSpan;
  readonly fields: {
    readonly owner: SourceSpan; // `User` in `User : ...`
    readonly text: SourceSpan;
  };
};

// ============================================================================
// Relationships
// ============================================================================

/** A relationship line: `User "1" --> "*" Session : owns`. */
export type RelationshipRecord = {
  readonly self: SourceSpan;
  readonly fields: {
    readonly sourceEndpoint: SourceSpan;
    readonly sourceMultiplicity?: SourceSpan;
    readonly operator: SourceSpan; // `-->`, `<|--`, `*--`, `..>`, etc.
    readonly targetMultiplicity?: SourceSpan;
    readonly targetEndpoint: SourceSpan;
    readonly label?: SourceSpan; // text after `:`, when present
  };
};

/** A canonical lollipop-interface line: `Api ()-- User` or `User --() Api`. */
export type LollipopInterfaceRecord = {
  readonly self: SourceSpan;
  readonly fields: {
    readonly label: SourceSpan;
  };
};

// ============================================================================
// Styles
// ============================================================================

/** A single style property. `entry` is the whole `fill:#f9f` pair (delete
 *  target); `value` is just the `#f9f` span (replace target). */
export type StylePropertyField = {
  readonly entry: SourceSpan;
  readonly value: SourceSpan;
};

export type StylePropertyFields = Partial<Record<StylePropertyName, StylePropertyField>>;

/** A class direct-style line: `style User fill:#f9f,stroke:#333`. `propertyList`
 *  is the whole comma-separated list area; a first entry inserts after its
 *  opening, subsequent entries after an existing property `entry`. */
export type ClassDirectStyleRecord = {
  readonly self: SourceSpan;
  readonly fields: {
    readonly target: SourceSpan; // `User` in `style User ...`
    readonly propertyList: SourceSpan; // `fill:#f9f,stroke:#333`
    readonly properties: StylePropertyFields;
  };
};

/** A style-definition line: `classDef Important fill:#f9f`. */
export type StyleDefRecord = {
  readonly self: SourceSpan;
  readonly fields: {
    readonly declaredName: SourceSpan; // `Important` in `classDef Important ...`
    readonly propertyList: SourceSpan;
    readonly properties: StylePropertyFields;
  };
};

/** A style-application line: `class User:::Important` / `cssClass "User" Important`. */
export type StyleApplicationRecord = {
  readonly self: SourceSpan;
  readonly fields: {
    readonly target: SourceSpan; // applied-to class token
    readonly styleName: SourceSpan; // applied style token
  };
};

// ============================================================================
// Spatial annotations (Shiny)
// ============================================================================

/** A spatial annotation line: `%% @spatial:User x=.. y=.. w=.. h=..`. */
export type SpatialRecord = {
  readonly self: SourceSpan;
  readonly fields: {
    readonly target: SourceSpan;
    readonly x: SourceSpan;
    readonly y: SourceSpan;
    readonly w: SourceSpan;
    readonly h: SourceSpan;
  };
};

// ============================================================================
// Notes
// ============================================================================

/** A note line/block: `note for User "text"`. */
export type NoteRecord = {
  readonly self: SourceSpan;
  readonly fields: {
    readonly text: SourceSpan;
  };
};

export type ProvenanceIndex = {
  /** Class diagram header/body/source area. */
  readonly diagram: DiagramRecord;

  /** Explicit class declarations only. Missing class record means implicit class. */
  readonly classes: ReadonlyMap<ClassId, ClassRecord>;

  /** Namespace blocks. */
  readonly namespaces: ReadonlyMap<NamespaceId, NamespaceRecord>;

  /** Namespace style annotation lines. */
  readonly namespaceStyles: ReadonlyMap<NamespaceId, NamespaceStyleRecord>;

  /** Attribute and method lines inside a class block. */
  readonly blockMembers: ReadonlyMap<AttributeId | MethodId, BlockMemberRecord>;

  /** Top-level short-form attribute and method lines. */
  readonly shortMembers: ReadonlyMap<AttributeId | MethodId, ShortMemberRecord>;

  /** Relationship lines. */
  readonly relationships: ReadonlyMap<RelationshipId, RelationshipRecord>;

  /** Canonical lollipop-interface relationship lines stored as class properties. */
  readonly lollipopInterfaces: ReadonlyMap<LollipopInterfaceId, LollipopInterfaceRecord>;

  /** Style lines. */
  readonly classDirectStyles: ReadonlyMap<ClassId, ClassDirectStyleRecord>;
  readonly styleDefinitions: ReadonlyMap<StyleDefId, StyleDefRecord>;
  readonly styleApplications: ReadonlyMap<StyleApplicationId, StyleApplicationRecord>;

  /** Spatial annotation lines. */
  readonly classSpatial: ReadonlyMap<ClassId, SpatialRecord>;
  readonly noteAnnotations: ReadonlyMap<NoteId, SpatialRecord>;

  /** Note lines/blocks. */
  readonly notes: ReadonlyMap<NoteId, NoteRecord>;
};

export type { SourceSpan } from "./sourceEdit";
