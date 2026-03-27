"use client";

import { Tool, AppState } from "@/types";
import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  Diamond,
  Minus,
  MoveRight,
  Pencil,
  Type,
  Eraser,
  Download,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";

interface ToolbarProps {
  appState: AppState;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: Tool) => void;
  onStateChange: (state: Partial<AppState>) => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onClearCanvas: () => void;
}

const tools: { tool: Tool; icon: typeof MousePointer2; label: string; shortcut: string }[] = [
  { tool: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
  { tool: "pan", icon: Hand, label: "Pan", shortcut: "H" },
  { tool: "rectangle", icon: Square, label: "Rectangle", shortcut: "R" },
  { tool: "ellipse", icon: Circle, label: "Ellipse", shortcut: "O" },
  { tool: "diamond", icon: Diamond, label: "Diamond", shortcut: "D" },
  { tool: "line", icon: Minus, label: "Line", shortcut: "L" },
  { tool: "arrow", icon: MoveRight, label: "Arrow", shortcut: "A" },
  { tool: "freedraw", icon: Pencil, label: "Draw", shortcut: "P" },
  { tool: "text", icon: Type, label: "Text", shortcut: "T" },
  { tool: "eraser", icon: Eraser, label: "Eraser", shortcut: "E" },
];

const colors = [
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#64748b",
];

export function Toolbar({
  appState,
  canUndo,
  canRedo,
  onToolChange,
  onStateChange,
  onUndo,
  onRedo,
  onExport,
  onClearCanvas,
}: ToolbarProps) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1">
      {/* Tools */}
      <div className="flex items-center gap-0.5 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#1a1a1a] rounded-xl px-1.5 py-1.5 shadow-2xl">
        {tools.map(({ tool, icon: Icon, label, shortcut }) => (
          <button
            key={tool}
            onClick={() => onToolChange(tool)}
            className={`relative p-2 rounded-lg transition-all group ${
              appState.tool === tool
                ? "bg-[#ef4444] text-white shadow-lg shadow-[#ef444440]"
                : "text-[#666] hover:text-white hover:bg-[#1a1a1a]"
            }`}
            title={`${label} (${shortcut})`}
          >
            <Icon size={16} />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-[#888] bg-[#111] border border-[#222] rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {label} <span className="text-[#555]">({shortcut})</span>
            </span>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#1a1a1a] rounded-xl px-1.5 py-1.5 shadow-2xl">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded-lg text-[#666] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#666] transition-all"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded-lg text-[#666] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#666] transition-all"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={16} />
        </button>
        <div className="w-px h-5 bg-[#1a1a1a] mx-0.5" />
        <button
          onClick={onExport}
          className="p-2 rounded-lg text-[#666] hover:text-white hover:bg-[#1a1a1a] transition-all"
          title="Export PNG"
        >
          <Download size={16} />
        </button>
        <button
          onClick={onClearCanvas}
          className="p-2 rounded-lg text-[#666] hover:text-[#ef4444] hover:bg-[#1a1a1a] transition-all"
          title="Clear Canvas"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}

export function StylePanel({
  appState,
  onStateChange,
}: {
  appState: AppState;
  onStateChange: (state: Partial<AppState>) => void;
}) {
  return (
    <div className="absolute top-3 right-3 z-20 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#1a1a1a] rounded-xl p-3 shadow-2xl w-48">
      {/* Stroke Color */}
      <div className="mb-3">
        <label className="text-[10px] text-[#555] uppercase tracking-wider font-medium mb-1.5 block">
          Stroke
        </label>
        <div className="flex flex-wrap gap-1">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => onStateChange({ strokeColor: c })}
              className={`w-5 h-5 rounded-md border transition-all ${
                appState.strokeColor === c
                  ? "border-white scale-110"
                  : "border-[#333] hover:border-[#555]"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Fill Color */}
      <div className="mb-3">
        <label className="text-[10px] text-[#555] uppercase tracking-wider font-medium mb-1.5 block">
          Fill
        </label>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => onStateChange({ fillColor: "transparent" })}
            className={`w-5 h-5 rounded-md border transition-all relative overflow-hidden ${
              appState.fillColor === "transparent"
                ? "border-white scale-110"
                : "border-[#333] hover:border-[#555]"
            }`}
          >
            <div className="absolute inset-0 bg-[#1a1a1a]" />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-[#ef4444] rotate-45 origin-top-left translate-y-2" />
          </button>
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => onStateChange({ fillColor: c + "40" })}
              className={`w-5 h-5 rounded-md border transition-all ${
                appState.fillColor === c + "40"
                  ? "border-white scale-110"
                  : "border-[#333] hover:border-[#555]"
              }`}
              style={{ backgroundColor: c + "40" }}
            />
          ))}
        </div>
      </div>

      {/* Stroke Width */}
      <div className="mb-3">
        <label className="text-[10px] text-[#555] uppercase tracking-wider font-medium mb-1.5 block">
          Width: {appState.strokeWidth}
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={appState.strokeWidth}
          onChange={(e) => onStateChange({ strokeWidth: Number(e.target.value) })}
          className="w-full accent-[#ef4444] h-1"
        />
      </div>

      {/* Roughness */}
      <div className="mb-3">
        <label className="text-[10px] text-[#555] uppercase tracking-wider font-medium mb-1.5 block">
          Roughness: {appState.roughness}
        </label>
        <input
          type="range"
          min="0"
          max="3"
          step="0.5"
          value={appState.roughness}
          onChange={(e) => onStateChange({ roughness: Number(e.target.value) })}
          className="w-full accent-[#ef4444] h-1"
        />
      </div>

      {/* Opacity */}
      <div>
        <label className="text-[10px] text-[#555] uppercase tracking-wider font-medium mb-1.5 block">
          Opacity: {Math.round(appState.opacity * 100)}%
        </label>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={appState.opacity}
          onChange={(e) => onStateChange({ opacity: Number(e.target.value) })}
          className="w-full accent-[#ef4444] h-1"
        />
      </div>
    </div>
  );
}

export function ZoomControls({
  zoom,
  onZoomChange,
}: {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}) {
  return (
    <div className="absolute bottom-3 right-3 z-20 flex items-center gap-0.5 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#1a1a1a] rounded-xl px-1.5 py-1.5 shadow-2xl">
      <button
        onClick={() => onZoomChange(Math.max(0.1, zoom - 0.1))}
        className="p-1.5 rounded-lg text-[#666] hover:text-white hover:bg-[#1a1a1a] transition-all"
      >
        <ZoomOut size={14} />
      </button>
      <span className="text-[10px] text-[#888] w-10 text-center font-mono">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={() => onZoomChange(Math.min(5, zoom + 0.1))}
        className="p-1.5 rounded-lg text-[#666] hover:text-white hover:bg-[#1a1a1a] transition-all"
      >
        <ZoomIn size={14} />
      </button>
    </div>
  );
}
