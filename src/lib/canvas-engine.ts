import rough from "roughjs";
import type { Options as RoughOptions } from "roughjs/bin/core";
import { DrawElement, Point, ElementType } from "@/types";
import { v4 as uuid } from "uuid";

// ── Hand-drawn font ─────────────────────────────────────────────────
const HAND_FONT = '"Caveat", cursive';

// ── Element Creation ────────────────────────────────────────────────

export function createElement(
  type: ElementType,
  x: number,
  y: number,
  strokeColor: string,
  fillColor: string,
  strokeWidth: number,
  opacity: number,
  roughness: number
): DrawElement {
  return {
    id: uuid(),
    type,
    x,
    y,
    width: 0,
    height: 0,
    points: type === "freedraw" ? [{ x: 0, y: 0 }] : undefined,
    strokeColor,
    fillColor,
    strokeWidth,
    opacity,
    roughness,
    seed: Math.floor(Math.random() * 2 ** 31),
  };
}

export function updateElementPosition(
  element: DrawElement,
  x2: number,
  y2: number
): DrawElement {
  if (element.type === "freedraw" && element.points) {
    return {
      ...element,
      points: [...element.points, { x: x2 - element.x, y: y2 - element.y }],
    };
  }
  return {
    ...element,
    width: x2 - element.x,
    height: y2 - element.y,
  };
}

// ── Hit Testing ─────────────────────────────────────────────────────

