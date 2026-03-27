"use client";

import { useState, useRef, useEffect } from "react";
import { DrawElement, ElementType } from "@/types";
import { createElement } from "@/lib/canvas-engine";
import {
  MessageSquare,
  Send,
  X,
  Sparkles,
  Loader2,
  ChevronDown,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AIChatBoxProps {
  onGenerateElements: (elements: DrawElement[]) => void;
  existingElements: DrawElement[];
}

// Parse natural language into drawing elements
function parsePromptToElements(prompt: string, existingCount: number): DrawElement[] {
  const elements: DrawElement[] = [];
  const lower = prompt.toLowerCase();

  // Color mapping
  const colorMap: Record<string, string> = {
    red: "#ef4444",
    blue: "#3b82f6",
    green: "#22c55e",
    yellow: "#eab308",
    orange: "#f97316",
    purple: "#8b5cf6",
    pink: "#ec4899",
    cyan: "#06b6d4",
    white: "#ffffff",
    gray: "#64748b",
    grey: "#64748b",
  };

  let strokeColor = "#ffffff";
  for (const [name, hex] of Object.entries(colorMap)) {
    if (lower.includes(name)) {
      strokeColor = hex;
      break;
    }
  }

  // Detect flowchart / diagram patterns
  if (lower.includes("flowchart") || lower.includes("flow chart") || lower.includes("process")) {
    return generateFlowchart(prompt, strokeColor);
  }

  if (lower.includes("org chart") || lower.includes("organization") || lower.includes("hierarchy")) {
    return generateOrgChart(prompt, strokeColor);
  }

  if (lower.includes("mind map") || lower.includes("mindmap") || lower.includes("brainstorm")) {
    return generateMindMap(prompt, strokeColor);
  }

  if (lower.includes("grid") || lower.includes("table") || lower.includes("matrix")) {
    return generateGrid(prompt, strokeColor);
  }

  if (lower.includes("timeline")) {
    return generateTimeline(prompt, strokeColor);
  }

  if (lower.includes("architecture") || lower.includes("system design") || lower.includes("diagram")) {
    return generateArchitectureDiagram(prompt, strokeColor);
  }

  // Generic shape generation
  const shapePatterns: { pattern: RegExp; type: ElementType }[] = [
    { pattern: /(\d+)\s*(?:rect(?:angle)?s?|box(?:es)?|square(?:s)?)/i, type: "rectangle" },
    { pattern: /(\d+)\s*(?:circle(?:s)?|ellipse(?:s)?|oval(?:s)?)/i, type: "ellipse" },
    { pattern: /(\d+)\s*(?:diamond(?:s)?|rhombus)/i, type: "diamond" },
    { pattern: /(\d+)\s*(?:arrow(?:s)?)/i, type: "arrow" },
    { pattern: /(\d+)\s*(?:line(?:s)?)/i, type: "line" },
  ];

  for (const { pattern, type } of shapePatterns) {
    const match = lower.match(pattern);
    if (match) {
      const count = Math.min(parseInt(match[1]), 20);
      for (let i = 0; i < count; i++) {
        const el = createElement(
          type,
          100 + (i % 5) * 160,
          100 + Math.floor(i / 5) * 140,
          strokeColor,
          "transparent",
          2,
          1,
          1
        );
        el.width = 120;
        el.height = type === "line" || type === "arrow" ? 0 : 100;
        elements.push(el);
      }
    }
  }

  // Single shape mentions
  if (elements.length === 0) {
    const singleShapes: { words: string[]; type: ElementType }[] = [
      { words: ["rectangle", "rect", "box", "square"], type: "rectangle" },
      { words: ["circle", "ellipse", "oval"], type: "ellipse" },
      { words: ["diamond", "rhombus"], type: "diamond" },
      { words: ["arrow"], type: "arrow" },
      { words: ["line"], type: "line" },
    ];

    for (const { words, type } of singleShapes) {
      if (words.some((w) => lower.includes(w))) {
        const el = createElement(type, 200, 200, strokeColor, "transparent", 2, 1, 1);
        el.width = 150;
        el.height = type === "line" || type === "arrow" ? 0 : 120;
        elements.push(el);
      }
    }
  }

  // If still nothing, generate a default helpful diagram
  if (elements.length === 0) {
    return generateArchitectureDiagram(prompt, strokeColor);
  }

  return elements;
}

function generateFlowchart(prompt: string, _color: string): DrawElement[] {
  const elements: DrawElement[] = [];

  // Extract steps from prompt
  const stepPatterns = prompt.match(/(?:steps?|stages?|phases?)[:\s]*(.+)/i);
  let steps = ["Start", "Process", "Decision", "Action", "End"];

  if (stepPatterns) {
    const parsed = stepPatterns[1]
      .split(/[,;→>]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parsed.length >= 2) steps = parsed;
  }

  // Excalidraw-style colors for each step
  const stepColors = ["#4285F4", "#34A853", "#F4B400", "#DB4437", "#9C27B0", "#00BCD4", "#FF9800"];

  const boxW = 200;
  const boxH = 65;
  const gap = 50;
  const startX = 200;
  const startY = 80;

  steps.forEach((step, i) => {
    const y = startY + i * (boxH + gap);
    const isDecision = step.toLowerCase().includes("decision") || step.includes("?");
    const fillColor = stepColors[i % stepColors.length];

    // Box — solid colored fill with white stroke
    const el = createElement(
      isDecision ? "diamond" : "rectangle",
      startX,
      y,
      "#ffffff",
      fillColor,
      2.5,
      1,
      1.2
    );
    el.width = isDecision ? boxW + 40 : boxW;
    el.height = isDecision ? boxH + 20 : boxH;
    elements.push(el);

    // White text centered inside box
    const elW = isDecision ? boxW + 40 : boxW;
    const elH = isDecision ? boxH + 20 : boxH;
    const label = createElement("text", startX, y, "#ffffff", "transparent", 2, 1, 0);
    label.text = step;
    label.width = elW;
    label.height = elH;
    elements.push(label);

    // Arrow to next — white, thick
    if (i < steps.length - 1) {
      const arrow = createElement(
        "arrow",
        startX + boxW / 2,
        y + (isDecision ? boxH + 20 : boxH),
        "#ffffff",
        "transparent",
        2.5,
        1,
        1.2
      );
      arrow.width = 0;
      arrow.height = isDecision ? gap - 20 : gap;
      elements.push(arrow);
    }
  });

  return elements;
}

function generateOrgChart(prompt: string, _color: string): DrawElement[] {
  const elements: DrawElement[] = [];
  const boxW = 160;
  const boxH = 55;

  // Excalidraw style — each level gets a different color
  const positions = [
    { x: 300, y: 50, label: "CEO", fill: "#4285F4" },
    { x: 130, y: 180, label: "CTO", fill: "#34A853" },
    { x: 470, y: 180, label: "CFO", fill: "#34A853" },
    { x: 40, y: 310, label: "Dev Lead", fill: "#F4B400" },
    { x: 220, y: 310, label: "Design Lead", fill: "#F4B400" },
    { x: 400, y: 310, label: "Finance", fill: "#F4B400" },
    { x: 580, y: 310, label: "Operations", fill: "#F4B400" },
  ];

  const connections = [
    [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6],
  ];

  positions.forEach(({ x, y, label, fill }) => {
    const el = createElement("rectangle", x, y, "#ffffff", fill, 2.5, 1, 1.2);
    el.width = boxW;
    el.height = boxH;
    elements.push(el);

    const text = createElement("text", x, y, "#ffffff", "transparent", 2, 1, 0);
    text.text = label;
    text.width = boxW;
    text.height = boxH;
    elements.push(text);
  });

  connections.forEach(([from, to]) => {
    const f = positions[from];
    const t = positions[to];
    const arrow = createElement(
      "arrow",
      f.x + boxW / 2,
      f.y + boxH,
      "#ffffff",
      "transparent",
      2,
      0.9,
      1.2
    );
    arrow.width = t.x + boxW / 2 - (f.x + boxW / 2);
    arrow.height = t.y - (f.y + boxH);
    elements.push(arrow);
  });

  return elements;
}

function generateMindMap(prompt: string, _color: string): DrawElement[] {
  const elements: DrawElement[] = [];
  const cx = 400;
  const cy = 300;

  // Excalidraw-style colors for branches
  const branchColors = ["#DB4437", "#F4B400", "#34A853", "#4285F4", "#9C27B0", "#00BCD4"];

  // Center node — big, prominent
  const center = createElement("ellipse", cx - 80, cy - 40, "#ffffff", "#4285F4", 2.5, 1, 1.2);
  center.width = 160;
  center.height = 80;
  elements.push(center);

  const centerText = createElement("text", cx - 80, cy - 40, "#ffffff", "transparent", 2.5, 1, 0);
  centerText.text = "Main Idea";
  centerText.width = 160;
  centerText.height = 80;
  elements.push(centerText);

  const branches = ["Branch 1", "Branch 2", "Branch 3", "Branch 4", "Branch 5", "Branch 6"];
  const radius = 220;

  branches.forEach((label, i) => {
    const angle = (i / branches.length) * Math.PI * 2 - Math.PI / 2;
    const bx = cx + Math.cos(angle) * radius - 60;
    const by = cy + Math.sin(angle) * radius - 25;
    const fillColor = branchColors[i % branchColors.length];

    // Arrow from center to branch
    const arrow = createElement("arrow", cx, cy, "#ffffff", "transparent", 2, 0.7, 1.5);
    arrow.width = bx + 60 - cx;
    arrow.height = by + 25 - cy;
    elements.push(arrow);

    // Branch node — solid fill
    const node = createElement("rectangle", bx, by, "#ffffff", fillColor, 2.5, 1, 1.2);
    node.width = 120;
    node.height = 50;
    elements.push(node);

    const text = createElement("text", bx, by, "#ffffff", "transparent", 1.8, 1, 0);
    text.text = label;
    text.width = 120;
    text.height = 50;
    elements.push(text);
  });

  return elements;
}

function generateGrid(prompt: string, _color: string): DrawElement[] {
  const elements: DrawElement[] = [];
  const cols = 4;
  const rows = 3;
  const cellW = 140;
  const cellH = 65;
  const startX = 100;
  const startY = 80;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isHeader = r === 0;
      const el = createElement(
        "rectangle",
        startX + c * cellW,
        startY + r * cellH,
        "#ffffff",
        isHeader ? "#4285F4" : "transparent",
        isHeader ? 2.5 : 1.5,
        1,
        isHeader ? 1.2 : 0.8
      );
      el.width = cellW;
      el.height = cellH;
      elements.push(el);

      const text = createElement(
        "text",
        startX + c * cellW + 18,
        startY + r * cellH + 18,
        isHeader ? "#ffffff" : "#cccccc",
        "transparent",
        isHeader ? 2 : 1.5,
        1,
        0
      );
      text.text = isHeader ? `Column ${c + 1}` : `Row ${r}, Col ${c + 1}`;
      text.width = cellW;
      text.height = 24;
      elements.push(text);
    }
  }

  return elements;
}

