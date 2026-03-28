/**
 * Lightweight Mermaid parser for DrawForce.
 * Handles: flowchart, graph, mindmap, timeline, sequenceDiagram, erDiagram
 *
 * Does NOT use the heavy mermaid npm package — instead parses the text
 * directly into a graph structure that dagre can layout.
 */

export interface ParsedNode {
  id: string;
  label: string;
  shape: "rectangle" | "diamond" | "rounded" | "circle" | "stadium" | "cylinder";
  group?: string;
}

export interface ParsedEdge {
  from: string;
  to: string;
  label?: string;
}

export interface ParsedSubgraph {
  id: string;
  label: string;
  nodeIds: string[];
}

export interface ParsedDiagram {
  type: "flowchart" | "sequence" | "mindmap" | "timeline" | "er" | "unknown";
  direction: "TD" | "LR" | "BT" | "RL";
  nodes: ParsedNode[];
  edges: ParsedEdge[];
  subgraphs: ParsedSubgraph[];
}

export function parseMermaid(code: string): ParsedDiagram {
  // Clean input
  const cleaned = code
    .replace(/```mermaid\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { type: "unknown", direction: "TD", nodes: [], edges: [], subgraphs: [] };
  }

  const firstLine = lines[0].toLowerCase();

  if (firstLine.startsWith("flowchart") || firstLine.startsWith("graph")) {
    return parseFlowchart(lines);
  }
  if (firstLine.startsWith("sequencediagram")) {
    return parseSequenceDiagram(lines);
  }
  if (firstLine.startsWith("mindmap")) {
    return parseMindmap(lines);
  }
  if (firstLine.startsWith("timeline")) {
    return parseTimeline(lines);
  }
  if (firstLine.startsWith("erdiagram")) {
    return parseErDiagram(lines);
  }

  // Fallback — try flowchart parsing
  return parseFlowchart(["flowchart TD", ...lines]);
}

function parseFlowchart(lines: string[]): ParsedDiagram {
  const diagram: ParsedDiagram = {
    type: "flowchart",
    direction: "TD",
    nodes: [],
    edges: [],
    subgraphs: [],
  };

  // Extract direction from first line
  const firstLine = lines[0];
  const dirMatch = firstLine.match(/(?:flowchart|graph)\s+(TD|LR|BT|RL)/i);
  if (dirMatch) {
    diagram.direction = dirMatch[1].toUpperCase() as ParsedDiagram["direction"];
  }

  const nodeMap = new Map<string, ParsedNode>();
  const subgraphStack: ParsedSubgraph[] = [];
  let currentSubgraph: ParsedSubgraph | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Skip comments and empty
    if (line.startsWith("%%") || !line) continue;

    // Subgraph start
    const subMatch = line.match(/^subgraph\s+(.+)/i);
    if (subMatch) {
      const label = subMatch[1].trim().replace(/^["']|["']$/g, "");
      const sg: ParsedSubgraph = {
        id: `sg_${diagram.subgraphs.length}`,
        label,
        nodeIds: [],
      };
      if (currentSubgraph) subgraphStack.push(currentSubgraph);
      currentSubgraph = sg;
      diagram.subgraphs.push(sg);
      continue;
    }

    // Subgraph end
    if (line.toLowerCase() === "end") {
      currentSubgraph = subgraphStack.pop() || null;
      continue;
    }

    // Parse edges: A --> B, A -->|label| B, A -- text --> B
    const edgePatterns = [
      // A -->|label| B or A -- label --> B
      /^(\S+)\s*(?:-->|==>|-.->|---->)\s*\|([^|]*)\|\s*(\S+)/,
      /^(\S+)\s*--\s*([^-]+)\s*-->\s*(\S+)/,
      // A --> B (no label)
      /^(\S+)\s*(-->|==>|-.->|---->|--->|--)\s*(\S+)/,
    ];

    let edgeParsed = false;
    for (const pattern of edgePatterns) {
      const edgeMatch = line.match(pattern);
      if (edgeMatch) {
        const fromRaw = edgeMatch[1].trim();
        const labelOrArrow = edgeMatch[2].trim();
        const toRaw = edgeMatch[3].trim();

        // The label is either the middle capture group (if 3 groups) or empty
        const label = ["-->", "==>", "-.->", "---->", "--->", "--"].includes(labelOrArrow)
          ? undefined
          : labelOrArrow;

        const fromId = extractNodeId(fromRaw);
        const toId = extractNodeId(toRaw);

        // Register nodes
        ensureNode(fromRaw, nodeMap, currentSubgraph);
        ensureNode(toRaw, nodeMap, currentSubgraph);

        diagram.edges.push({ from: fromId, to: toId, label });
        edgeParsed = true;
        break;
      }
    }

    if (edgeParsed) continue;

    // Standalone node definition: A[Label] or B{Decision} etc.
    const nodeMatch = line.match(/^(\w+)\s*[\[({<>].*[\])}>]/);
    if (nodeMatch) {
      ensureNode(line.trim(), nodeMap, currentSubgraph);
      continue;
    }

    // Simple node ID on its own line (inside subgraph)
    const simpleNode = line.match(/^(\w+)$/);
    if (simpleNode && currentSubgraph) {
      ensureNode(simpleNode[1], nodeMap, currentSubgraph);
    }
  }

  diagram.nodes = Array.from(nodeMap.values());
  return diagram;
}

function extractNodeId(raw: string): string {
  // Extract just the ID from "A[label]" or "B{decision}" etc
  const match = raw.match(/^(\w+)/);
  return match ? match[1] : raw;
}

function parseNodeShape(raw: string): { id: string; label: string; shape: ParsedNode["shape"] } {
  // Try different shape syntaxes
  const patterns: [RegExp, ParsedNode["shape"]][] = [
    [/^(\w+)\{\{(.+?)\}\}/, "circle"],      // {{text}} hexagon
    [/^(\w+)\{(.+?)\}/, "diamond"],          // {text} diamond
    [/^(\w+)\(\((.+?)\)\)/, "circle"],       // ((text)) circle
    [/^(\w+)\((.+?)\)/, "rounded"],          // (text) rounded
    [/^(\w+)\[(.+?)\]/, "rectangle"],        // [text] rectangle
    [/^(\w+)>(.+?)\]/, "stadium"],           // >text] flag/stadium
    [/^(\w+)\[\((.+?)\)\]/, "cylinder"],     // [(text)] cylinder
  ];

  for (const [pattern, shape] of patterns) {
    const m = raw.match(pattern);
    if (m) {
      return { id: m[1], label: m[2].trim(), shape };
    }
  }

  // No shape syntax — just an ID
  const id = raw.replace(/[^a-zA-Z0-9_]/g, "");
  return { id, label: id, shape: "rectangle" };
}

function ensureNode(
  raw: string,
  nodeMap: Map<string, ParsedNode>,
  currentSubgraph: ParsedSubgraph | null
) {
  const { id, label, shape } = parseNodeShape(raw);
  if (!nodeMap.has(id)) {
    nodeMap.set(id, { id, label, shape });
  } else {
    // Update label if we now have a richer definition
    const existing = nodeMap.get(id)!;
    if (label !== id && existing.label === existing.id) {
      existing.label = label;
      existing.shape = shape;
    }
  }
  if (currentSubgraph && !currentSubgraph.nodeIds.includes(id)) {
    currentSubgraph.nodeIds.push(id);
  }
}

function parseSequenceDiagram(lines: string[]): ParsedDiagram {
  const diagram: ParsedDiagram = {
    type: "sequence",
    direction: "LR",
    nodes: [],
    edges: [],
    subgraphs: [],
  };

  const participants = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // participant A as Label
    const partMatch = line.match(/participant\s+(\S+)(?:\s+as\s+(.+))?/i);
    if (partMatch) {
      const id = partMatch[1];
      const label = partMatch[2] || id;
      participants.add(id);
      diagram.nodes.push({ id, label: label.trim(), shape: "rectangle" });
      continue;
    }

    // A->>B: message  or  A->B: message  etc
    const msgMatch = line.match(/(\S+)\s*(->>|->|-->>|-->)\s*(\S+)\s*:\s*(.+)/);
    if (msgMatch) {
      const from = msgMatch[1];
      const to = msgMatch[3];
      const label = msgMatch[4].trim();

      if (!participants.has(from)) {
        participants.add(from);
        diagram.nodes.push({ id: from, label: from, shape: "rectangle" });
      }
      if (!participants.has(to)) {
        participants.add(to);
        diagram.nodes.push({ id: to, label: to, shape: "rectangle" });
      }

      diagram.edges.push({ from, to, label });
    }
  }

  return diagram;
}

function parseMindmap(lines: string[]): ParsedDiagram {
  const diagram: ParsedDiagram = {
    type: "mindmap",
    direction: "TD",
    nodes: [],
    edges: [],
    subgraphs: [],
  };

  let nodeId = 0;
  const stack: { id: string; indent: number }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const indent = line.search(/\S/);
    const label = line.trim().replace(/^[()[\]{}]+|[()[\]{}]+$/g, "");
    const id = `mm_${nodeId++}`;

    diagram.nodes.push({ id, label, shape: indent === 0 ? "circle" : "rounded" });

    // Find parent — last node with less indent
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    if (stack.length > 0) {
      diagram.edges.push({ from: stack[stack.length - 1].id, to: id });
    }

    stack.push({ id, indent });
  }

  return diagram;
}

function parseTimeline(lines: string[]): ParsedDiagram {
  const diagram: ParsedDiagram = {
    type: "timeline",
    direction: "LR",
    nodes: [],
    edges: [],
    subgraphs: [],
  };

  let prevId: string | null = null;
  let nodeId = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;

    // "title" line
    if (line.toLowerCase().startsWith("title")) continue;

    // Section headers
    const sectionMatch = line.match(/^section\s+(.+)/i);
    if (sectionMatch) {
      const id = `tl_${nodeId++}`;
      diagram.nodes.push({ id, label: sectionMatch[1].trim(), shape: "stadium" });
      if (prevId) diagram.edges.push({ from: prevId, to: id });
      prevId = id;
      continue;
    }

    // Events — any line with : separator or just plain text
    const eventMatch = line.match(/^(.+?)\s*:\s*(.+)/);
    if (eventMatch) {
      const id = `tl_${nodeId++}`;
      diagram.nodes.push({ id, label: eventMatch[1].trim(), shape: "rectangle" });
      if (prevId) diagram.edges.push({ from: prevId, to: id });
      prevId = id;
    } else if (line && !line.startsWith("section")) {
      const id = `tl_${nodeId++}`;
      diagram.nodes.push({ id, label: line, shape: "rectangle" });
      if (prevId) diagram.edges.push({ from: prevId, to: id });
      prevId = id;
    }
  }

  return diagram;
}

function parseErDiagram(lines: string[]): ParsedDiagram {
  const diagram: ParsedDiagram = {
    type: "er",
    direction: "TD",
    nodes: [],
    edges: [],
    subgraphs: [],
  };

  const entities = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // ENTITY ||--o{ OTHER : "label"
    const relMatch = line.match(/(\w+)\s+([|{}o]+-*[|{}o]+)\s+(\w+)\s*:\s*"?([^"]*)"?/);
    if (relMatch) {
      const from = relMatch[1];
      const to = relMatch[3];
      const label = relMatch[4].trim();

      if (!entities.has(from)) {
        entities.add(from);
        diagram.nodes.push({ id: from, label: from, shape: "rectangle" });
      }
      if (!entities.has(to)) {
        entities.add(to);
        diagram.nodes.push({ id: to, label: to, shape: "rectangle" });
      }

      diagram.edges.push({ from, to, label });
    }
  }

  return diagram;
}