export function isPointInElement(
  x: number,
  y: number,
  el: DrawElement,
  tolerance: number = 5
): boolean {
  const minX = Math.min(el.x, el.x + el.width) - tolerance;
  const maxX = Math.max(el.x, el.x + el.width) + tolerance;
  const minY = Math.min(el.y, el.y + el.height) - tolerance;
  const maxY = Math.max(el.y, el.y + el.height) + tolerance;

  if (el.type === "freedraw" && el.points) {
    for (const pt of el.points) {
      const px = el.x + pt.x;
      const py = el.y + pt.y;
      if (Math.abs(px - x) < tolerance * 2 && Math.abs(py - y) < tolerance * 2) {
        return true;
      }
    }
    return false;
  }

  if (el.type === "line" || el.type === "arrow") {
    const dist = distToSegment(
      { x, y },
      { x: el.x, y: el.y },
      { x: el.x + el.width, y: el.y + el.height }
    );
    return dist < tolerance * 3;
  }

  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

function distToSegment(p: Point, v: Point, w: Point): number {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt(
    (p.x - (v.x + t * (w.x - v.x))) ** 2 +
      (p.y - (v.y + t * (w.y - v.y))) ** 2
  );
}

// ── Helper: draw rough.js drawable through the current ctx transform ──
// rough.canvas() ignores ctx transforms and writes at native pixel coords.
// We use rough.generator() to get path data, then draw it manually through
// the ctx so our translate/scale/DPR chain is respected.

function drawRoughDrawable(
  ctx: CanvasRenderingContext2D,
  drawable: ReturnType<ReturnType<typeof rough.generator>["rectangle"]>
) {
  const sets = drawable.sets;
  for (const set of sets) {
    if (set.type === "fillSketch" || set.type === "fillPath") {
      ctx.save();
      ctx.strokeStyle = set.ops.length > 0 ? (drawable.options.fill || "#000") : "none";
      ctx.lineWidth = drawable.options.fillWeight || 1;
      if (set.type === "fillPath") {
        // Solid fill via path
        ctx.fillStyle = drawable.options.fill || "#000";
        const p = new Path2D(set.path || "");
        ctx.fill(p);
      } else {
        // Hachure/cross-hatch sketch lines
        ctx.beginPath();
        for (const op of set.ops) {
          if (op.op === "move") ctx.moveTo(op.data[0], op.data[1]);
          else if (op.op === "lineTo") ctx.lineTo(op.data[0], op.data[1]);
          else if (op.op === "bcurveTo") ctx.bezierCurveTo(op.data[0], op.data[1], op.data[2], op.data[3], op.data[4], op.data[5]);
        }
        ctx.stroke();
      }
      ctx.restore();
    } else if (set.type === "path") {
      ctx.save();
      ctx.strokeStyle = drawable.options.stroke || "#fff";
      ctx.lineWidth = drawable.options.strokeWidth || 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (const op of set.ops) {
        if (op.op === "move") ctx.moveTo(op.data[0], op.data[1]);
        else if (op.op === "lineTo") ctx.lineTo(op.data[0], op.data[1]);
        else if (op.op === "bcurveTo") ctx.bezierCurveTo(op.data[0], op.data[1], op.data[2], op.data[3], op.data[4], op.data[5]);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ── Main Render ─────────────────────────────────────────────────────

export function renderElements(
  canvas: HTMLCanvasElement,
  elements: DrawElement[],
  panX: number,
  panY: number,
  zoom: number,
  selectedIds: Set<string>
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Clear with dark background
  ctx.save();
  ctx.resetTransform();
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  ctx.save();
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  // Dot grid
  drawDotGrid(ctx, canvas.width, canvas.height, panX, panY, zoom);

  // Use rough.generator so we control the drawing through ctx transforms
  const gen = rough.generator();

  for (const el of elements) {
    ctx.save();
    ctx.globalAlpha = el.opacity;

    const hasFill = el.fillColor && el.fillColor !== "transparent";

    const opts: RoughOptions = {
      stroke: el.strokeColor,
      strokeWidth: Math.max(el.strokeWidth, 1.5),
      roughness: Math.max(el.roughness, 1),
      seed: el.seed,
      bowing: 1.5,
      curveFitting: 0.95,
      curveStepCount: 12,
    };

    if (hasFill) {
      const isAlpha = el.fillColor.length > 7;
      if (isAlpha) {
        opts.fill = el.fillColor.slice(0, 7);
        opts.fillStyle = "cross-hatch";
        opts.fillWeight = 1.2;
        opts.hachureGap = 5;
        opts.hachureAngle = -41;
      } else {
        opts.fill = el.fillColor;
        opts.fillStyle = "solid";
      }
    }

    // For solid fills, draw the fill shape first manually, THEN draw rough
    // strokes on top — this ensures vivid, opaque fills like real Excalidraw
    const isSolidFill = hasFill && el.fillColor.length <= 7;

    if (isSolidFill) {
      ctx.save();
      ctx.fillStyle = el.fillColor;
      switch (el.type) {
        case "rectangle":
          ctx.fillRect(el.x, el.y, el.width, el.height);
          break;
        case "ellipse":
          ctx.beginPath();
          ctx.ellipse(el.x + el.width / 2, el.y + el.height / 2, Math.abs(el.width) / 2, Math.abs(el.height) / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "diamond": {
          const dcx = el.x + el.width / 2;
          const dcy = el.y + el.height / 2;
          const dhw = Math.abs(el.width) / 2;
          const dhh = Math.abs(el.height) / 2;
          ctx.beginPath();
          ctx.moveTo(dcx, dcy - dhh);
          ctx.lineTo(dcx + dhw, dcy);
          ctx.lineTo(dcx, dcy + dhh);
          ctx.lineTo(dcx - dhw, dcy);
          ctx.closePath();
          ctx.fill();
          break;
        }
      }
      ctx.restore();
      // Remove fill from rough opts so it only draws the stroke wobble
      opts.fill = undefined;
      opts.fillStyle = undefined;
    }

    switch (el.type) {
      case "rectangle": {
        const d = gen.rectangle(el.x, el.y, el.width, el.height, opts);
        drawRoughDrawable(ctx, d);
        break;
      }

      case "ellipse": {
        const d = gen.ellipse(
          el.x + el.width / 2,
          el.y + el.height / 2,
          Math.abs(el.width),
          Math.abs(el.height),
          opts
        );
        drawRoughDrawable(ctx, d);
        break;
      }

      case "diamond": {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const hw = Math.abs(el.width) / 2;
        const hh = Math.abs(el.height) / 2;
        const d = gen.polygon(
          [
            [cx, cy - hh],
            [cx + hw, cy],
            [cx, cy + hh],
            [cx - hw, cy],
          ],
          opts
        );
        drawRoughDrawable(ctx, d);
        break;
      }

      case "line": {
        const d = gen.line(el.x, el.y, el.x + el.width, el.y + el.height, opts);
        drawRoughDrawable(ctx, d);
        break;
      }

      case "arrow": {
        const x1 = el.x;
        const y1 = el.y;
        const x2 = el.x + el.width;
        const y2 = el.y + el.height;

        // Organic curved arrow
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const curvature = Math.min(len * 0.07, 25);
        const cpX = midX + (-dy / len) * curvature;
        const cpY = midY + (dx / len) * curvature;

        ctx.strokeStyle = el.strokeColor;
        ctx.lineWidth = Math.max(el.strokeWidth, 2);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Draw shaft with slight hand-drawn wobble
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        // Add tiny random wobble points for hand-drawn feel
        const segments = 8;
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          // Quadratic bezier point
          const qx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cpX + t * t * x2;
          const qy = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cpY + t * t * y2;
          // Add subtle wobble using seed for determinism
          const wobble = Math.sin(el.seed + i * 7) * 1.5;
          const perpX = -dy / len;
          const perpY = dx / len;
          ctx.lineTo(qx + perpX * wobble, qy + perpY * wobble);
        }
        ctx.stroke();

        // Arrowhead — chunky, slightly irregular
        const angle = Math.atan2(y2 - cpY, x2 - cpX);
        const headLen = Math.max(18, el.strokeWidth * 7);
        const headAngle = Math.PI / 5;

        ctx.beginPath();
        ctx.moveTo(
          x2 - headLen * Math.cos(angle - headAngle),
          y2 - headLen * Math.sin(angle - headAngle)
        );
        ctx.lineTo(x2, y2);
        ctx.lineTo(
          x2 - headLen * Math.cos(angle + headAngle),
          y2 - headLen * Math.sin(angle + headAngle)
        );
        ctx.stroke();
        break;
      }

      case "freedraw": {
        if (el.points && el.points.length > 1) {
          ctx.strokeStyle = el.strokeColor;
          ctx.lineWidth = Math.max(el.strokeWidth, 1.5);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          ctx.beginPath();
          const p0 = el.points[0];
          ctx.moveTo(el.x + p0.x, el.y + p0.y);

          for (let i = 1; i < el.points.length - 1; i++) {
            const p = el.points[i];
            const pNext = el.points[i + 1];
            const cpx = el.x + p.x;
            const cpy = el.y + p.y;
            const nx = el.x + pNext.x;
            const ny = el.y + pNext.y;
            ctx.quadraticCurveTo(cpx, cpy, (cpx + nx) / 2, (cpy + ny) / 2);
          }

          const last = el.points[el.points.length - 1];
          ctx.lineTo(el.x + last.x, el.y + last.y);
          ctx.stroke();
        }
        break;
      }

      case "text": {
        const fontSize = el.strokeWidth * 8 + 18;
        ctx.font = `600 ${fontSize}px ${HAND_FONT}`;
        ctx.fillStyle = el.strokeColor;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";

        const lines = (el.text || "").split("\n");
        const lineHeight = fontSize * 1.3;
        const totalH = lines.length * lineHeight;
        const startY = el.y + (el.height > 0 ? el.height / 2 : fontSize / 2) - totalH / 2 + lineHeight / 2;
        const centerX = el.x + (el.width > 0 ? el.width / 2 : 0);

        lines.forEach((line, i) => {
          ctx.fillText(line, centerX, startY + i * lineHeight);
        });
        break;
      }
    }

    // Selection box
    if (selectedIds.has(el.id)) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1.5 / zoom;
      ctx.setLineDash([5 / zoom, 4 / zoom]);
      const pad = 8;

      if (el.type === "freedraw" && el.points) {
        let fMinX = Infinity, fMinY = Infinity, fMaxX = -Infinity, fMaxY = -Infinity;
        for (const p of el.points) {
          fMinX = Math.min(fMinX, el.x + p.x);
          fMinY = Math.min(fMinY, el.y + p.y);
          fMaxX = Math.max(fMaxX, el.x + p.x);
          fMaxY = Math.max(fMaxY, el.y + p.y);
        }
        ctx.strokeRect(fMinX - pad, fMinY - pad, fMaxX - fMinX + pad * 2, fMaxY - fMinY + pad * 2);
      } else {
        const rx = Math.min(el.x, el.x + el.width);
        const ry = Math.min(el.y, el.y + el.height);
        ctx.strokeRect(rx - pad, ry - pad, Math.abs(el.width) + pad * 2, Math.abs(el.height) + pad * 2);
      }
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  ctx.restore();
}

// ── Dot Grid (Excalidraw-style) ─────────────────────────────────────

function drawDotGrid(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  panX: number,
  panY: number,
  zoom: number
) {
  const gridSize = 20;
  ctx.fillStyle = "#ffffff10";

  const dpr = (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;
  const logicalW = canvasW / dpr;
  const logicalH = canvasH / dpr;

  const startX = Math.floor(-panX / zoom / gridSize) * gridSize - gridSize;
  const startY = Math.floor(-panY / zoom / gridSize) * gridSize - gridSize;
  const endX = startX + logicalW / zoom + gridSize * 2;
  const endY = startY + logicalH / zoom + gridSize * 2;

  for (let x = startX; x <= endX; x += gridSize) {
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ── Export ───────────────────────────────────────────────────────────

export function exportToPNG(
  canvas: HTMLCanvasElement,
  elements: DrawElement[],
  padding: number = 40
): string {
  if (elements.length === 0) return canvas.toDataURL("image/png");

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const el of elements) {
    if (el.type === "freedraw" && el.points) {
      for (const p of el.points) {
        minX = Math.min(minX, el.x + p.x);
        minY = Math.min(minY, el.y + p.y);
        maxX = Math.max(maxX, el.x + p.x);
        maxY = Math.max(maxY, el.y + p.y);
      }
    } else {
      minX = Math.min(minX, el.x, el.x + el.width);
      minY = Math.min(minY, el.y, el.y + el.height);
      maxX = Math.max(maxX, el.x, el.x + el.width);
      maxY = Math.max(maxY, el.y, el.y + el.height);
    }
  }

  const w = maxX - minX + padding * 2;
  const h = maxY - minY + padding * 2;

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = w;
  exportCanvas.height = h;

  renderElements(exportCanvas, elements, -minX + padding, -minY + padding, 1, new Set());

  return exportCanvas.toDataURL("image/png");
}
