"use client";

import { PLOTTING_GUIDANCE_CARDS } from "@/lib/evaluator/policy-violation-faq";

export function EvaluatorGuidanceCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {PLOTTING_GUIDANCE_CARDS.map((card) => (
        <div
          key={card.title}
          className="rounded-lg border border-black/10 bg-white px-3 py-2.5 shadow-sm text-[12px] leading-snug"
        >
          <p className="font-bold text-black/85 mb-1">{card.title}</p>
          <p className="text-black/65">{card.body}</p>
        </div>
      ))}
    </div>
  );
}
