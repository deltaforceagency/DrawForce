/**
 * Layout engine: takes Claude's JSON diagram output and produces
 * positioned DrawForce canvas elements using dagre for graph layout.
 */

import dagre from "@dagrejs/dagre";
import { DrawElement } from "@/types";
import { createElement } from "./canvas-engine";

// ── Types from Claude's JSON output ─────────────────────────────────

export interface DiagramNode {
  id: string;
  label: string;
  shape: "rect" | "diamond" | "circle" | "rounded";
  group?: string;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

export interface DiagramGroup {
  id: string;
  label: string;
}

export interface DiagramData {
  title?: string;
  direction?: "TD" | "LR";
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups?: DiagramGroup[];
}

// ── Color palette ───────────────────────────────────────────────────

const COLORS = [
  "#4285F4", // blue
  "#34A853", // green
  "#F4B400", // yellow
  "#DB4437", // red
  "#9C27B0", // purple
  "#00BCD4", // cyan
  "#FF9800", // orange
  "#E91E63", // pink
  "#009688", // teal
  "#3F51B5", // indigo
];

function getColor(i: number): string {
  return COLORS[i % COLORS.length];
}

// ── Main layout function ────────────────────────────────────────────

export function layoutDiagram(data: DiagramData): DrawElement[] {
  if (!data.nodes || data.nodes.length === 0) return [];

  const elements: DrawElement[] = [];

  // Create dagre graph
  const g = new dagre.graphlib.Graph({ compound: true });
  g.setGraph({
    rankdir: data.direction === "LR" ? "LR" : "TB",
    nodesep: 50,
    ranksep: 70,
    edgesep: 20,
    marginx: 60,
    marginy: 60,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Calculate node dimensions — use generous width for Caveat hand-drawn font
  const NODE_H = 60;
  const MIN_W = 160;

  for (const node of data.nodes) {
    const w = Math.max(MIN_W, node.label.length * 14 + 60);
    const h = node.shape === "diamond" ? 80 : NODE_H;
    g.setNode(node.id, { label: node.label, width: w, height: h });
  }

  // Register groups as compound parents
  if (data.groups && data.groups.length > 0) {
    for (const group of data.groups) {
      g.setNode(group.id, { label: group.label });
    }
    for (const node of data.nodes) {
      if (node.group && g.hasNode(node.group)) {
        g.setParent(node.id, node.group);
      }
    }
  }

  // Add edges
  for (const edge of data.edges) {
    if (g.hasNode(edge.from) && g.hasNode(edge.to)) {
      g.setEdge(edge.from, edge.to, { label: edge.label || "" });
    }
  }

  // Run dagre layout
  dagre.layout(g);

  // Assign colors — nodes in same group get same color
  const groupColorMap = new Map<string, string>();
  let groupColorIdx = 0;
  if (data.groups) {
    for (const group of data.groups) {
      groupColorMap.set(group.id, getColor(groupColorIdx++));
    }
  }

  // Nodes without groups get their own color based on index
  const nodeColorMap = new Map<string, string>();
  let soloColorIdx = data.groups?.length || 0;
  for (const node of data.nodes) {
    if (node.group && groupColorMap.has(node.group)) {
      nodeColorMap.set(node.id, groupColorMap.get(node.group)!);
    } else {
      nodeColorMap.set(node.id, getColor(soloColorIdx++));
    }
  }

  // ── Render group backgrounds ────────────────────────────────────

  if (data.groups) {
    for (const group of data.groups) {
      const gNode = g.node(group.id);
      if (!gNode || gNode.x === undefined) continue;

      const gx = gNode.x - (gNode.width || 200) / 2 - 15;
      const gy = gNode.y - (gNode.height || 200) / 2 - 30;
      const gw = (gNode.width || 200) + 30;
      const gh = (gNode.height || 200) + 45;
      const color = groupColorMap.get(group.id) || "#666";

      // Group background
      const bg = createElement("rectangle", gx, gy, color + "50", color + "08", 1, 0.5, 0.4);
      bg.width = gw;
      bg.height = gh;
      elements.push(bg);

      // Group label
      const label = createElement("text", gx + 10, gy + 5, color, "transparent", 1.5, 0.7, 0);
      label.text = group.label;
      label.width = gw - 20;
      label.height = 22;
      elements.push(label);
    }
  }

  // ── Render nodes ────────────────────────────────────────────────

  for (const node of data.nodes) {
    const layoutNode = g.node(node.id);
    if (!layoutNode || layoutNode.x === undefined) continue;

    const w = layoutNode.width;
    const h = layoutNode.height;
    const x = layoutNode.x - w / 2;
    const y = layoutNode.y - h / 2;
    const color = nodeColorMap.get(node.id) || COLORS[0];

    // Shape
    const shapeType =
      node.shape === "diamond" ? "diamond" :
      node.shape === "circle" ? "ellipse" :
      "rectangle";

    const shape = createElement(shapeType, x, y, "#ffffff", color, 2, 1, 1.2);
    shape.width = w;
    shape.height = h;
    elements.push(shape);

    // Label text (centered inside shape)
    const text = createElement("text", x, y, "#ffffff", "transparent", 1.8, 1, 0);
    text.text = node.label;
    text.width = w;
    text.height = h;
    elements.push(text);
  }

  // ── Render edges ────────────────────────────────────────────────

  for (const edge of data.edges) {
    const fromNode = g.node(edge.from);
    const toNode = g.node(edge.to);
    if (!fromNode || !toNode) continue;
    if (fromNode.x === undefined || toNode.x === undefined) continue;

    // Arrow from bottom-center of source to top-center of target
    const isLR = data.direction === "LR";

    let x1: number, y1: number, x2: number, y2: number;

    if (isLR) {
      // Left-to-right: exit from right edge, enter left edge
      x1 = fromNode.x + fromNode.width / 2;
      y1 = fromNode.y;
      x2 = toNode.x - toNode.width / 2;
      y2 = toNode.y;
    } else {
      // Top-down: exit from bottom, enter top
      x1 = fromNode.x;
      y1 = fromNode.y + fromNode.height / 2;
      x2 = toNode.x;
      y2 = toNode.y - toNode.height / 2;
    }

    const arrow = createElement("arrow", x1, y1, "#ffffff", "transparent", 2, 0.85, 1.2);
    arrow.width = x2 - x1;
    arrow.height = y2 - y1;
    elements.push(arrow);

    // Edge label
    if (edge.label) {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const labelW = edge.label.length * 9 + 20;
      const labelEl = createElement("text", midX - labelW / 2, midY - 14, "#aaaaaa", "transparent", 1.2, 0.8, 0);
      labelEl.text = edge.label;
      labelEl.width = labelW;
      labelEl.height = 22;
      elements.push(labelEl);
    }
  }

  // ── Title ───────────────────────────────────────────────────────

  if (data.title) {
    // Find bounds to place title above
    let minY = Infinity;
    let minX = Infinity;
    for (const node of data.nodes) {
      const ln = g.node(node.id);
      if (ln && ln.y !== undefined) {
        minY = Math.min(minY, ln.y - ln.height / 2);
        minX = Math.min(minX, ln.x - ln.width / 2);
      }
    }

    const title = createElement("text", minX, minY - 50, "#ffffff", "transparent", 2.5, 1, 0);
    title.text = data.title;
    title.width = data.title.length * 14 + 40;
    title.height = 40;
    elements.push(title);
  }

  // ── Normalize position: offset so diagram starts at (50, 50) ──

  if (elements.length > 0) {
    let globalMinX = Infinity;
    let globalMinY = Infinity;
    for (const el of elements) {
      globalMinX = Math.min(globalMinX, el.x);
      globalMinY = Math.min(globalMinY, el.y);
    }
    const offsetX = 50 - globalMinX;
    const offsetY = 50 - globalMinY;
    for (const el of elements) {
      el.x += offsetX;
      el.y += offsetY;
    }
  }

  return elements;
}
