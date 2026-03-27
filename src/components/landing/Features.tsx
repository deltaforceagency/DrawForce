"use client";

import {
  PenTool,
  FolderTree,
  Infinity,
  Sparkles,
  Download,
  Keyboard,
} from "lucide-react";

const features = [
  {
    icon: PenTool,
    title: "Hand-Drawn Feel",
    description:
      "Sketch with a natural, hand-drawn aesthetic powered by rough.js. Rectangles, ellipses, arrows, freehand — all with character.",
  },
  {
    icon: FolderTree,
    title: "Obsidian-Style Vault",
    description:
      "Organize your canvases and notes in a file tree with folders, drag-and-drop, and instant search. Your ideas, structured.",
  },
  {
    icon: Infinity,
    title: "Infinite Canvas",
    description:
      "Pan, zoom, and scroll without limits. Your whiteboard grows with your thinking. No edges, no constraints.",
  },
  {
    icon: Sparkles,
    title: "Dark-First Design",
    description:
      "Built for focus. A premium dark interface with red accents and glassmorphic controls that stay out of your way.",
  },
  {
    icon: Download,
    title: "Export Anywhere",
    description:
      "Export your work as PNG, SVG, or JSON. Share with your team, embed in docs, or save for later.",
  },
  {
    icon: Keyboard,
    title: "Keyboard-First",
    description:
      "Every tool has a shortcut. Undo, redo, select, draw — all without leaving the keyboard. Built for speed.",
  },
];

export function Features() {
  return (
    <section className="relative py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl md:text-4xl font-semibold mb-4">
          Everything you need to <span className="text-[#ef4444]">think visually</span>
        </h2>
        <p className="text-center text-[#666] mb-16 max-w-xl mx-auto">
          A complete creative workspace. No compromises.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="group relative rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-6 hover:border-[#2a2a2a] hover:bg-[#0e0e0e] transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${0.1 * i}s` }}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#ef444415] text-[#ef4444]">
                <feature.icon size={20} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-[#888] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
