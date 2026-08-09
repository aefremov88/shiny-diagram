import { describe, expect, it } from "vitest";
import { toAttributeId, toClassId, toMethodId, toNamespaceId } from "../../shared/ids";
import { composeNoteId } from "../model/noteIdentity";
import { parseDiagram } from "./parseDiagram";

describe("parseDiagram unsupported diagram types", () => {
  it.each([
    ["sequenceDiagram", "sequenceDiagram"],
    ["flowchart LR", "flowchart"],
    ["erDiagram", "erDiagram"],
    ["stateDiagram-v2", "stateDiagram-v2"],
    ["pie title Pets", "pie"],
  ])("returns unsupportedDiagramType for %s", (declaration, expectedType) => {
    const result = parseDiagram(`${declaration}
this syntax is not validated by Shiny
`);

    expect(result).toEqual({
      status: "unsupportedDiagramType",
      diagramType: expectedType,
    });
  });

  it("detects the declaration after frontmatter, comments, blanks, and init directives", () => {
    const result = parseDiagram(`---
title: Checkout
---

%% explanatory comment
%%{init: {"theme": "dark"}}%%
sequenceDiagram
Alice->>Bob: Hello
`);

    expect(result).toEqual({
      status: "unsupportedDiagramType",
      diagramType: "sequenceDiagram",
    });
  });

  it.each(["classDiagram", "classDiagram-v2"])(
    "keeps %s on the class-diagram parse path",
    (declaration) => {
      expect(
        parseDiagram(`${declaration}
class A
`).status
      ).toBe("missingAnnotations");
    }
  );

  it.each(["notADiagram", "SequenceDiagram"])(
    "keeps an unrecognized declaration on the invalidSyntax path",
    (declaration) => {
      expect(parseDiagram(declaration).status).toBe("invalidSyntax");
    }
  );
});

describe("parseDiagram direction provenance", () => {
  it("records the direction line span", () => {
    const result = parseDiagram(`classDiagram
  direction LR
`);

    expect(result.status).not.toBe("invalidSyntax");
    if (result.status === "invalidSyntax" || result.status === "unsupportedDiagramType") return;
    expect(result.provenance.diagram.direction).toEqual({
      start: { line: 1, character: 0 },
      end: { line: 1, character: 14 },
    });
  });

  it("records null when direction is absent", () => {
    const result = parseDiagram(`classDiagram
`);

    expect(result.status).not.toBe("invalidSyntax");
    if (result.status === "invalidSyntax" || result.status === "unsupportedDiagramType") return;
    expect(result.provenance.diagram.direction).toBeNull();
  });
});

describe("parseDiagram config-directive provenance", () => {
  it("records directive spans in source order", () => {
    const result = parseDiagram(`classDiagram
%%{init: {"class": {"hideEmptyMembersBox": true}}}%%
  %%{init: {"class": {"hierarchicalNamespaces": false}}}%%
`);

    expect(result.status).not.toBe("invalidSyntax");
    if (result.status === "invalidSyntax" || result.status === "unsupportedDiagramType") return;
    expect(result.provenance.diagram.configDirectives).toEqual([
      {
        start: { line: 1, character: 0 },
        end: { line: 1, character: 52 },
      },
      {
        start: { line: 2, character: 0 },
        end: { line: 2, character: 58 },
      },
    ]);
  });

  it("records an empty array when directives are absent", () => {
    const result = parseDiagram(`classDiagram
`);

    expect(result.status).not.toBe("invalidSyntax");
    if (result.status === "invalidSyntax" || result.status === "unsupportedDiagramType") return;
    expect(result.provenance.diagram.configDirectives).toEqual([]);
  });
});

