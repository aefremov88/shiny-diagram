# Write-Back Pipeline (translate → resolve)

> **Implementation state:** Current
> **Document state:** Current
> **Last reviewed:** 2026-07-14
> **Scope:** How a semantic `EditorCommand` becomes a `SourceEdit[]` transaction — the model it reads, the intent vocabulary between the two layers, each layer's responsibilities, and the management plane that catalogs every command's write rules.

## 1. Pipeline shape

A single semantic dispatch runs on one frozen parse snapshot:

```
parseDiagram(sourceText)
  → { graph: DiagramGraph, provenance: ProvenanceIndex }

translateCommands(transaction, graph, provenance[, sourceText])
  → WriteIntent[]        // logical operations in the reference domain

resolveIntents(intents, provenance, sourceText)
  → SourceEdit[]         // concrete range replacements
```

Invariants:

- **Single snapshot.** Every intent is translated and resolved against the same pre-edit `graph`/`provenance`. Intents never see each other's output; a whole-statement rewrite is `delete` + `insert` resolved atomically, not a mutate-then-reparse.
- **Ordered, not order-independent.** Intents are a sequence, not a set: co-located insertions are concatenated in intent order during resolution (see §5).
- **Layer boundary.** Translate owns Mermaid *content* — it produces `payload` text that is normalized to relative indentation, `\n`-joined, no EOL. Resolve owns *presentation* — coordinates, absolute indentation, EOL, and entry separators. `sourceText` is passed to translate only for workers that copy existing source (currently only class-duplicate); workers that allocate source identities additionally receive a transaction-scoped allocator (`TranslateContext`) that exposes only this transaction's claim bookkeeping and never graph state modified by earlier commands; all other workers operate purely on `graph` + `provenance`.

## 2. Model the pipeline reads

Two derived structures from parse, plus the source-coordinate primitives.

**`DiagramGraph`** (`Controller/model/diagramGraph.ts`) — the *semantic* structure. Answers "what exists and how it relates": classes (with typed members, visibility, static/abstract, optional spatial data, `parentNamespaceId`), namespaces, relationships, notes, style definitions, and style-application edges. It carries no source positions.

**`ProvenanceIndex`** (`Controller/model/provenanceIndex.ts`) — the *syntactic* structure. Answers "where is each written statement, and does it exist explicitly": per-kind maps from id to a record of `SourceSpan`s (`self`, `header`, `body`, `fields`). A missing record means the entity is implicit (e.g. a class that appears only in a relationship) and is therefore not anchorable. Members are split by source form into two maps — `blockMembers` (`+name` inside a class block) and `shortMembers` (`User : +name`, a top-level line) — so a member's form is structural, not a discriminant field.

**Source-coordinate primitives** (`Controller/model/sourceEdit.ts`):

```ts
type SourcePosition = { line: number; character: number };
type SourceSpan     = { start: SourcePosition; end: SourcePosition };
type SourceEdit     = { start: SourcePosition; end: SourcePosition; replacementText: string };
```

`SourceSpan` (formerly `SourceLocation`) is a span expressed through `SourcePosition`; it carries no cached `raw` text — substrings are sliced from `sourceText` when needed.

## 3. The intent vocabulary (`Controller/translate/writeIntent.ts`)

`WriteIntent` is the contract between the two layers. It is organized by the grammar unit each operation touches:

| Grammar unit | Meaning | Operations |
|---|---|---|
| **statement** | a self-contained line or block (class, namespace, member, relationship, style line, identity-bound spatial annotation, note, statement-bound note annotation) | `insertStatement`, `deleteStatement` |
| **entry** | a `key:value` pair inside a list (a style property) | `insertEntry`, `deleteEntry` |
| **clause** | an optional component of a statement, inserted and deleted whole | `insertClause`, `deleteClause` |
| **value** | a single overwrite-able span (a name, endpoint, coordinate, property value) | `replaceValue` |

Rule: statements, entries, and clauses can be inserted or deleted; a value can only be replaced — it cannot exist without its owning unit. There is **no** `replaceStatement` or `replaceClause`.

Pairing invariant: a statement-bound annotation (`@note:`) binds to the statement on the immediately following line and is written, moved, and deleted **as a pair** with it — translate emits both statement operations in the same transaction, and no operation may separate the pair.

The seven intents:

```ts
InsertStatementIntent = { kind: "insertStatement"; payload: string; anchor: StatementAnchor };
DeleteStatementIntent = { kind: "deleteStatement"; target: StatementRef };
InsertEntryIntent     = { kind: "insertEntry";     payload: string; anchor: EntryAnchor };
DeleteEntryIntent     = { kind: "deleteEntry";     target: EntryRef };
InsertClauseIntent    = { kind: "insertClause";    payload: string; anchor: ClauseAnchor };
DeleteClauseIntent    = { kind: "deleteClause";    target: ClauseRef };
ReplaceValueIntent    = { kind: "replaceValue";    payload: string; target: ValueRef };
```

