export type Tool =
  | "select"
  | "pan"
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "line"
  | "arrow"
  | "freedraw"
  | "text"
  | "eraser";

export type ElementType =
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "line"
  | "arrow"
  | "freedraw"
  | "text";

export interface Point {
  x: number;
  y: number;
}

export interface DrawElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Point[];
  text?: string;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  roughness: number;
  selected?: boolean;
  seed: number;
}

export interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  content?: string;
  canvasData?: DrawElement[];
  fileType?: "note" | "canvas";
  expanded?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AppState {
  tool: Tool;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  roughness: number;
  zoom: number;
  panX: number;
  panY: number;
}

export interface HistoryEntry {
  elements: DrawElement[];
  timestamp: number;
}
