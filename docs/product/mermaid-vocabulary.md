# Mermaid Vocabulary (class diagrams)

> **Kind:** Defining  
> **Document state:** Maintained  
> **Implementation state:** Implemented  
> **Last reviewed:** 2026-08-18  
> **Scope:** Defines the source language Shiny reads and writes — Mermaid class diagrams plus the Shiny annotation dialect: its grammar and its boundary (invalid language).  

## 1. Ontology

### 1.1 Token categories

A token's category is its function in place; the same glyph may serve different categories in different positions.

| Category | Function | Inventory |
| --- | --- | --- |
| keyword | names the kind of the statement it opens | Mermaid: `classDiagram` `class` `namespace` `note` `classDef` `style` <br> Shiny dialect: `@spatial:` `@style:` `@note:` |
| identifier | denotes a diagram element | any name the author writes: class names, namespace paths, style definition names |
| selective operator | relates or modifies the components adjacent to it; chosen from a closed set of alternatives | relationship: `<\|--` `*--` `o--` `-->` `--` `..>` `..\|>` `..` (arrowheads may appear on both ends) <br> classifier: `*` `$` |
| fixed operator | relates or modifies the components adjacent to it; the only legal token at its position | application: `:::` <br> attachment: `:` `for` <br> assignment: `=` |
| literal | carries verbatim text or numbers; no language function | any text or number the author writes: `User account`, `1..*`, `#f00`, `interface` |
| property name | names the property an entry assigns | style properties `fill` `color` ..., coordinates `x` `y` `w` `h` |
| delimiter | bounds or separates structure; nothing more | `{ }` `[ ]` `~ ~` `<< >>` `" "` `,` `%%` |

**value** = identifier ∪ literal ∪ selective operator — the tokens that the author chooses.

### 1.2 Syntactic categories

| Category  | Meaning                                                                                        | Examples                                 |
| --------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------- |
| clause    | a literal enclosed in a delimiter pair, forming one component with one meaning. Often optional | `~T~`, `["User account"]`, `"1..*"`      |
| entry     | a property name and a literal, joined by a assignement operator `:`/`=`                        | `fill:#f00`, `x=0`                       |
| list      | a `,`-separated sequence of any number of entries                                              | `fill:#f00,color:#fff`                   |
| block     | a body of statements                                                                           | class body, namespace body, diagram body |
| statement | a self-contained unit of code within its scope; simple, or opening a block                     | `class User`, `namespace Domain { ... }` |

### 1.3 Identity

- A **class identifier** is a bare name, diagram-global. Which body its declaration sits in is a containment fact, not part of the identifier.
- A **namespace identifier** is a dotted path: `Domain.Sub`. Renaming or moving a namespace renames every descendant path — and every reference spelling those paths.
- Members, relationships, notes, and style applications bind no identifier; they are identified by content and position.

## 2. Statements

### 2.1 List of statements

| Statement                            | Example                              | Written in                   |
| ------------------------------------ | ------------------------------------ | ---------------------------- |
| config directive statement           | `%%{init: { "theme": "dark" }}%%`    | file root, before the diagram statement |
| diagram statement                    | `classDiagram`                       | file root                    |
| direction statement                  | `direction LR`                       | diagram body                 |
| class declaration statement          | `class User { ... }`                 | diagram body, namespace body |
| namespace declaration statement      | `namespace Domain { ... }`           | diagram body, namespace body |
| block member statement               | `+name`                              | class body                   |
| short member statement               | `User : +name`                       | diagram body                 |
| class annotation statement           | `<<interface>>`                      | class body                   |
| relationship statement               | `User --> Order : places`            | diagram body                 |
| lollipop interface statement         | `Service ()-- Client`                | diagram body                 |
| style definition statement           | `classDef warning fill:#f00`         | diagram body                 |
| style application statement          | `class User:::warning`               | diagram body                 |
| direct style statement               | `style User fill:#fff`               | diagram body                 |
| namespace style annotation statement | `%% @style:Domain.Sub fill=blue`     | diagram body                 |
| spatial annotation statement         | `%% @spatial:User x=0 y=0 w=10 h=10` | diagram body                 |
| note statement                       | `note for User "text"`               | diagram body                 |
| note annotation statement            | `%% @note: x=0 y=0 w=10 h=10`        | diagram body                 |

