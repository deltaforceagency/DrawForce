"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { DrawElement, Tool, AppState, ElementType } from "@/types";
import {
  createElement,
  updateElementPosition,
  isPointInElement,
  renderElements,
  exportToPNG,
} from "@/lib/canvas-engine";
import { Toolbar, StylePanel, ZoomControls } from "./Toolbar";
import { AIChatBox } from "./AIChatBox";

interface CanvasProps {
  elements: DrawElement[];
  onElementsChange: (elements: DrawElement[]) => void;
}

export function Canvas({ elements, onElementsChange }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [appState, setAppState] = useState<AppState>({
    tool: "freedraw",
    strokeColor: "#ffffff",
    fillColor: "transparent",
    strokeWidth: 2,
    opacity: 1,
    roughness: 1.5,
    zoom: 1,
    panX: 0,
    panY: 0,
  });

  const [drawing, setDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState<DrawElement | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<DrawElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState<{
    x: number;
    y: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Resize canvas — set physical pixel size, apply DPR scale
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      renderElements(canvas, elements, appState.panX, appState.panY, appState.zoom, selectedIds);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Re-render on changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const allElements = currentElement ? [...elements, currentElement] : elements;
    renderElements(canvas, allElements, appState.panX, appState.panY, appState.zoom, selectedIds);
  }, [elements, currentElement, appState.panX, appState.panY, appState.zoom, selectedIds]);

  function pushHistory(newElements: DrawElement[]) {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }

  function undo() {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onElementsChange(history[newIndex]);
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onElementsChange(history[newIndex]);
    }
  }

  function getCanvasPoint(e: React.MouseEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - appState.panX) / appState.zoom,
      y: (e.clientY - rect.top - appState.panY) / appState.zoom,
    };
  }

  function handleMouseDown(e: React.MouseEvent) {
    const { x, y } = getCanvasPoint(e);

    if (appState.tool === "pan" || e.button === 1 || (e.button === 0 && e.metaKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - appState.panX, y: e.clientY - appState.panY });
      return;
    }

    if (appState.tool === "select") {
      // Check if clicked on an element
      const clicked = [...elements].reverse().find((el) => isPointInElement(x, y, el));
      if (clicked) {
        setSelectedIds(new Set([clicked.id]));
        setDragStart({ x, y });
        setDrawing(true);
      } else {
        setSelectedIds(new Set());
      }
      return;
    }

    if (appState.tool === "eraser") {
      const toErase = elements.filter((el) => isPointInElement(x, y, el));
      if (toErase.length > 0) {
        const eraseIds = new Set(toErase.map((e) => e.id));
        const newElements = elements.filter((el) => !eraseIds.has(el.id));
        onElementsChange(newElements);
        pushHistory(newElements);
      }
      setDrawing(true);
      return;
    }

    if (appState.tool === "text") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      setTextInput({
        x,
        y,
        screenX: e.clientX - rect.left,
        screenY: e.clientY - rect.top,
      });
      return;
    }

    const toolToType: Record<string, ElementType> = {
      rectangle: "rectangle",
      ellipse: "ellipse",
      diamond: "diamond",
      line: "line",
      arrow: "arrow",
      freedraw: "freedraw",
    };

    const type = toolToType[appState.tool];
    if (!type) return;

    const el = createElement(
      type,
      x,
      y,
      appState.strokeColor,
      appState.fillColor,
      appState.strokeWidth,
      appState.opacity,
      appState.roughness
    );

    setCurrentElement(el);
    setDrawing(true);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (isPanning) {
      setAppState((s) => ({
        ...s,
        panX: e.clientX - panStart.x,
        panY: e.clientY - panStart.y,
      }));
      return;
    }

    if (!drawing) return;
    const { x, y } = getCanvasPoint(e);

    if (appState.tool === "select" && selectedIds.size > 0) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      const newElements = elements.map((el) => {
        if (selectedIds.has(el.id)) {
          return { ...el, x: el.x + dx, y: el.y + dy };
        }
        return el;
      });
      onElementsChange(newElements);
      setDragStart({ x, y });
      return;
    }

    if (appState.tool === "eraser") {
      const toErase = elements.filter((el) => isPointInElement(x, y, el));
      if (toErase.length > 0) {
        const eraseIds = new Set(toErase.map((e) => e.id));
        onElementsChange(elements.filter((el) => !eraseIds.has(el.id)));
      }
      return;
    }

    if (currentElement) {
      setCurrentElement(updateElementPosition(currentElement, x, y));
    }
  }

  function handleMouseUp() {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (appState.tool === "select" && drawing) {
      pushHistory(elements);
      setDrawing(false);
      return;
    }

    if (appState.tool === "eraser") {
      pushHistory(elements);
      setDrawing(false);
      return;
    }

    if (currentElement) {
      const newElements = [...elements, currentElement];
      onElementsChange(newElements);
      pushHistory(newElements);
      setCurrentElement(null);
    }
    setDrawing(false);
  }

  function handleWheel(e: React.WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setAppState((s) => ({
        ...s,
        zoom: Math.max(0.1, Math.min(5, s.zoom + delta)),
      }));
    } else {
      setAppState((s) => ({
        ...s,
        panX: s.panX - e.deltaX,
        panY: s.panY - e.deltaY,
      }));
    }
  }

  function handleTextSubmit(text: string) {
    if (!textInput || !text.trim()) {
      setTextInput(null);
      return;
    }
    const el = createElement(
      "text",
      textInput.x,
      textInput.y,
      appState.strokeColor,
      appState.fillColor,
      appState.strokeWidth,
      appState.opacity,
      appState.roughness
    );
    el.text = text;
    el.width = text.length * 10;
    el.height = 20;
    const newElements = [...elements, el];
    onElementsChange(newElements);
    pushHistory(newElements);
    setTextInput(null);
  }

  function handleExport() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = exportToPNG(canvas, elements);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "drawforce-export.png";
    a.click();
  }

  function handleClearCanvas() {
    onElementsChange([]);
    pushHistory([]);
    setSelectedIds(new Set());
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (textInput) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();

      if ((e.metaKey || e.ctrlKey) && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && key === "a") {
        e.preventDefault();
        setSelectedIds(new Set(elements.map((el) => el.id)));
        setAppState((s) => ({ ...s, tool: "select" }));
        return;
      }

      if (key === "delete" || key === "backspace") {
        if (selectedIds.size > 0) {
          const newElements = elements.filter((el) => !selectedIds.has(el.id));
          onElementsChange(newElements);
          pushHistory(newElements);
          setSelectedIds(new Set());
        }
        return;
      }

      const shortcutMap: Record<string, Tool> = {
        v: "select",
        h: "pan",
        r: "rectangle",
        o: "ellipse",
        d: "diamond",
        l: "line",
        a: "arrow",
        p: "freedraw",
        t: "text",
        e: "eraser",
      };

      if (shortcutMap[key] && !e.metaKey && !e.ctrlKey) {
        setAppState((s) => ({ ...s, tool: shortcutMap[key] }));
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [textInput, elements, selectedIds, historyIndex, history]);

  const cursorClass =
    appState.tool === "pan" || isPanning
      ? isPanning
        ? "cursor-grabbing"
        : "cursor-grab"
      : appState.tool === "text"
      ? "cursor-text"
      : appState.tool === "select"
      ? "cursor-default"
      : "cursor-crosshair";

  return (
    <div ref={containerRef} className={`relative flex-1 overflow-hidden bg-[#050505] ${cursorClass}`}>
      <Toolbar
        appState={appState}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onToolChange={(tool) => setAppState((s) => ({ ...s, tool }))}
        onStateChange={(partial) => setAppState((s) => ({ ...s, ...partial }))}
        onUndo={undo}
        onRedo={redo}
        onExport={handleExport}
        onClearCanvas={handleClearCanvas}
      />
      <StylePanel
        appState={appState}
        onStateChange={(partial) => setAppState((s) => ({ ...s, ...partial }))}
      />
      <ZoomControls
        zoom={appState.zoom}
        onZoomChange={(zoom) => setAppState((s) => ({ ...s, zoom }))}
      />

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="block w-full h-full"
      />

      {/* Text input overlay */}
      {textInput && (
        <textarea
          autoFocus
          className="absolute bg-transparent text-white outline-none border border-[#3b82f6] rounded px-1 py-0.5 text-sm font-sans resize-none min-w-[100px] min-h-[30px]"
          style={{
            left: textInput.screenX,
            top: textInput.screenY,
          }}
          onBlur={(e) => handleTextSubmit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleTextSubmit((e.target as HTMLTextAreaElement).value);
            }
            if (e.key === "Escape") {
              setTextInput(null);
            }
          }}
        />
      )}

      {/* AI Chat Box */}
      <AIChatBox
        existingElements={elements}
        onGenerateElements={(newEls) => {
          const merged = [...elements, ...newEls];
          onElementsChange(merged);
          pushHistory(merged);
        }}
      />

      {/* Element count */}
      <div className="absolute bottom-3 left-3 z-20 text-[10px] text-[#444] font-mono">
        {elements.length} element{elements.length !== 1 ? "s" : ""}
        {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
      </div>
    </div>
  );
}
