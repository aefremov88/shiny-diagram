/**
 * @fileoverview Mermaid diagram-type declarations and Shiny support labels.
 */

export const SHINY_SUPPORTED_DIAGRAM_TYPES = [
  { declaration: "classDiagram", label: "class diagrams" },
] as const;

export const UNSUPPORTED_MERMAID_DIAGRAM_TYPES = [
  "sequenceDiagram",
  "flowchart",
  "graph",
  "erDiagram",
  "stateDiagram",
  "stateDiagram-v2",
  "mindmap",
  "gantt",
  "pie",
  "journey",
  "gitGraph",
  "timeline",
  "quadrantChart",
  "sankey-beta",
  "xychart-beta",
  "block-beta",
  "C4Context",
  "requirementDiagram",
  "packet-beta",
  "kanban",
  "architecture-beta",
] as const;

const DIAGRAM_TYPE_LABELS: Readonly<Record<string, string>> = {
  sequenceDiagram: "Sequence diagram",
  flowchart: "Flowchart",
  graph: "Graph",
  erDiagram: "Entity relationship diagram",
  stateDiagram: "State diagram",
  "stateDiagram-v2": "State diagram",
  mindmap: "Mind map",
  gantt: "Gantt chart",
  pie: "Pie chart",
  journey: "User journey",
  gitGraph: "Git graph",
  timeline: "Timeline",
  quadrantChart: "Quadrant chart",
  "sankey-beta": "Sankey diagram",
  "xychart-beta": "XY chart",
  "block-beta": "Block diagram",
  C4Context: "C4 context diagram",
  requirementDiagram: "Requirement diagram",
  "packet-beta": "Packet diagram",
  kanban: "Kanban",
  "architecture-beta": "Architecture diagram",
};

export function toDiagramTypeLabel(diagramType: string): string {
  return DIAGRAM_TYPE_LABELS[diagramType] ?? diagramType;
}

export function toUnsupportedDiagramTypeMessage(diagramType: string): string {
  return `${toDiagramTypeLabel(diagramType)} is not supported yet.`;
}