describe("parseDiagram member text blocks", () => {
  it("parses permissive valid members into display text and classifier flags", () => {
    const result = parseDiagram(`classDiagram
class User {
  ? strange visibility
  +List~T~ items*
  +find(List~T~ input) Result~T~$
  +compare(a: int, b: List~T~) bool
  +m(f: (), g: int) bool
}
User : +shortMethod() void*
%% @spatial:User x=10 y=20 w=220 h=160
`);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    const user = result.graph.classes.get(toClassId("User"));
    expect(user?.attributes).toEqual([
      {
        id: "User:2",
        text: "? strange visibility",
        classifier: null,
      },
      {
        id: "User:3",
        text: "+List<T> items",
        classifier: "abstract",
      },
    ]);
    expect(user?.methods).toEqual([
      {
        id: "User:4",
        text: "+find(List<T> input) : Result<T>",
        classifier: "static",
      },
      {
        id: "User:5",
        text: "+compare(a: int, b: List<T>) : bool",
        classifier: null,
      },
      {
        id: "User:6",
        text: "+m(f:(), g: int) : bool",
        classifier: null,
      },
      {
        id: "User:8",
        text: "+shortMethod() : void",
        classifier: "abstract",
      },
    ]);

    expect(result.provenance.blockMembers.get(toAttributeId("User:3"))?.fields.text).toEqual({
      start: { line: 3, character: 2 },
      end: { line: 3, character: 17 },
    });
    expect(result.provenance.shortMembers.get(toMethodId("User:8"))?.fields.text).toEqual({
      start: { line: 8, character: 7 },
      end: { line: 8, character: 27 },
    });
  });

  it("parses quoted identities in classes, relationships, short members, and spatial annotations", () => {
    const result = parseDiagram(`classDiagram
class \`Animal Class!\`
class \`Car Class\`
\`Animal Class!\` --> \`Car Class\`
\`Animal Class!\` : +nickname String
%% @spatial:\`Animal Class!\` x=10 y=20 w=220 h=160
%% @spatial:\`Car Class\` x=260 y=20 w=220 h=160
`);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect([...result.graph.classes.keys()]).toEqual([
      toClassId("Animal Class!"),
      toClassId("Car Class"),
    ]);
    expect([...result.graph.relationships.values()]).toHaveLength(1);
    const animal = result.graph.classes.get(toClassId("Animal Class!"));
    expect(animal?.attributes[0]).toEqual({
      id: "Animal Class!:4",
      text: "+nickname String",
      classifier: null,
    });
    expect(animal?.spatial?.position).toEqual({ x: 10, y: 20 });
    expect(result.provenance.classSpatial.get(toClassId("Animal Class!"))?.fields.target).toEqual({
      start: { line: 5, character: 12 },
      end: { line: 5, character: 27 },
    });
  });

  it("parses class labels for plain and quoted identities", () => {
    const result = parseDiagram(`classDiagram
class User["Human User"]
class \`A B\`~T~["Label AB"]
%% @spatial:User x=10 y=20 w=220 h=160
%% @spatial:\`A B\` x=260 y=20 w=220 h=160
`);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.graph.classes.get(toClassId("User"))?.label).toBe("Human User");
    expect(result.graph.classes.get(toClassId("A B"))?.label).toBe("Label AB");
    expect(result.graph.classes.get(toClassId("A B"))?.genericType).toBe("T");
    expect(result.provenance.classes.get(toClassId("User"))?.fields.label).toEqual({
      start: { line: 1, character: 12 },
      end: { line: 1, character: 22 },
    });
  });

  it("keeps valid known-ignored Mermaid statements from invalidating the read path", () => {
    const result = parseDiagram(`classDiagram
class User
click User href "https://example.com"
note for User "Read-only note"
cssClass User Important
accTitle: Accessible title
direction LR
%% @spatial:User x=10 y=20 w=220 h=160
`);

    expect(result.status).toBe("ready");
  });

  it.each(["TB", "BT", "LR", "RL"] as const)("parses diagram direction %s", (direction) => {
    const result = parseDiagram(`classDiagram
direction ${direction}
class User
%% @spatial:User x=10 y=20 w=220 h=160
`);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.graph.diagram.direction).toBe(direction);
  });

  it("uses null when diagram direction is absent", () => {
    const result = parseDiagram(`classDiagram
class User
%% @spatial:User x=10 y=20 w=220 h=160
`);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.graph.diagram.direction).toBeNull();
  });

  it("preserves class members when applying a named style with space syntax", () => {
    const result = parseDiagram(`classDiagram
class FileAttachment {
  +string mimeType
  +string checksum
}
classDef attachmentStyle fill:#fff
class FileAttachment attachmentStyle
`);

    expect(result.status).toBe("missingAnnotations");
    if (result.status !== "missingAnnotations") return;
    expect(result.graph.classes.get(toClassId("FileAttachment"))?.attributes).toHaveLength(2);
    expect([...result.graph.styleApplications.values()][0]).toMatchObject({
      targetId: toClassId("FileAttachment"),
    });
  });

  it("returns one diagnostic for each unrecognized statement", () => {
    const result = parseDiagram(`classDiagram
class User
this is garbage
also garbage
%% @spatial:User x=10 y=20 w=220 h=160
`);

    expect(result.status).toBe("invalidSyntax");
    if (result.status !== "invalidSyntax") return;

    expect(result.diagnostics).toMatchObject([
      {
        line: 3,
        fragment: "this is garbage",
        message: "Expected a supported Mermaid class-diagram statement",
      },
      {
        line: 4,
        fragment: "also garbage",
        message: "Expected a supported Mermaid class-diagram statement",
      },
    ]);
  });

  it("returns invalidSyntax with every text-block validation failure", () => {
    const result = parseDiagram(`classDiagram
class Map~K, V~ {
  <<domain model>>
  +validMethod() Result
}
%% @spatial:Map x=10 y=20 w=220 h=160
`);

    expect(result.status).toBe("invalidSyntax");
    if (result.status !== "invalidSyntax") return;

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Class "Map" generic type must not contain a comma: K, V',
      'Class "Map" annotation must not contain whitespace: domain model',
    ]);
  });

  it("rejects relationship statements inside class blocks", () => {
    const result = parseDiagram(`classDiagram
class UserContact {
  +UUID id
  ConversationThread_1 "0..1" -- ConversationThread_2 : Hi
}
%% @spatial:UserContact x=10 y=20 w=220 h=160
%% @spatial:ConversationThread_1 x=260 y=20 w=220 h=160
%% @spatial:ConversationThread_2 x=510 y=20 w=220 h=160
`);

    expect(result.status).toBe("invalidSyntax");
    if (result.status !== "invalidSyntax") return;

    expect(result.diagnostics).toMatchObject([
      {
        line: 4,
        fragment: 'ConversationThread_1 "0..1" -- ConversationThread_2 : Hi',
        message: "Expected a class member declaration",
      },
    ]);
  });

  it("rejects nested class declarations inside class blocks", () => {
    const result = parseDiagram(`classDiagram
class UserContact {
  +UUID id
  class ConversationThread {
    +UUID id
  }
}
%% @spatial:UserContact x=10 y=20 w=220 h=160
%% @spatial:ConversationThread x=260 y=20 w=220 h=160
`);

    expect(result.status).toBe("invalidSyntax");
    if (result.status !== "invalidSyntax") return;

    expect(result.diagnostics).toMatchObject([
      {
        line: 4,
        fragment: "class ConversationThread {",
        message: "Expected a class member declaration",
      },
    ]);
  });
});

