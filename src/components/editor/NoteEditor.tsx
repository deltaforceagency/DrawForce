"use client";

import { useState, useEffect, useRef } from "react";
import { Eye, Pencil, Bold, Italic, Heading1, Heading2, List, Code, Link2 } from "lucide-react";

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
}

function renderMarkdown(text: string): string {
  let html = text
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold text-white mt-6 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-white mt-6 mb-3">$1</h1>')
    // Bold & Italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code
    .replace(/`([^`]+)`/g, '<code class="bg-[#1a1a1a] text-[#ef4444] px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#3b82f6] hover:underline">$1</a>')
    // Lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-[#aaa]">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '<div class="h-4"></div>')
    .replace(/\n/g, "<br>");

  // Wrap consecutive li elements in ul
  html = html.replace(
    /(<li[^>]*>.*?<\/li>(?:<br>)?)+/g,
    (match) => `<ul class="list-disc space-y-1">${match.replace(/<br>/g, "")}</ul>`
  );

  return html;
}

export function NoteEditor({ content, onChange }: NoteEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertMarkdown(prefix: string, suffix: string = "") {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.substring(start, end);
    const newContent =
      content.substring(0, start) +
      prefix +
      (selected || "text") +
      suffix +
      content.substring(end);
    onChange(newContent);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length + (selected || "text").length);
    }, 0);
  }

  return (
    <div className="flex-1 flex flex-col bg-[#050505] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#151515] bg-[#080808]">
        <div className="flex items-center gap-0.5">
          {mode === "edit" && (
            <>
              <button
                onClick={() => insertMarkdown("**", "**")}
                className="p-1.5 rounded text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors"
                title="Bold"
              >
                <Bold size={14} />
              </button>
              <button
                onClick={() => insertMarkdown("*", "*")}
                className="p-1.5 rounded text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors"
                title="Italic"
              >
                <Italic size={14} />
              </button>
              <button
                onClick={() => insertMarkdown("# ")}
                className="p-1.5 rounded text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors"
                title="Heading 1"
              >
                <Heading1 size={14} />
              </button>
              <button
                onClick={() => insertMarkdown("## ")}
                className="p-1.5 rounded text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors"
                title="Heading 2"
              >
                <Heading2 size={14} />
              </button>
              <button
                onClick={() => insertMarkdown("- ")}
                className="p-1.5 rounded text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors"
                title="List"
              >
                <List size={14} />
              </button>
              <button
                onClick={() => insertMarkdown("`", "`")}
                className="p-1.5 rounded text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors"
                title="Code"
              >
                <Code size={14} />
              </button>
              <button
                onClick={() => insertMarkdown("[", "](url)")}
                className="p-1.5 rounded text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors"
                title="Link"
              >
                <Link2 size={14} />
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-0.5 bg-[#0e0e0e] rounded-lg p-0.5">
          <button
            onClick={() => setMode("edit")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors ${
              mode === "edit"
                ? "bg-[#1a1a1a] text-white"
                : "text-[#555] hover:text-[#888]"
            }`}
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            onClick={() => setMode("preview")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors ${
              mode === "preview"
                ? "bg-[#1a1a1a] text-white"
                : "text-[#555] hover:text-[#888]"
            }`}
          >
            <Eye size={12} /> Preview
          </button>
        </div>
      </div>

      {/* Content */}
      {mode === "edit" ? (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-[#ccc] text-sm font-mono leading-relaxed p-6 outline-none resize-none"
          placeholder="Start writing..."
          spellCheck={false}
        />
      ) : (
        <div
          className="flex-1 overflow-y-auto p-6 text-sm text-[#aaa] leading-relaxed prose-invert"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      )}
    </div>
  );
}