function generateTimeline(prompt: string, _color: string): DrawElement[] {
  const elements: DrawElement[] = [];
  const events = ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5"];
  const phaseColors = ["#4285F4", "#34A853", "#F4B400", "#DB4437", "#9C27B0"];
  const startX = 80;
  const y = 280;
  const gap = 170;

  // Main arrow line — thick white
  const line = createElement("arrow", startX - 20, y, "#ffffff", "transparent", 2.5, 1, 1);
  line.width = (events.length - 1) * gap + 80;
  line.height = 0;
  elements.push(line);

  events.forEach((label, i) => {
    const x = startX + i * gap;
    const fillColor = phaseColors[i % phaseColors.length];

    // Filled dot
    const dot = createElement("ellipse", x - 12, y - 12, "#ffffff", fillColor, 2, 1, 0.3);
    dot.width = 24;
    dot.height = 24;
    elements.push(dot);

    // Vertical connector line
    const vline = createElement("line", x, y - 12, "#ffffff", "transparent", 2, 0.8, 1);
    vline.width = 0;
    vline.height = -60;
    elements.push(vline);

    // Label box — solid fill
    const box = createElement("rectangle", x - 55, y - 130, "#ffffff", fillColor, 2.5, 1, 1.2);
    box.width = 110;
    box.height = 50;
    elements.push(box);

    const text = createElement("text", x - 55, y - 130, "#ffffff", "transparent", 2, 1, 0);
    text.text = label;
    text.width = 110;
    text.height = 50;
    elements.push(text);
  });

  return elements;
}

