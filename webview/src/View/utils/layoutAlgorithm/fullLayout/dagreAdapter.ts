import dagre from "@dagrejs/dagre";
import type { DiagramDirection } from "../../../../shared/uml";
import {
  LAYOUT_DAGRE_EDGE_SEPARATION,
  LAYOUT_DAGRE_MARGIN_X,
  LAYOUT_DAGRE_MARGIN_Y,
  LAYOUT_DAGRE_NODE_SEPARATION,
  LAYOUT_DAGRE_RANK_SEPARATION,
} from "../../../config/editorUiConfig";

export type DagreNodeInput = {
  readonly id: string;
  readonly width: number;
  readonly height: number;
};
export type DagreEdgeInput = {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly weight: number;
  readonly minlen: number;
};

export function runDagre(
  direction: DiagramDirection | null,
  nodes: readonly DagreNodeInput[],
  edges: readonly DagreEdgeInput[],
  margins: { readonly x: number; readonly y: number } = {
    x: LAYOUT_DAGRE_MARGIN_X,
    y: LAYOUT_DAGRE_MARGIN_Y,
  }
): {
  readonly nodes: ReadonlyMap<string, { x: number; y: number; w: number; h: number }>;
  readonly width: number;
  readonly height: number;
} {
  const graph = new dagre.graphlib.Graph({ multigraph: true });
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: direction ?? "TB",
    ranker: "network-simplex",
    acyclicer: "greedy",
    nodesep: LAYOUT_DAGRE_NODE_SEPARATION,
    ranksep: LAYOUT_DAGRE_RANK_SEPARATION,
    edgesep: LAYOUT_DAGRE_EDGE_SEPARATION,
    marginx: margins.x,
    marginy: margins.y,
  });
  nodes.forEach((node) => graph.setNode(node.id, { width: node.width, height: node.height }));
  edges.forEach((edge) =>
    graph.setEdge(
      edge.sourceId,
      edge.targetId,
      { weight: edge.weight, minlen: edge.minlen },
      edge.id
    )
  );
  // eslint-disable-next-line no-console -- Permanent debug trace for Generate graph diagnostics.
  console.debug("[dagreAdapter]", {
    nodeCount: graph.nodeCount(),
    edgeCount: graph.edgeCount(),
    edges: graph.edges().map(({ v, w, name }) => ({
      v,
      w,
      name,
      weight: graph.edge(v, w, name)?.weight,
      minlen: graph.edge(v, w, name)?.minlen,
    })),
    options: graph.graph(),
  });
  dagre.layout(graph);
  return {
    nodes: new Map(
      nodes.map((input) => {
        const node = graph.node(input.id);
        return [
          input.id,
          {
            x: node.x - input.width / 2,
            y: node.y - input.height / 2,
            w: input.width,
            h: input.height,
          },
        ];
      })
    ),
    width: graph.graph().width ?? 0,
    height: graph.graph().height ?? 0,
  };
}
