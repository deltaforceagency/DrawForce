"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export function CTA() {
  return (
    <section className="relative py-24 px-6">
      <div className="mx-auto max-w-3xl text-center">
        <div className="relative border border-[#1a1a1a] bg-[#0a0a0a] rounded-2xl p-12 md:p-16">
          <Plus strokeWidth={3} className="text-[#ef4444] absolute -left-3 -top-3 h-6 w-6" />
          <Plus strokeWidth={3} className="text-[#ef4444] absolute -right-3 -top-3 h-6 w-6" />
          <Plus strokeWidth={3} className="text-[#ef4444] absolute -left-3 -bottom-3 h-6 w-6" />
          <Plus strokeWidth={3} className="text-[#ef4444] absolute -right-3 -bottom-3 h-6 w-6" />

          <h2 className="text-3xl md:text-5xl font-semibold mb-4">
            Ready to <span className="text-[#ef4444]">create</span>?
          </h2>
          <p className="text-[#666] mb-8 max-w-lg mx-auto">
            Your infinite canvas is waiting. Start sketching, organizing, and
            connecting your ideas right now.
          </p>
          <Link href="/workspace">
            <div className="inline-block relative rounded-xl p-[2px] shine-border">
              <button className="relative rounded-[10px] bg-[#050505] px-8 py-3 text-sm font-semibold text-white hover:bg-[#111] transition-colors">
                Launch DrawForce
              </button>
            </div>
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-16 flex items-center justify-center gap-6 text-xs text-[#444]">
          <span>&copy; {new Date().getFullYear()} DrawForce</span>
          <span>&middot;</span>
          <span>Built with Next.js</span>
          <span>&middot;</span>
          <span>Open Source</span>
        </div>
      </div>
    </section>
  );
}