function generateArchitectureDiagram(prompt: string, _color: string): DrawElement[] {
  const elements: DrawElement[] = [];

  // Excalidraw-style: each layer gets its own distinct solid color
  const boxes = [
    { x: 250, y: 50, w: 220, h: 70, label: "Frontend", stroke: "#ffffff", fill: "#4285F4", layer: "transport" },
    { x: 80, y: 200, w: 200, h: 70, label: "API Gateway", stroke: "#ffffff", fill: "#34A853", layer: "operations" },
    { x: 440, y: 200, w: 200, h: 70, label: "Auth Service", stroke: "#ffffff", fill: "#34A853", layer: "operations" },
    { x: 40, y: 380, w: 180, h: 70, label: "Service A", stroke: "#ffffff", fill: "#F4B400", layer: "services" },
    { x: 270, y: 380, w: 180, h: 70, label: "Service B", stroke: "#ffffff", fill: "#F4B400", layer: "services" },
    { x: 500, y: 380, w: 180, h: 70, label: "Database", stroke: "#ffffff", fill: "#DB4437", layer: "state" },
  ];

  // Layer labels on the left
  const layerLabels = [
    { x: -80, y: 70, label: "Transport" },
    { x: -80, y: 220, label: "Operations" },
    { x: -80, y: 400, label: "Services" },
  ];

  layerLabels.forEach(({ x, y, label }) => {
    const text = createElement("text", x, y, "#888888", "transparent", 2, 0.7, 0);
    text.text = label;
    text.width = 120;
    text.height = 30;
    elements.push(text);
  });

  boxes.forEach(({ x, y, w, h, label, stroke, fill }) => {
    // Solid-fill rectangle with thick white stroke — like real Excalidraw
    const el = createElement("rectangle", x, y, stroke, fill, 2.5, 1, 1.2);
    el.width = w;
    el.height = h;
    elements.push(el);

    // White text centered inside box
    const text = createElement("text", x, y, "#ffffff", "transparent", 2, 1, 0);
    text.text = label;
    text.width = w;
    text.height = h;
    elements.push(text);
  });

  // Arrows — white, thick, connecting boxes
  const arrowConnections = [
    [0, 1], [0, 2], [1, 3], [1, 4], [3, 5], [4, 5],
  ];

  arrowConnections.forEach(([from, to]) => {
    const f = boxes[from];
    const t = boxes[to];
    const arrow = createElement(
      "arrow",
      f.x + f.w / 2,
      f.y + f.h,
      "#ffffff",
      "transparent",
      2,
      0.9,
      1.2
    );
    arrow.width = t.x + t.w / 2 - (f.x + f.w / 2);
    arrow.height = t.y - (f.y + f.h);
    elements.push(arrow);
  });

  return elements;
}

