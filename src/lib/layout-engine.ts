/**
 * Layout engine: takes parsed Mermaid diagrams and produces
 * positioned DrawForce canvas elements using dagre for graph layout.
 */

import dagre from "@dagrejs/dagre";
import { ParsedDiagram, ParsedNode, ParsedEdge, ParsedSubgraph } from "./mermaid-parser";
import { DrawElement } from "@/types";
import { createElement } from "./canvas-engine";

// Excalidraw-style color palette
const PALETTE = {
  blue: "#4285F4",
  green: "#34A853",
  yellow: "#F4B400",
  red: "#DB4437",
  purple: "#9C27B0",
  cyan: "#00BCD4",
  orange: "#FF9800",
  pink: "#E91E63",
  teal: "#009688",
  indigo: "#3F51B5",
};

const COLOR_CYCLE = Object.values(PALETTE);

function getColor(index: number): string {
  return COLOR_CYCLE[index % COLOR_CYCLE.length];
}

// Map subgraph → color for consistent coloring
function getSubgraphColorMap(subgraphs: ParsedSubgraph[]): Map<string, string> {
  const map = new Map<string, string>();
  subgraphs.forEach((sg, i) => {
    const color = getColor(i);
    sg.nodeIds.forEach((nid) => map.set(nid, color));
  });
  return map;
}

export function layoutDiagram(diagram: ParsedDiagram): DrawElement[] {
  if (diagram.nodes.length === 0) return [];

  switch (diagram.type) {
    case "mindmap":
      return layoutMindmap(diagram);
    case "sequence":
      return layoutSequence(diagram);
    case "timeline":
      return layoutTimeline(diagram);
    default:
      return layoutFlowchart(diagram);
  }
}

// ── Flowchart / Graph Layout (dagre) ────────────────────────────────

