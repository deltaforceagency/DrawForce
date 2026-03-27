import { FileNode, DrawElement } from "@/types";
import { v4 as uuid } from "uuid";

const STORAGE_KEY = "drawforce_vault";

function getDefaultVault(): FileNode[] {
  return [
    {
      id: uuid(),
      name: "Getting Started",
      type: "folder",
      expanded: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      children: [
        {
          id: uuid(),
          name: "Welcome",
          type: "file",
          fileType: "canvas",
          canvasData: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: uuid(),
          name: "My Notes",
          type: "file",
          fileType: "note",
          content: "# My Notes\n\nStart writing here...",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    },
  ];
}

export function loadVault(): FileNode[] {
  if (typeof window === "undefined") return getDefaultVault();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return getDefaultVault();
}

export function saveVault(vault: FileNode[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
}

export function findFile(
  nodes: FileNode[],
  id: string
): FileNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findFile(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

export function updateFile(
  nodes: FileNode[],
  id: string,
  updater: (node: FileNode) => FileNode
): FileNode[] {
  return nodes.map((node) => {
    if (node.id === id) return updater(node);
    if (node.children) {
      return { ...node, children: updateFile(node.children, id, updater) };
    }
    return node;
  });
}

export function deleteFile(nodes: FileNode[], id: string): FileNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => {
      if (n.children) {
        return { ...n, children: deleteFile(n.children, id) };
      }
      return n;
    });
}

export function addFileToFolder(
  nodes: FileNode[],
  folderId: string,
  newFile: FileNode
): FileNode[] {
  return nodes.map((node) => {
    if (node.id === folderId && node.type === "folder") {
      return {
        ...node,
        children: [...(node.children || []), newFile],
        updatedAt: Date.now(),
      };
    }
    if (node.children) {
      return {
        ...node,
        children: addFileToFolder(node.children, folderId, newFile),
      };
    }
    return node;
  });
}

export function saveCanvasToFile(
  vault: FileNode[],
  fileId: string,
  elements: DrawElement[]
): FileNode[] {
  return updateFile(vault, fileId, (node) => ({
    ...node,
    canvasData: elements,
    updatedAt: Date.now(),
  }));
}

export function saveNoteContent(
  vault: FileNode[],
  fileId: string,
  content: string
): FileNode[] {
  return updateFile(vault, fileId, (node) => ({
    ...node,
    content,
    updatedAt: Date.now(),
  }));
}