function getAIResponse(prompt: string): string {
  const lower = prompt.toLowerCase();

  if (lower.includes("flowchart") || lower.includes("flow") || lower.includes("process")) {
    return "I've created a flowchart for you! Each step is connected with arrows. You can drag elements to reposition them, or double-click to edit text.";
  }
  if (lower.includes("org chart") || lower.includes("organization") || lower.includes("hierarchy")) {
    return "Here's your org chart! I've set up a standard hierarchy structure. Select and drag any box to adjust the layout.";
  }
  if (lower.includes("mind map") || lower.includes("brainstorm")) {
    return "Mind map generated! The central idea is in the middle with 6 branches radiating out. Click any element to modify it.";
  }
  if (lower.includes("grid") || lower.includes("table") || lower.includes("matrix")) {
    return "I've drawn a 4x3 grid/table layout. The header row is highlighted. You can adjust sizes by selecting and dragging.";
  }
  if (lower.includes("timeline")) {
    return "Timeline created with 5 phases! Each event has a dot on the line with a label above. Feel free to reposition.";
  }
  if (lower.includes("architecture") || lower.includes("system") || lower.includes("diagram")) {
    return "Architecture diagram ready! Shows a Frontend → API Gateway → Services → Database flow. Move elements around to customize.";
  }
  if (lower.match(/\d+\s*(rect|box|circle|ellipse|diamond|arrow|line)/i)) {
    return "Done! I've arranged the shapes in a grid layout. Select any shape to move, resize, or change its style.";
  }

  return "I've generated a diagram based on your description. You can select and move any element, change colors in the style panel, or ask me to create something else!";
}

