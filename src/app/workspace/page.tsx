"use client";

import { useState, useEffect, useCallback } from "react";
import { FileNode, DrawElement } from "@/types";
import { loadVault, saveVault, findFile, updateFile } from "@/lib/storage";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Canvas } from "@/components/canvas/Canvas";
import { NoteEditor } from "@/components/editor/NoteEditor";

export default function WorkspacePage() {
  const [vault, setVault] = useState<FileNode[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loaded = loadVault();
    setVault(loaded);
    // Auto-select first file
    const firstFile = findFirstFile(loaded);
    if (firstFile) setActiveFileId(firstFile.id);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) saveVault(vault);
  }, [vault, mounted]);

  function findFirstFile(nodes: FileNode[]): FileNode | undefined {
    for (const node of nodes) {
      if (node.type === "file") return node;
      if (node.children) {
        const found = findFirstFile(node.children);
        if (found) return found;
      }
    }
    return undefined;
  }

  const activeFile = activeFileId ? findFile(vault, activeFileId) : null;

  function handleElementsChange(elements: DrawElement[]) {
    if (!activeFileId) return;
    setVault((v) =>
      updateFile(v, activeFileId, (node) => ({
        ...node,
        canvasData: elements,
        updatedAt: Date.now(),
      }))
    );
  }

  function handleNoteChange(content: string) {
    if (!activeFileId) return;
    setVault((v) =>
      updateFile(v, activeFileId, (node) => ({
        ...node,
        content,
        updatedAt: Date.now(),
      }))
    );
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050505]">
        <div className="text-[#444] text-sm">Loading workspace...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#050505]">
      <Sidebar
        vault={vault}
        activeFileId={activeFileId}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        onSelectFile={setActiveFileId}
        onUpdateVault={setVault}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        {activeFile && (
          <div className="flex items-center px-3 py-1.5 border-b border-[#151515] bg-[#080808]">
            <span className="text-xs text-[#888]">
              {activeFile.fileType === "canvas" ? "Canvas" : "Note"}
            </span>
            <span className="text-xs text-[#333] mx-2">/</span>
            <span className="text-xs text-[#ccc] font-medium">{activeFile.name}</span>
          </div>
        )}

        {/* Content area */}
        {activeFile ? (
          activeFile.fileType === "canvas" ? (
            <Canvas
              elements={activeFile.canvasData || []}
              onElementsChange={handleElementsChange}
            />
          ) : (
            <NoteEditor
              content={activeFile.content || ""}
              onChange={handleNoteChange}
            />
          )
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[#444] text-sm mb-2">No file selected</p>
              <p className="text-[#333] text-xs">
                Select a file from the sidebar or create a new one
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
