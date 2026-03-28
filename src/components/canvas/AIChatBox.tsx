"use client";

import { useState, useRef, useEffect } from "react";
import { DrawElement } from "@/types";
import { layoutDiagram, DiagramData } from "@/lib/layout-engine";
import {
  Send,
  X,
  Sparkles,
  Loader2,
  Trash2,
  Code,
  RefreshCw,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  diagramJson?: string;
}

interface AIChatBoxProps {
  onGenerateElements: (elements: DrawElement[], clearExisting: boolean) => void;
  existingElements: DrawElement[];
}

export function AIChatBox({ onGenerateElements }: AIChatBoxProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Describe any diagram and I'll generate it:\n\n" +
        '- "Login authentication flow"\n' +
        '- "Microservice architecture"\n' +
        '- "Database schema for a blog"\n' +
        '- "CI/CD deployment pipeline"\n\n' +
        "After generating, ask me to edit it.",
    },
  ]);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [lastDiagramJson, setLastDiagramJson] = useState<string>("");
  const [showJson, setShowJson] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || generating) return;

    const userPrompt = input.trim();
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: userPrompt },
    ]);
    setInput("");
    setGenerating(true);

    try {
      const isEdit = lastDiagramJson && looksLikeEdit(userPrompt);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          existingDiagram: isEdit ? lastDiagramJson : undefined,
          mode: isEdit ? "edit" : "generate",
        }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const diagram: DiagramData = data.diagram;
      const rawJson = data.raw || JSON.stringify(diagram, null, 2);
      setLastDiagramJson(rawJson);

      // Layout with dagre and render
      const elements = layoutDiagram(diagram);

      if (elements.length > 0) {
        onGenerateElements(elements, true);

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `${isEdit ? "Updated" : "Generated"} "${diagram.title || "diagram"}" — ${diagram.nodes.length} nodes, ${diagram.edges.length} connections.\n\nYou can say "add a cache layer" or "make it left-to-right" to edit.`,
            diagramJson: rawJson,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Generated the diagram data but couldn't render it. Try rephrasing.",
            diagramJson: rawJson,
          },
        ]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Error: ${msg}`,
        },
      ]);
    } finally {
      setGenerating(false);
    }
  }

  function looksLikeEdit(prompt: string): boolean {
    const words = [
      "change", "modify", "update", "edit", "make", "turn", "convert",
      "add", "remove", "delete", "rename", "move", "swap", "replace",
      "color", "red", "blue", "green", "bigger", "smaller", "horizontal",
      "vertical", "rearrange", "reorder",
    ];
    return words.some((w) => prompt.toLowerCase().includes(w));
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#1a1a1a] rounded-xl px-4 py-2.5 shadow-2xl text-[#888] hover:text-white hover:border-[#333] transition-all group"
      >
        <Sparkles size={16} className="text-[#ef4444] group-hover:animate-pulse" />
        <span className="text-xs font-medium">AI Diagram Generator</span>
      </button>
    );
  }

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[460px] bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#1a1a1a] rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[480px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#151515]">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[#ef4444]" />
          <span className="text-xs font-semibold text-[#ccc]">AI Diagram Generator</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#22c55e20] text-[#22c55e] font-medium">LIVE</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setShowJson(!showJson)}
            className={`p-1 transition-colors ${showJson ? "text-[#ef4444]" : "text-[#555] hover:text-white"}`}
            title="Show JSON"
          >
            <Code size={13} />
          </button>
          <button
            onClick={() => { setMessages([messages[0]]); setLastDiagramJson(""); }}
            className="p-1 text-[#555] hover:text-white transition-colors"
            title="Clear"
          >
            <Trash2 size={13} />
          </button>
          <button onClick={() => setOpen(false)} className="p-1 text-[#555] hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 min-h-[100px]">
        {messages.map((msg) => (
          <div key={msg.id}>
            <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-[#ef4444] text-white"
                    : "bg-[#141414] text-[#aaa] border border-[#1a1a1a]"
                }`}
              >
                {msg.content}
              </div>
            </div>
            {showJson && msg.diagramJson && (
              <pre className="mt-1 bg-[#0e0e0e] border border-[#1a1a1a] rounded-lg p-2 font-mono text-[9px] text-[#555] overflow-x-auto max-h-[120px] whitespace-pre-wrap">
                {msg.diagramJson}
              </pre>
            )}
          </div>
        ))}

        {generating && (
          <div className="flex justify-start">
            <div className="bg-[#141414] border border-[#1a1a1a] rounded-lg px-3 py-2 flex items-center gap-2">
              <Loader2 size={12} className="animate-spin text-[#ef4444]" />
              <span className="text-xs text-[#666]">Generating with Claude...</span>
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
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder={lastDiagramJson ? "Edit: \"add a cache layer\"..." : "Describe any diagram..."}
            className="flex-1 bg-[#111] border border-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-[#ccc] placeholder-[#444] outline-none focus:border-[#333] resize-none min-h-[34px] max-h-[80px]"
            disabled={generating}
            rows={1}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 80) + "px";
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || generating}
            className="p-2 rounded-lg bg-[#ef4444] text-white hover:bg-[#dc2626] disabled:opacity-40 transition-colors shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
        {lastDiagramJson && (
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => {
                const last = [...messages].reverse().find((m) => m.role === "user");
                if (last) setInput(last.content);
              }}
              className="flex items-center gap-1 text-[10px] text-[#555] hover:text-[#ef4444] transition-colors"
            >
              <RefreshCw size={10} /> Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
