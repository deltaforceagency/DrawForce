"use client";

import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { CTA } from "@/components/landing/CTA";

export default function Home() {
  return (
    <main className="overflow-hidden">
      <Hero />
      <Features />
      <CTA />
    </main>
  );
}