**References** name parsed provenance areas in the logical domain (no coordinates):

- `StatementRef` — a whole statement (delete target / anchor sibling), e.g. `{ kind: "class", classId }`, `{ kind: "blockMember", memberId }`.
- `EntryRef` — a style property, e.g. `{ kind: "directStyleProperty", classId, property }`.
- `ClauseRef` — an optional statement component, e.g. `{ kind: "classGeneric", classId }`, `{ kind: "relationshipLabel", relationshipId }`.
- `ValueRef` — an overwrite-able span, e.g. `{ kind: "className", classId }`, `{ kind: "spatialCoord", target, coord }`.
- `BlockRef` — a container whose opening a first child inserts under: `diagram` | `class` | `namespace`.
- `StyleListRef` — a property list a first entry inserts into: `directStyle` | `styleDef`.

**Anchors** name where a new unit lands — always *after a point*:

```ts
StatementAnchor =
  | { kind: "afterSameKind";      statement: StatementRef }  // sibling, same kind → no blank line
  | { kind: "afterDifferentKind"; statement: StatementRef }  // sibling, other kind → blank line before
  | { kind: "atBlockOpening";     block: BlockRef };         // first child of a block

EntryAnchor =
  | { kind: "afterEntry";        entry: EntryRef }
  | { kind: "afterListOpening";  list: StyleListRef };

ClauseAnchor =
  { kind: "afterComponent"; clause: ClauseRef; component: ValueRef };
```

The same/different-kind distinction is a translate-time fact that drives resolve's blank-line policy — it lets resolve decide spacing without re-inspecting the payload.

## 4. Translate (`Controller/translate/`)

`translateCommands` (dispatcher) fans each `EditorCommand` out to a per-command translator in `workers/` — one translator per command; the full command → translator map and each translator's write rules are cataloged in the management plane (§7).

Workers emit intents by:

- **Composing content** — bare Mermaid syntax via `syntax/` composers (`spatialSyntax`, `styleSyntax`) and inline builders, normalized to relative indentation. Class-duplicate additionally slices the source block from `sourceText` and splices the new name at the `declaredName` span — a source copy, not a graph re-render, so all member fields and formatting are preserved.
- **Choosing anchors** via thin providers in `anchors/statementAnchors.ts` and `anchors/entryAnchors.ts`, composed by the worker with `??` fallback:
  - **Builders** locate a statement and return a raw `StatementRef | null`: `anchorAfterKindList(graph, provenance, scope, kinds)` (latest of a union of kinds in a scope), `anchorExactStatement` (a specific ref if it has a record).
  - **Labelers** tag a located ref with the blank-line policy: `asSameKind`, `asDifferentKind` (pass `null` through so they chain).
  - **Terminal** `anchorBlockOpening(scope)` returns `atBlockOpening`, never null.
  - Membership ("which block is a statement written in") is a pure function of the graph: classes/namespaces nest by `parentNamespaceId`, block-members live in their class, everything else is diagram-level (a Mermaid namespace body accepts only class declarations).

## 5. Resolve (`Controller/resolve/`)

`resolveIntents` (orchestrator) is a three-stage pipeline:

1. **Materialize** — each intent dispatched to its per-kind worker in `workers/` (`insertStatement`, `deleteStatement`, `insertEntry`, `deleteEntry`, `replaceValue`), producing one `SourceEdit`.
2. **Coalesce** — insertions sharing an exact position are concatenated in intent order (`coalesceInsertions`). This is required because the sink (`vscode.WorkspaceEdit`) applies the whole batch atomically against original coordinates; two zero-width edits at one offset would be an overlap. Concatenation makes their order deterministic (e.g. first-class-in-empty-diagram: declaration then spatial annotation).
3. **Assert** — the result is proven pairwise non-overlapping (`assertNoOverlaps`) before returning.

Workers delegate to helpers in `workers/helpers/`:

- **`resolveRefs.ts`** — resolves the `*Ref` family to a `SourceSpan` via provenance (`requireRecord(map.get(id)).span`); a missing record is a translate/provenance contract breach and throws.
- **`resolveAnchors.ts`** — resolves the `*Anchor` family to a concrete insertion *point*: position (folding the start/end choice in), the block indent, and `blankBefore` for statements; the separator for entries. Workers receive a ready insertion point and never re-inspect the anchor.
- **`textUtils.ts`** — string/position mechanics: line reads, indentation, EOL detection, position conversion, span slicing.