### 2.2 Language rules

- The diagram statement is the only statement written at file root; its body is the diagram body.
- A reference to an unbound class identifier **implicitly binds** it — a class first seen in a relationship statement exists without a declaration statement.
- A member is written in exactly one form — block or short — never both.
- A note annotation statement binds to the note statement on the immediately following line; the pair is written, moved, and deleted together.
- `%% @...` statements are the Shiny annotation dialect: valid Mermaid comments carrying Shiny data.

## 3. Statement composition

First-level composition of every statement, in the categories defined at chapter 1. Keywords and delimiters are omitted where they follow from the statement kind.

**class declaration statement** — `class User~T~["User account"] { ... }`

| Component | Composition | Span |
| --- | --- | --- |
| **class name** | identifier | `User` |
| **class generic** | clause: a literal enclosed in `~ ~` | `~T~` |
| **class label** | clause: a literal enclosed in `[" "]` | `["User account"]` |
| **class body** | block: block member statements and the class annotation statement | `{ ... }` |

**block member statement** — `+addMessage(Message m) void*`

| Component | Composition | Span |
| --- | --- | --- |
| **member text** | literal (incl. the visibility character), with an optional trailing classifier marker — a selective operator | `+addMessage(Message m) void*` |

**short member statement** — `User : +name$`

| Component | Composition | Span |
| --- | --- | --- |
| **member owner** | identifier, followed by the fixed operator `:` | `User :` |
| **member text** | as in the block member statement | `+name$` |

**class annotation statement** — `<<interface>>`

| Component | Composition | Span |
| --- | --- | --- |
| **class annotation** | literal enclosed in `<< >>` | `<<interface>>` |

**relationship statement** — `User "1" --> "0..*" Order : places`

| Component | Composition | Span |
| --- | --- | --- |
| **source / target endpoint** | identifier | `User`, `Order` |
| **source / target multiplicity** | clause: a literal enclosed in `" "` | `"1"`, `"0..*"` |
| **relationship operator** | selective operator | `-->` |
| **relationship label** | literal, after the fixed operator `:` | `places` |

**style definition statement** — `classDef warning fill:#f00,color:#fff`

| Component | Composition | Span |
| --- | --- | --- |
| **style definition name** | identifier | `warning` |
| **style property list** | list of style property entries | `fill:#f00,color:#fff` |
| **style property entry** | entry: a property name and a literal, joined by the fixed operator `:` | `fill:#f00` |

**direct style statement** — `style User fill:#fff`

| Component | Composition | Span |
| --- | --- | --- |
| **direct style target** | identifier | `User` |
| **style property list** | as in the style definition statement | `fill:#fff` |

**style application statement** — `class User:::warning`

| Component | Composition | Span |
| --- | --- | --- |
| **style application target** | identifier | `User` |
| **style application name** | identifier, after the fixed operator `:::` | `warning` |

**namespace declaration statement** — `namespace Domain { ... }`

| Component | Composition | Span |
| --- | --- | --- |
| **namespace name** | identifier, dotted path | `Domain` |
| **namespace body** | block: class and namespace declaration statements | `{ ... }` |

**spatial annotation statement** — `%% @spatial:User x=0 y=0 w=10 h=10`

| Component | Composition | Span |
| --- | --- | --- |
| **spatial target** | identifier | `User` |
| **coordinate entry** | entry: a coordinate property name and a literal, joined by the fixed operator `=`; fixed set of four | `x=0` |

**namespace style annotation statement** — `%% @style:Domain.Sub fill=blue`

| Component | Composition | Span |
| --- | --- | --- |
| **namespace style target** | identifier, dotted path | `Domain.Sub` |
| **namespace style properties** | list of `=` style property entries | `fill=blue` |

**note annotation statement** — `%% @note: x=0 y=0 w=10 h=10`