export function AIChatBox({ onGenerateElements, existingElements }: AIChatBoxProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I can create diagrams for you. Try asking for:\n\n- \"Create a flowchart for user signup\"\n- \"Draw an org chart\"\n- \"Make a mind map\"\n- \"Build a system architecture diagram\"\n- \"Draw a timeline with 5 phases\"\n- \"3 red circles and 2 blue rectangles\"\n\nYou can queue multiple ideas at once — separate them with semicolons or new lines!",
    },
  ]);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (!input.trim() || generating) return;

    // Split input by newlines or semicolons to support queued batch ideas
    const ideas = input
      .split(/[;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (ideas.length === 0) return;

    // Show user message with all ideas
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: ideas.length > 1
        ? `Batch request (${ideas.length} items):\n${ideas.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
        : ideas[0],
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setGenerating(true);

    // Process all ideas with staggered offsets so they don't overlap
    let allElements: DrawElement[] = [];
    const responses: string[] = [];
    let processed = 0;

    function processNext() {
      if (processed >= ideas.length) {
        // All done — push everything
        onGenerateElements(allElements);

        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: ideas.length > 1
            ? `Done! Generated ${ideas.length} diagrams with ${allElements.length} total elements:\n\n${responses.map((r, i) => `**${i + 1}.** ${r}`).join("\n")}\n\nAll elements are on the canvas — drag to reposition.`
            : responses[0],
        };

        setMessages((prev) => [...prev, aiMsg]);
        setGenerating(false);
        return;
      }

      const idea = ideas[processed];
      const yOffset = processed * 500; // Stack diagrams vertically

      setTimeout(() => {
        const newEls = parsePromptToElements(idea, existingElements.length + allElements.length);
        // Offset each batch vertically so they don't stack on top of each other
        const offsetEls = newEls.map((el) => ({ ...el, y: el.y + yOffset }));
        allElements = [...allElements, ...offsetEls];
        responses.push(getAIResponse(idea));
        processed++;
        processNext();
      }, 400);
    }

    processNext();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#1a1a1a] rounded-xl px-4 py-2.5 shadow-2xl text-[#888] hover:text-white hover:border-[#333] transition-all group"
      >
        <Sparkles size={16} className="text-[#ef4444] group-hover:animate-pulse" />
        <span className="text-xs font-medium">Ask AI to draw</span>
      </button>
    );
  }

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[420px] bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#1a1a1a] rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#151515]">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[#ef4444]" />
          <span className="text-xs font-semibold text-[#ccc]">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-[#555] hover:text-white transition-colors"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-[#555] hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-h-[280px] overflow-y-auto px-3 py-2 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[#ef4444] text-white"
                  : "bg-[#141414] text-[#aaa] border border-[#1a1a1a]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {generating && (
          <div className="flex justify-start">
            <div className="bg-[#141414] border border-[#1a1a1a] rounded-lg px-3 py-2 flex items-center gap-2">
              <Loader2 size={12} className="animate-spin text-[#ef4444]" />
              <span className="text-xs text-[#666]">Generating diagram...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#151515] px-3 py-2">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe what to draw... (use ; or new lines to queue multiple ideas)"
            className="flex-1 bg-[#111] border border-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-[#ccc] placeholder-[#444] outline-none focus:border-[#333] resize-none min-h-[34px] max-h-[80px]"
            disabled={generating}
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 80) + "px";
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || generating}
            className="p-2 rounded-lg bg-[#ef4444] text-white hover:bg-[#dc2626] disabled:opacity-40 disabled:hover:bg-[#ef4444] transition-colors shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
        {input.includes(";") || input.includes("\n") ? (
          <p className="text-[10px] text-[#ef4444] mt-1">
            {input.split(/[;\n]+/).filter((s) => s.trim()).length} ideas queued
          </p>
        ) : null}
      </div>
    </div>
  );
}