function layoutFlowchart(diagram: ParsedDiagram): DrawElement[] {
  const elements: DrawElement[] = [];

  // Create dagre graph
  const g = new dagre.graphlib.Graph({ compound: true });
  g.setGraph({
    rankdir: diagram.direction === "LR" ? "LR" : "TB",
    nodesep: 60,
    ranksep: 80,
    edgesep: 30,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Node dimensions based on label length
  const NODE_HEIGHT = 60;
  const MIN_NODE_WIDTH = 120;

  for (const node of diagram.nodes) {
    const width = Math.max(MIN_NODE_WIDTH, node.label.length * 12 + 40);
    g.setNode(node.id, { label: node.label, width, height: NODE_HEIGHT });
  }

  // Register subgraphs
  for (const sg of diagram.subgraphs) {
    g.setNode(sg.id, { label: sg.label, clusterLabelPos: "top" });
    for (const nid of sg.nodeIds) {
      g.setParent(nid, sg.id);
    }
  }

  for (const edge of diagram.edges) {
    if (g.hasNode(edge.from) && g.hasNode(edge.to)) {
      g.setEdge(edge.from, edge.to, { label: edge.label || "" });
    }
  }

  // Run dagre layout
  dagre.layout(g);

  // Build color map from subgraphs
  const colorMap = getSubgraphColorMap(diagram.subgraphs);

  // Auto-assign colors to nodes without a subgraph color
  let colorIdx = diagram.subgraphs.length;
  const nodeColorCache = new Map<string, string>();
  for (const node of diagram.nodes) {
    if (!colorMap.has(node.id)) {
      nodeColorCache.set(node.id, getColor(colorIdx++));
    }
  }

  // Render subgraph backgrounds
  for (const sg of diagram.subgraphs) {
    const sgNode = g.node(sg.id);
    if (sgNode && sgNode.x !== undefined) {
      const sgColor = getColor(diagram.subgraphs.indexOf(sg));
      const bgEl = createElement(
        "rectangle",
        sgNode.x - (sgNode.width || 200) / 2,
        sgNode.y - (sgNode.height || 150) / 2,
        sgColor + "60",
        sgColor + "10",
        1,
        0.4,
        0.5
      );
      bgEl.width = sgNode.width || 200;
      bgEl.height = sgNode.height || 150;
      elements.push(bgEl);

      // Subgraph label
      const labelEl = createElement(
        "text",
        sgNode.x - (sgNode.width || 200) / 2,
        sgNode.y - (sgNode.height || 150) / 2 - 5,
        "#888888",
        "transparent",
        1.5,
        0.7,
        0
      );
      labelEl.text = sg.label;
      labelEl.width = sgNode.width || 200;
      labelEl.height = 25;
      elements.push(labelEl);
    }
  }

  // Render nodes
  for (const node of diagram.nodes) {
    const layoutNode = g.node(node.id);
    if (!layoutNode || layoutNode.x === undefined) continue;

    const x = layoutNode.x - layoutNode.width / 2;
    const y = layoutNode.y - layoutNode.height / 2;
    const w = layoutNode.width;
    const h = layoutNode.height;

    const fillColor = colorMap.get(node.id) || nodeColorCache.get(node.id) || getColor(0);

    const shapeType = node.shape === "diamond" ? "diamond"
      : node.shape === "circle" ? "ellipse"
      : "rectangle";

    // Shape element
    const el = createElement(shapeType, x, y, "#ffffff", fillColor, 2.5, 1, 1.2);
    el.width = w;
    el.height = h;
    elements.push(el);

    // Text label centered inside
    const textEl = createElement("text", x, y, "#ffffff", "transparent", 2, 1, 0);
    textEl.text = node.label;
    textEl.width = w;
    textEl.height = h;
    elements.push(textEl);
  }

  // Render edges
  for (const edge of diagram.edges) {
    const fromNode = g.node(edge.from);
    const toNode = g.node(edge.to);
    if (!fromNode || !toNode || fromNode.x === undefined || toNode.x === undefined) continue;

    const arrowEl = createElement(
      "arrow",
      fromNode.x,
      fromNode.y + fromNode.height / 2,
      "#ffffff",
      "transparent",
      2,
      0.9,
      1.2
    );
    arrowEl.width = toNode.x - fromNode.x;
    arrowEl.height = (toNode.y - toNode.height / 2) - (fromNode.y + fromNode.height / 2);
    elements.push(arrowEl);

    // Edge label
    if (edge.label) {
      const midX = (fromNode.x + toNode.x) / 2;
      const midY = (fromNode.y + fromNode.height / 2 + toNode.y - toNode.height / 2) / 2;
      const labelEl = createElement("text", midX - 40, midY - 12, "#aaaaaa", "transparent", 1.2, 0.8, 0);
      labelEl.text = edge.label;
      labelEl.width = 80;
      labelEl.height = 24;
      elements.push(labelEl);
    }
  }

  return elements;
}

// ── Mindmap Layout (radial) ─────────────────────────────────────────

function layoutMindmap(diagram: ParsedDiagram): DrawElement[] {
  const elements: DrawElement[] = [];
  if (diagram.nodes.length === 0) return elements;

  const cx = 400;
  const cy = 350;

  // Find root (first node or one with no incoming edges)
  const incomingSet = new Set(diagram.edges.map((e) => e.to));
  const root = diagram.nodes.find((n) => !incomingSet.has(n.id)) || diagram.nodes[0];

  // Build adjacency
  const children = new Map<string, string[]>();
  for (const edge of diagram.edges) {
    if (!children.has(edge.from)) children.set(edge.from, []);
    children.get(edge.from)!.push(edge.to);
  }

  // Position root
  const rootEl = createElement("ellipse", cx - 80, cy - 40, "#ffffff", PALETTE.blue, 2.5, 1, 1.2);
  rootEl.width = 160;
  rootEl.height = 80;
  elements.push(rootEl);

  const rootText = createElement("text", cx - 80, cy - 40, "#ffffff", "transparent", 2.5, 1, 0);
  rootText.text = root.label;
  rootText.width = 160;
  rootText.height = 80;
  elements.push(rootText);

  // Position children radially
  const kids = children.get(root.id) || [];
  const radius = 220;

  kids.forEach((kidId, i) => {
    const node = diagram.nodes.find((n) => n.id === kidId);
    if (!node) return;

    const angle = (i / kids.length) * Math.PI * 2 - Math.PI / 2;
    const bx = cx + Math.cos(angle) * radius - 65;
    const by = cy + Math.sin(angle) * radius - 28;
    const color = getColor(i);

    // Arrow from center
    const arrow = createElement("arrow", cx, cy, "#ffffff", "transparent", 2, 0.6, 1.5);
    arrow.width = bx + 65 - cx;
    arrow.height = by + 28 - cy;
    elements.push(arrow);

    // Branch box
    const boxEl = createElement("rectangle", bx, by, "#ffffff", color, 2.5, 1, 1.2);
    boxEl.width = 130;
    boxEl.height = 56;
    elements.push(boxEl);

    const textEl = createElement("text", bx, by, "#ffffff", "transparent", 1.8, 1, 0);
    textEl.text = node.label;
    textEl.width = 130;
    textEl.height = 56;
    elements.push(textEl);

    // Sub-children
    const grandkids = children.get(kidId) || [];
    grandkids.forEach((gkId, j) => {
      const gk = diagram.nodes.find((n) => n.id === gkId);
      if (!gk) return;

      const gAngle = angle + ((j - (grandkids.length - 1) / 2) * 0.4);
      const gx = bx + 65 + Math.cos(gAngle) * 130 - 50;
      const gy = by + 28 + Math.sin(gAngle) * 100 - 18;

      const gArrow = createElement("arrow", bx + 65, by + 28, color, "transparent", 1.5, 0.5, 1.2);
      gArrow.width = gx + 50 - (bx + 65);
      gArrow.height = gy + 18 - (by + 28);
      elements.push(gArrow);

      const gBox = createElement("rectangle", gx, gy, "#ffffff", color + "80", 1.5, 1, 1);
      gBox.width = 100;
      gBox.height = 36;
      elements.push(gBox);

      const gText = createElement("text", gx, gy, "#ffffff", "transparent", 1.3, 1, 0);
      gText.text = gk.label;
      gText.width = 100;
      gText.height = 36;
      elements.push(gText);
    });
  });

  return elements;
}

// ── Sequence Diagram Layout ─────────────────────────────────────────

function layoutSequence(diagram: ParsedDiagram): DrawElement[] {
  const elements: DrawElement[] = [];
  const participants = diagram.nodes;
  const gap = 200;
  const startX = 80;
  const startY = 60;

  // Participant boxes across the top
  participants.forEach((p, i) => {
    const x = startX + i * gap;
    const color = getColor(i);

    const box = createElement("rectangle", x, startY, "#ffffff", color, 2.5, 1, 1);
    box.width = 140;
    box.height = 50;
    elements.push(box);

    const text = createElement("text", x, startY, "#ffffff", "transparent", 2, 1, 0);
    text.text = p.label;
    text.width = 140;
    text.height = 50;
    elements.push(text);

    // Lifeline (vertical dashed line)
    const lifeline = createElement("line", x + 70, startY + 50, "#ffffff40", "transparent", 1, 0.4, 0.3);
    lifeline.width = 0;
    lifeline.height = Math.max(300, diagram.edges.length * 50 + 100);
    elements.push(lifeline);
  });

  // Message arrows
  diagram.edges.forEach((edge, i) => {
    const fromIdx = participants.findIndex((p) => p.id === edge.from);
    const toIdx = participants.findIndex((p) => p.id === edge.to);
    if (fromIdx === -1 || toIdx === -1) return;

    const y = startY + 80 + i * 50;
    const fromX = startX + fromIdx * gap + 70;
    const toX = startX + toIdx * gap + 70;

    const arrow = createElement("arrow", fromX, y, "#ffffff", "transparent", 2, 1, 1);
    arrow.width = toX - fromX;
    arrow.height = 0;
    elements.push(arrow);

    if (edge.label) {
      const midX = Math.min(fromX, toX) + Math.abs(toX - fromX) / 2 - 50;
      const text = createElement("text", midX, y - 22, "#cccccc", "transparent", 1.3, 0.9, 0);
      text.text = edge.label;
      text.width = 100;
      text.height = 20;
      elements.push(text);
    }
  });

  return elements;
}

// ── Timeline Layout ─────────────────────────────────────────────────

function layoutTimeline(diagram: ParsedDiagram): DrawElement[] {
  const elements: DrawElement[] = [];
  const gap = 180;
  const y = 280;
  const startX = 80;

  // Main arrow
  if (diagram.nodes.length > 0) {
    const mainArrow = createElement("arrow", startX - 20, y, "#ffffff", "transparent", 2.5, 1, 0.8);
    mainArrow.width = (diagram.nodes.length - 1) * gap + 80;
    mainArrow.height = 0;
    elements.push(mainArrow);
  }

  diagram.nodes.forEach((node, i) => {
    const x = startX + i * gap;
    const color = getColor(i);

    // Dot on timeline
    const dot = createElement("ellipse", x - 10, y - 10, "#ffffff", color, 2, 1, 0.3);
    dot.width = 20;
    dot.height = 20;
    elements.push(dot);

    // Vertical connector
    const vline = createElement("line", x, y - 10, "#ffffff60", "transparent", 1.5, 0.7, 0.8);
    vline.width = 0;
    vline.height = -60;
    elements.push(vline);

    // Label box
    const box = createElement("rectangle", x - 60, y - 130, "#ffffff", color, 2.5, 1, 1.2);
    box.width = 120;
    box.height = 55;
    elements.push(box);

    const text = createElement("text", x - 60, y - 130, "#ffffff", "transparent", 1.8, 1, 0);
    text.text = node.label;
    text.width = 120;
    text.height = 55;
    elements.push(text);
  });

  return elements;
}