| Component | Composition | Span |
| --- | --- | --- |
| **coordinate entry** | as in the spatial annotation statement | `x=0` |

**direction statement** — `direction LR`

| Component | Composition | Span |
| --- | --- | --- |
| **direction value** | selective operator: `TB` `BT` `LR` `RL` | `LR` |

**config directive statement** — `%%{init: { "theme": "dark" }}%%`

| Component | Composition | Span |
| --- | --- | --- |
| **directive body** | literal enclosed in `%%{ }%%` | `init: { "theme": "dark" }` |

**note statement** — `note for User "text"`

| Component | Composition | Span |
| --- | --- | --- |
| **note target** | identifier, after the fixed operator `for` | `for User` |
| **note text** | clause: a literal enclosed in `" "` | `"text"` |

## 4. Invalid language

What lies outside the language of chapters 2–3, and how Shiny handles it. Two handling kinds:

- **problem view** — the file opens in the problem view and is never rewritten;
- **ignored** — the statement is preserved in source but takes no part in the diagram.

| Entry | Definition | Example | Handling |
| --- | --- | --- | --- |
| unknown statement | a line in a statement position that matches no statement of 2.1 | `sequenceDiagram`, `hello world` | problem view |
| misplaced statement | a statement of 2.1 outside its "Written in" scope | a relationship statement inside a namespace body; a block member statement outside a class body | problem view |
| malformed statement | a known statement kind with broken composition (chapter 3) | `class User {` with no closing `}`; `User "1 --> Order` with an unclosed multiplicity clause | problem view |
| lollipop interface statement | valid Mermaid, excluded from Shiny by decision | `Service ()-- Client` | ignored |
| default style definition | valid Mermaid, excluded from Shiny by decision | `classDef default fill:#f00` | ignored |

Rules:

- The namespace body admits only class and namespace declaration statements; anything else there is a misplaced statement.
- A new quirk found in use — a strange but legal Mermaid form with no entry here — is first decided and written into this chapter; only then it is covered by tests. Undecided quirks are not part of the language definition.

## 5. Shiny model

How the ontology surfaces in Shiny's pipeline; details in [Write-Back Pipeline](./write-back-pipeline.md).

### 5.1 Provenance

Provenance is the syntactic index built at parse: for every statement it records where the statement and its components are written.

- One record per **statement**, keyed by the element it declares: the statement's own span, and spans for its components (identifiers, clause literals, entries, body).
- An element without a record is **implicitly bound** (1.3) — it exists in the diagram but owns no statement, so it cannot be edited or anchored to in place.
- Member records are kept separately by written form — block or short.

### 5.2 Write-back

A single write addresses exactly one unit; the unit dictates the legal operations:

- **statement** — insertion, deletion. 
  List of statements in 2.1, first column "Statement"
- **entry** — insertion, deletion.

| Statement        | Entries              |
| ---------------- | -------------------- |
| style definition | style property entry |
| direct style     | style property entry |
- **clause** — insertion, deletion.

| Statement | Clauses |
| --- | --- |
| class declaration | class generic, class label |
| relationship | relationship label, source multiplicity, target multiplicity |
- **value** — replace.

| Statement | Values |
| --- | --- |
| class declaration | class name, class generic, class label |
| block / short member | member text, member owner |
| relationship | endpoint, multiplicity, relationship operator, relationship label |
| style definition | style definition name, style property value |
| direct style | direct style target, style property value |
| style application | style application target, style application name |
| namespace declaration | namespace name |
| spatial annotation | spatial target, spatial coordinate |
| namespace style annotation | namespace style target, namespace style properties (the whole list, one span) |
| note annotation | spatial coordinate |
| note | note text |

**Rules:**

- Keywords, fixed operators, property names, and delimiters are never write targets; they change only as part of a statement or entry written whole.
- An optional component is inserted or deleted as a clause; components that are not clauses change only via whole-statement rewrite.
- Coordinate entries are never inserted or deleted — the fixed set of four admits only replacing their literals.
- There is no whole-statement replace: a statement changes shape only by delete + insert.