`resolveInsertStatement` prefixes each non-empty payload line with the anchor's absolute `indent` (the payload arrives relative), leads with EOL, and adds one extra EOL when `blankBefore`. `resolveDeleteStatement` removes the whole line/block and its trailing EOL; `resolveDeleteEntry` absorbs an adjacent separator comma; `resolveReplaceValue` overwrites the target span in place.

## 6. Worked example

Duplicating the first class in

```
classDiagram
    class ConversationThread {
        +UUID id
        +addMessage(TextMessage message) void
    }
```

- **Translate** emits an `insertStatement` whose `payload` is the source block sliced from `sourceText` with `ConversationThread` → `ConversationThread_1` (members verbatim, normalized to relative indent), anchored `afterSameKind` on the source class; plus a spatial-annotation `insertStatement` and, if present, a style `insertStatement`.
- **Resolve** re-indents the payload to the anchor base, leads with EOL, and (since the anchor is a same-kind sibling) adds no blank line. The result is a `ConversationThread_1` block byte-identical to the source except the name — visibility markers, `~TextMessage~`, and `void` all preserved.

## 7. Write-back management plane

Every translator carries its write rules as an annotation; a generated catalog aggregates them into one reviewable file. The annotation on the translator is the law; the catalog is its projection — never edited by hand.

### 7.1 Catalog

- **`webview/src/Controller/translate/WRITEBACK-CATALOG.md`** — one entry per `EditorCommand`, grouped by object family, each entry rendering: a link to the translator, its annotation verbatim, and the command's payload type sliced from `View/commands/editorCommands.ts`.
- Coverage is counted against the dispatcher: every command routed by `translateCommands` is an entry; an unannotated translator renders as a visible gap.

### 7.2 Annotation format

The annotation is the TSDoc block immediately before the exported translator function. It states the translator's writes — not its implementation — in one of three templates.

**All writes emitted:**

```
Makes <N> writes:                        // or: Makes <N> groups of writes:

1. <write>
2. <write>
```

**Exclusive options — top-down, first matching condition wins:**

```
Makes one of <N> write options:

a. <condition> → <write>
b. otherwise → Makes <N> writes:         // an option holding several writes nests
   1. <write>                            //   a full "Makes <N> writes:" / "Makes <N> groups of writes:" block
   2. <write>
```

**A write is one line plus placement bullets:**

```
<term> **<unit>** [, in **<scope>**] [, for every <item>] [(anchored at first match)]
- after <anchor>                         // waterfall: tried top-down, last line unconditional
- at block opening
```

- `<term> **<unit>**` pairs come from the closed lists in [Mermaid Vocabulary](./mermaid-vocabulary.md) — no improvised names:
  - **statement** — a statement term from Vocabulary §2.1, e.g. `class declaration **statement**`
  - **entry** — an entry term from Vocabulary §4.2, e.g. `style property **entry**`
  - **clause** — a clause term from Vocabulary §4.2, e.g. `relationship label **clause**`
  - **value** — a value term from Vocabulary §4.2, e.g. `class label **value**`
- `<scope>` names the receiving block (Vocabulary §1.2): **diagram body**, **namespace body**, or **class body**.
- `<anchor>` phrases locate statements by their §2.1 terms, e.g. `after the latest class declaration statement in scope`.
- Deletions read `<term> **statement** deleted`.
- `, for every <item>` is the iterator — one write per matching item, e.g. `, for every style application statement targeting the class`.
- No-op and error conditions are trailing prose lines.
- Conditions state observable source facts (existence, nullability) — never implementation.

Canonical examples: [`translateClassCreate`](../../../webview/src/Controller/translate/workers/Class/translateClassCreate.ts) (write-list with waterfalls), [`translateClassDirectStylePropertySet`](../../../webview/src/Controller/translate/workers/Class/translateClassDirectStylePropertySet.ts) (options across all three grammar units), [`translateNamespaceParentNamespaceSet`](../../../webview/src/Controller/translate/workers/Namespace/translateNamespaceParentNamespaceSet.ts) (iterator write), [`translateClassDelete`](../../../webview/src/Controller/translate/workers/Class/translateClassDelete.ts) (groups of deletions), [`translateRelationshipLabelSet`](../../../webview/src/Controller/translate/workers/Relationship/translateRelationshipLabelSet.ts) (option with nested write-list).

### 7.3 Generation and checks

- **`scripts/planes/writeback-catalog.mjs`** generates the catalog; regenerate with `npm run planes -- writeback-catalog`.
- **`npm run check:planes`** (part of `npm run check`) fails on: a stale committed catalog, a dispatcher command without an annotated translator, and annotation blocks violating the format above.
