"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

const rotatingWords = [
  "Whiteboarding.",
  "Note-Taking.",
  "Brainstorming.",
  "Diagramming.",
  "Sketching.",
  "Planning.",
];

export function Hero() {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = rotatingWords[wordIndex];
    const speed = isDeleting ? 40 : 80;

    if (!isDeleting && displayed === word) {
      const pause = setTimeout(() => setIsDeleting(true), 1800);
      return () => clearTimeout(pause);
    }

    if (isDeleting && displayed === "") {
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % rotatingWords.length);
      return;
    }

    const timer = setTimeout(() => {
      setDisplayed(
        isDeleting ? word.slice(0, displayed.length - 1) : word.slice(0, displayed.length + 1)
      );
    }, speed);

    return () => clearTimeout(timer);
  }, [displayed, isDeleting, wordIndex]);

  return (
    <section className="relative flex flex-col items-center justify-center px-6 text-center min-h-screen">
      {/* Grid background */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_40%,transparent_100%)]" />

      {/* Badge */}
      <div className="mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="relative flex items-center rounded-full border border-[#2a2a2a] bg-[#0a0a0a] px-4 py-1.5 text-xs text-[#888]">
          Now in Beta
          <Link
            href="/workspace"
            className="ml-2 flex items-center font-semibold text-[#ef4444] hover:text-[#f87171] transition-colors"
          >
            Try it free <span className="ml-1">&rarr;</span>
          </Link>
        </div>
      </div>

      {/* Main heading container with corner brackets */}
      <div className="mx-auto max-w-5xl animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <div className="relative border border-[#1a1a1a] bg-[#050505] py-12 px-8 md:px-16 [mask-image:radial-gradient(800rem_96rem_at_center,white,transparent)]">
          {/* Corner plus icons */}
          <Plus strokeWidth={3} className="text-[#ef4444] absolute -left-4 -top-4 h-8 w-8" />
          <Plus strokeWidth={3} className="text-[#ef4444] absolute -right-4 -top-4 h-8 w-8" />
          <Plus strokeWidth={3} className="text-[#ef4444] absolute -left-4 -bottom-4 h-8 w-8" />
          <Plus strokeWidth={3} className="text-[#ef4444] absolute -right-4 -bottom-4 h-8 w-8" />

          <h1 className="text-4xl md:text-7xl lg:text-8xl font-semibold leading-tight tracking-tight">
            Your creative space for{" "}
            <span className="text-[#ef4444]">{displayed}<span className="animate-pulse">|</span></span>
          </h1>

          {/* Status indicator */}
          <div className="flex items-center mt-6 justify-center gap-1.5">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
            </span>
            <p className="text-xs text-[#22c55e] font-medium">Available Now</p>
          </div>
        </div>

        {/* Description */}
        <div className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <h2 className="mt-10 text-xl md:text-2xl font-normal">
            Organize like <span className="text-[#ef4444] font-bold">Obsidian</span>.
            Create like <span className="text-[#3b82f6] font-bold">Excalidraw</span>.
          </h2>

          <p className="text-[#666] py-4 max-w-2xl mx-auto text-sm md:text-base">
            A premium knowledge workspace that combines the power of linked notes
            with an infinite canvas. Think, sketch, and connect your ideas — all in one place.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center justify-center gap-3 mt-2 animate-fade-in" style={{ animationDelay: "0.6s" }}>
          <Link href="/workspace">
            <div className="relative rounded-xl p-[2px] shine-border">
              <button className="relative rounded-[10px] bg-[#050505] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#111] transition-colors">
                Start Creating
              </button>
            </div>
          </Link>
          <Link href="https://github.com" target="_blank">
            <button className="rounded-xl border border-[#2a2a2a] bg-transparent px-6 py-2.5 text-sm font-medium text-[#ccc] hover:bg-[#111] hover:text-white transition-colors">
              View on GitHub
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