describe("parseDiagram notes", () => {
  it("parses specification 3.1 notes with annotated free spatial and unannotated attached note", () => {
    const result = parseDiagram(`classDiagram
direction TB

namespace Messaging {
    class ConversationThread {
        +UUID id
    }

    class TextMessage {
        +UUID id
    }
}

ConversationThread --> "*" TextMessage : contains
note for ConversationThread "Persists all messages"

%% @note: x=420 y=180 w=220 h=96
note "External system boundary"

%% @spatial:ConversationThread x=100 y=150 w=320 h=210
%% @spatial:TextMessage x=500 y=150 w=300 h=250
`);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.graph.notes.get(composeNoteId(0))).toMatchObject({
      text: "Persists all messages",
      attachedToClassId: toClassId("ConversationThread"),
      spatial: null,
    });
    expect(result.graph.notes.get(composeNoteId(1))).toMatchObject({
      text: "External system boundary",
      attachedToClassId: null,
      spatial: { position: { x: 420, y: 180 }, size: { width: 220, height: 96 } },
    });
  });

  it("parses free and attached notes, including backtick attachment targets", () => {
    const result = parseDiagram(`classDiagram
class \`Animal Class!\`
%% @spatial:\`Animal Class!\` x=10 y=20 w=220 h=160
%% @note: x=100 y=120 w=200 h=80
note for \`Animal Class!\` "Attached"
note "Free"
`);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.graph.notes.get(composeNoteId(0))).toMatchObject({
      text: "Attached",
      attachedToClassId: toClassId("Animal Class!"),
      spatial: { position: { x: 100, y: 120 }, size: { width: 200, height: 80 } },
    });
    expect(result.graph.notes.get(composeNoteId(1))).toMatchObject({
      text: "Free",
      attachedToClassId: null,
      spatial: null,
    });
    expect(result.provenance.notes.get(composeNoteId(0))?.fields.text).toEqual({
      start: { line: 4, character: 26 },
      end: { line: 4, character: 34 },
    });
  });

  it("decodes Mermaid note line breaks", () => {
    const result = parseDiagram(String.raw`classDiagram
class User
%% @spatial:User x=10 y=20 w=220 h=160
note "Line \n stays literal"
`);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.graph.notes.get(composeNoteId(0))?.text).toBe("Line \n stays literal");
  });

  it("records orphan and duplicate note annotation diagnostics without blocking readiness", () => {
    const result = parseDiagram(`classDiagram
class User
%% @spatial:User x=10 y=20 w=220 h=160
%% @note: x=1 y=2 w=3 h=4

%% @note: x=10 y=20 w=30 h=40
%% @note: x=50 y=60 w=70 h=80
note "Nearest wins"
`);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.graph.notes.get(composeNoteId(0))?.spatial?.position).toEqual({ x: 50, y: 60 });
    expect(result.diagnostics.map((diagnostic) => diagnostic.kind)).toEqual([
      "duplicateAnnotation",
      "orphanedAnnotation",
    ]);
  });

  it("does not bind a note annotation across a blank line", () => {
    const result = parseDiagram(`classDiagram
class User
%% @spatial:User x=10 y=20 w=220 h=160
%% @note: x=10 y=20 w=30 h=40

note "Unbound"
`);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.graph.notes.get(composeNoteId(0))?.spatial).toBeNull();
    expect(result.diagnostics.map((diagnostic) => diagnostic.kind)).toEqual(["orphanedAnnotation"]);
  });
});

