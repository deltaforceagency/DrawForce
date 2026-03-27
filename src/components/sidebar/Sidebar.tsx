"use client";

import { useState } from "react";
import { FileNode } from "@/types";
import {
  ChevronRight,
  ChevronDown,
  File,
  FolderOpen,
  Folder,
  Plus,
  Trash2,
  Pencil,
  PenTool,
  FileText,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { v4 as uuid } from "uuid";

interface SidebarProps {
  vault: FileNode[];
  activeFileId: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectFile: (id: string) => void;
  onUpdateVault: (vault: FileNode[]) => void;
}

export function Sidebar({
  vault,
  activeFileId,
  collapsed,
  onToggleCollapse,
  onSelectFile,
  onUpdateVault,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function toggleFolder(id: string) {
    function toggle(nodes: FileNode[]): FileNode[] {
      return nodes.map((n) => {
        if (n.id === id) return { ...n, expanded: !n.expanded };
        if (n.children) return { ...n, children: toggle(n.children) };
        return n;
      });
    }
    onUpdateVault(toggle(vault));
  }

  function addFile(folderId: string, fileType: "canvas" | "note") {
    const newFile: FileNode = {
      id: uuid(),
      name: fileType === "canvas" ? "Untitled Canvas" : "Untitled Note",
      type: "file",
      fileType,
      canvasData: fileType === "canvas" ? [] : undefined,
      content: fileType === "note" ? "# Untitled\n\nStart writing..." : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    function addTo(nodes: FileNode[]): FileNode[] {
      return nodes.map((n) => {
        if (n.id === folderId && n.type === "folder") {
          return {
            ...n,
            expanded: true,
            children: [...(n.children || []), newFile],
            updatedAt: Date.now(),
          };
        }
        if (n.children) return { ...n, children: addTo(n.children) };
        return n;
      });
    }

    onUpdateVault(addTo(vault));
    onSelectFile(newFile.id);
    setRenamingId(newFile.id);
    setRenameValue(newFile.name);
  }

  function addFolder() {
    const newFolder: FileNode = {
      id: uuid(),
      name: "New Folder",
      type: "folder",
      expanded: true,
      children: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onUpdateVault([...vault, newFolder]);
    setRenamingId(newFolder.id);
    setRenameValue(newFolder.name);
  }

  function deleteNode(id: string) {
    function del(nodes: FileNode[]): FileNode[] {
      return nodes
        .filter((n) => n.id !== id)
        .map((n) => {
          if (n.children) return { ...n, children: del(n.children) };
          return n;
        });
    }
    onUpdateVault(del(vault));
  }

  function commitRename(id: string) {
    function rename(nodes: FileNode[]): FileNode[] {
      return nodes.map((n) => {
        if (n.id === id) return { ...n, name: renameValue || n.name, updatedAt: Date.now() };
        if (n.children) return { ...n, children: rename(n.children) };
        return n;
      });
    }
    onUpdateVault(rename(vault));
    setRenamingId(null);
  }

  function filterNodes(nodes: FileNode[], query: string): FileNode[] {
    if (!query) return nodes;
    return nodes
      .map((n) => {
        if (n.type === "folder") {
          const filtered = filterNodes(n.children || [], query);
          if (filtered.length > 0) return { ...n, children: filtered, expanded: true };
          if (n.name.toLowerCase().includes(query.toLowerCase())) return n;
          return null;
        }
        if (n.name.toLowerCase().includes(query.toLowerCase())) return n;
        return null;
      })
      .filter(Boolean) as FileNode[];
  }

  const displayNodes = filterNodes(vault, searchQuery);

  function renderNode(node: FileNode, depth: number = 0) {
    const isActive = node.id === activeFileId;
    const isRenaming = node.id === renamingId;

    if (node.type === "folder") {
      return (
        <div key={node.id}>
          <div
            className={`group flex items-center gap-1 px-2 py-1 text-xs cursor-pointer hover:bg-[#111] rounded transition-colors ${
              isActive ? "bg-[#111] text-white" : "text-[#888]"
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => toggleFolder(node.id)}
          >
            {node.expanded ? (
              <ChevronDown size={12} className="shrink-0 text-[#555]" />
            ) : (
              <ChevronRight size={12} className="shrink-0 text-[#555]" />
            )}
            {node.expanded ? (
              <FolderOpen size={14} className="shrink-0 text-[#ef4444]" />
            ) : (
              <Folder size={14} className="shrink-0 text-[#ef4444]" />
            )}
            {isRenaming ? (
              <input
                className="bg-[#1a1a1a] border border-[#333] rounded px-1 text-xs text-white outline-none w-full"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => commitRename(node.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(node.id);
                  if (e.key === "Escape") setRenamingId(null);
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate flex-1">{node.name}</span>
            )}
            <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
              <button
                className="p-0.5 hover:text-white"
                title="New Canvas"
                onClick={(e) => {
                  e.stopPropagation();
                  addFile(node.id, "canvas");
                }}
              >
                <PenTool size={11} />
              </button>
              <button
                className="p-0.5 hover:text-white"
                title="New Note"
                onClick={(e) => {
                  e.stopPropagation();
                  addFile(node.id, "note");
                }}
              >
                <FileText size={11} />
              </button>
              <button
                className="p-0.5 hover:text-[#ef4444]"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNode(node.id);
                }}
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
          {node.expanded &&
            node.children?.map((child) => renderNode(child, depth + 1))}
        </div>
      );
    }

    return (
      <div
        key={node.id}
        className={`group flex items-center gap-1.5 px-2 py-1 text-xs cursor-pointer rounded transition-colors ${
          isActive
            ? "bg-[#ef444415] text-[#ef4444]"
            : "text-[#777] hover:bg-[#111] hover:text-[#aaa]"
        }`}
        style={{ paddingLeft: `${depth * 12 + 20}px` }}
        onClick={() => onSelectFile(node.id)}
      >
        {node.fileType === "canvas" ? (
          <PenTool size={12} className="shrink-0" />
        ) : (
          <FileText size={12} className="shrink-0" />
        )}
        {isRenaming ? (
          <input
            className="bg-[#1a1a1a] border border-[#333] rounded px-1 text-xs text-white outline-none w-full"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => commitRename(node.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename(node.id);
              if (e.key === "Escape") setRenamingId(null);
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate flex-1">{node.name}</span>
        )}
        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <button
            className="p-0.5 hover:text-white"
            title="Rename"
            onClick={(e) => {
              e.stopPropagation();
              setRenamingId(node.id);
              setRenameValue(node.name);
            }}
          >
            <Pencil size={11} />
          </button>
          <button
            className="p-0.5 hover:text-[#ef4444]"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(node.id);
            }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="w-10 bg-[#080808] border-r border-[#151515] flex flex-col items-center py-3 shrink-0">
        <button
          onClick={onToggleCollapse}
          className="text-[#555] hover:text-white transition-colors"
        >
          <PanelLeftOpen size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-60 bg-[#080808] border-r border-[#151515] flex flex-col shrink-0 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#151515]">
        <span className="text-xs font-semibold text-[#ccc] tracking-wide">VAULT</span>
        <div className="flex items-center gap-1">
          <button
            onClick={addFolder}
            className="p-1 text-[#555] hover:text-white transition-colors"
            title="New Folder"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={onToggleCollapse}
            className="p-1 text-[#555] hover:text-white transition-colors"
          >
            <PanelLeftClose size={14} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-2">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#444]" />
          <input
            className="w-full bg-[#0e0e0e] border border-[#1a1a1a] rounded-md pl-7 pr-2 py-1 text-xs text-[#aaa] placeholder-[#444] outline-none focus:border-[#333]"
            placeholder="Search vault..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {displayNodes.map((node) => renderNode(node))}
      </div>
    </div>
  );
}
