"use client";

import { useState, useRef, useEffect } from "react";
import { DrawElement } from "@/types";
import { parseMermaid } from "@/lib/mermaid-parser";
import { layoutDiagram } from "@/lib/layout-engine";
import {
  Send,
  X,
  Sparkles,
  Loader2,
  ChevronDown,
  Trash2,
  Code,
  RefreshCw,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  mermaidCode?: string;
}

interface AIChatBoxProps {
  onGenerateElements: (elements: DrawElement[], clearExisting: boolean) => void;
  existingElements: DrawElement[];
}

export function AIChatBox({ onGenerateElements, existingElements }: AIChatBoxProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I generate real diagrams using AI. Describe what you want:\n\n" +
        "- \"Login authentication flow\"\n" +
        "- \"Microservice architecture for an e-commerce app\"\n" +
        "- \"Database schema for a blog\"\n" +
        "- \"User onboarding sequence diagram\"\n" +
        "- \"Mind map of marketing strategies\"\n\n" +
        "I'll create accurate, properly labeled diagrams based on your actual description.",
    },
  ]);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [lastMermaid, setLastMermaid] = useState<string>("");
  const [showMermaid, setShowMermaid] = useState(false);
  const [streamText, setStreamText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  async function handleSend() {
    if (!input.trim() || generating) return;

    const userPrompt = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userPrompt,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setGenerating(true);
    setStreamText("");

    try {
      // Determine if this is an edit of existing diagram or new generation
      const isEdit = lastMermaid && looksLikeEdit(userPrompt);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          existingMermaid: isEdit ? lastMermaid : undefined,
          mode: isEdit ? "edit" : "generate",
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      // Read streaming response
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let fullMermaid = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(Boolean);

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.type === "delta") {
              fullMermaid += data.text;
              setStreamText(fullMermaid);
            } else if (data.type === "error") {
              throw new Error(data.error);
            }
          } catch {
            // Skip non-JSON lines
          }
        }
      }

      // Clean the mermaid code
      fullMermaid = fullMermaid
        .replace(/```mermaid\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();

      setLastMermaid(fullMermaid);
      setStreamText("");

      // Parse and layout
      const parsed = parseMermaid(fullMermaid);
      const elements = layoutDiagram(parsed);

      if (elements.length > 0) {
        onGenerateElements(elements, true); // true = clear existing

        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `${isEdit ? "Updated" : "Generated"} ${parsed.type} diagram with ${parsed.nodes.length} nodes and ${parsed.edges.length} connections. You can ask me to modify it — e.g. "add a cache layer" or "make it horizontal".`,
          mermaidCode: fullMermaid,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I generated the Mermaid code but couldn't parse it into shapes. Here's the raw code — try rephrasing your request.",
          mermaidCode: fullMermaid,
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error: ${errorMsg}. Make sure the API key is configured in .env.local.`,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setGenerating(false);
    }
  }

  function looksLikeEdit(prompt: string): boolean {
    const editWords = [
      "change", "modify", "update", "edit", "make", "turn", "convert",
      "add", "remove", "delete", "rename", "move", "swap", "replace",
      "color", "red", "blue", "green", "bigger", "smaller", "rearrange",
    ];
    const lower = prompt.toLowerCase();
    return editWords.some((w) => lower.includes(w));
  }

  function handleClearConversation() {
    setMessages([messages[0]]); // Keep welcome message
    setLastMermaid("");
    setStreamText("");
  }

  function handleRegenerate() {
    if (messages.length < 2) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      setInput(lastUserMsg.content);
    }
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
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[480px] bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#1a1a1a] rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#151515]">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[#ef4444]" />
          <span className="text-xs font-semibold text-[#ccc]">AI Diagram Generator</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#22c55e20] text-[#22c55e] font-medium">
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setShowMermaid(!showMermaid)}
            className={`p-1 transition-colors ${showMermaid ? "text-[#ef4444]" : "text-[#555] hover:text-white"}`}
            title="Toggle Mermaid code"
          >
            <Code size={13} />
          </button>
          <button
            onClick={handleClearConversation}
            className="p-1 text-[#555] hover:text-white transition-colors"
            title="Clear conversation"
          >
            <Trash2 size={13} />
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
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 min-h-[120px]">
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
            {showMermaid && msg.mermaidCode && (
              <div className="mt-1 bg-[#0e0e0e] border border-[#1a1a1a] rounded-lg p-2 font-mono text-[10px] text-[#666] overflow-x-auto whitespace-pre">
                {msg.mermaidCode}
              </div>
            )}
          </div>
        ))}

        {generating && (
          <div className="flex justify-start">
            <div className="bg-[#141414] border border-[#1a1a1a] rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <Loader2 size={12} className="animate-spin text-[#ef4444]" />
                <span className="text-xs text-[#666]">Generating with Claude...</span>
              </div>
              {streamText && (
                <pre className="text-[9px] text-[#444] font-mono max-h-[60px] overflow-hidden whitespace-pre-wrap">
                  {streamText.slice(-200)}
                </pre>
              )}
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
            placeholder={
              lastMermaid
                ? "Describe changes, or a new diagram..."
                : "Describe the diagram you want..."
            }
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
        {lastMermaid && (
          <div className="flex items-center gap-2 mt-1.5">
            <button
              onClick={handleRegenerate}
              className="flex items-center gap-1 text-[10px] text-[#555] hover:text-[#ef4444] transition-colors"
            >
              <RefreshCw size={10} /> Regenerate
            </button>
            <span className="text-[10px] text-[#333]">|</span>
            <span className="text-[10px] text-[#444]">
              Edit: &quot;add a cache layer&quot; &quot;make it horizontal&quot;
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