describe("parseDiagram namespaces", () => {
  it("parses nested namespace blocks with fully-qualified parent chains", () => {
    const result = parseDiagram(`classDiagram
namespace Root {
  namespace Child {
    class User
  }
}
%% @spatial:User x=10 y=20 w=220 h=160
`);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.graph.namespaces.get(toNamespaceId("Root"))?.parentNamespaceId).toBeNull();
    expect(result.graph.namespaces.get(toNamespaceId("Root.Child"))?.parentNamespaceId).toBe(
      "Root"
    );
    expect(result.graph.classes.get(toClassId("User"))?.parentNamespaceId).toBe("Root.Child");
  });

  it("maps dotted namespace form to generated ancestor namespaces", () => {
    const result = parseDiagram(`classDiagram
namespace Domain.Sub {
  class User
}
%% @spatial:User x=10 y=20 w=220 h=160
`);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.graph.namespaces.get(toNamespaceId("Domain"))?.parentNamespaceId).toBeNull();
    expect(result.graph.namespaces.get(toNamespaceId("Domain.Sub"))?.parentNamespaceId).toBe(
      "Domain"
    );
    expect(result.graph.classes.get(toClassId("User"))?.parentNamespaceId).toBe("Domain.Sub");
  });

  it("accepts backtick namespace identities", () => {
    const result = parseDiagram(`classDiagram
namespace \`Domain Layer\` {
  class User
}
%% @spatial:User x=10 y=20 w=220 h=160
`);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.graph.namespaces.has(toNamespaceId("Domain Layer"))).toBe(true);
    expect(result.graph.classes.get(toClassId("User"))?.parentNamespaceId).toBe("Domain Layer");
  });

  it("keeps duplicate class namespace membership last-wins and reports a diagnostic", () => {
    const result = parseDiagram(`classDiagram
namespace First {
  class User
}
namespace Second {
  class User
}
%% @spatial:User x=10 y=20 w=220 h=160
`);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.graph.classes.get(toClassId("User"))?.parentNamespaceId).toBe("Second");
    expect(result.diagnostics.map((diagnostic) => diagnostic.kind)).toContain(
      "duplicateClassDeclaration"
    );
  });

  it("rejects empty namespace blocks because Mermaid classStatements has no empty production", () => {
    const result = parseDiagram(`classDiagram
namespace Empty { }
`);

    expect(result.status).toBe("invalidSyntax");
  });

  it("preserves but does not honor legacy namespace spatial annotations", () => {
    const result = parseDiagram(`classDiagram
namespace Domain {
  class User
}
%% @spatial:User x=10 y=20 w=220 h=160
%% @spatial:Domain x=1 y=2 w=3 h=4
`);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "orphanedAnnotation",
          elementId: "Domain",
        }),
      ])
    );
  });

  it("treats class style applications inside namespace bodies as class membership", () => {
    const result = parseDiagram(`classDiagram
classDef Important fill:#f9f
namespace Domain {
  class User:::Important
}
%% @spatial:User x=10 y=20 w=220 h=160
`);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.graph.classes.get(toClassId("User"))?.parentNamespaceId).toBe("Domain");
    expect([...result.graph.styleApplications.values()][0]?.targetId).toBe(toClassId("User"));
  });
});
