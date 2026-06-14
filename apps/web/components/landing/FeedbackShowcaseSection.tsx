"use client";

// ─────────────────────────────────────────────────────────────────────────────
// FeedbackShowcaseSection — the "outcomes" section. An auto-sliding carousel
// cycles through static replicas of the real AI report cards, each with a
// caption explaining that feedback type. Custom slider (no carousel dep):
// slides are absolutely positioned and stage-sized so they can never overflow
// the column; the active one cross-slides in. Autoplay pauses on hover/focus
// and is disabled under reduced-motion. The left list doubles as navigation.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { ScoreGaugePreview } from "./report-previews/ScoreGaugePreview";
import { DimensionPreview } from "./report-previews/DimensionPreview";
import { FeedbackPreview } from "./report-previews/FeedbackPreview";
import { TipsPreview } from "./report-previews/TipsPreview";
import { AnalyticsPreview } from "./report-previews/AnalyticsPreview";

const SLIDES = [
  {
    key: "band",
    title: "Band score",
    caption: "An estimated CELPIP band for every answer, on the official 1–12 scale.",
    Preview: ScoreGaugePreview,
  },
  {
    key: "dimensions",
    title: "Dimension breakdown",
    caption: "See where you scored, dimension by dimension.",
    Preview: DimensionPreview,
  },
  {
    key: "feedback",
    title: "Strengths & fixes",
    caption: "Your strengths and the specific gaps costing you marks, quoted from your own answer.",
    Preview: FeedbackPreview,
  },
  {
    key: "tips",
    title: "Improvement plan",
    caption: "A numbered set of drills to raise your band on the next attempt.",
    Preview: TipsPreview,
  },
  {
    key: "analytics",
    title: "Speech & essay analytics",
    caption: "A closer look at your delivery: speaking pace, vocabulary range and sentence variety.",
    Preview: AnalyticsPreview,
  },
];

const INTERVAL_MS = 4500;
const COUNT = SLIDES.length;

export function FeedbackShowcaseSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);             // hover / focus pause
  const [manualPaused, setManualPaused] = useState(false); // explicit pause button
  const [liveMsg, setLiveMsg] = useState("");              // sr-only announcement
  const reduced = usePrefersReducedMotion();

  const go = (i: number) => {
    const idx = ((i % COUNT) + COUNT) % COUNT;
    setActive(idx);
    setLiveMsg(`Showing ${idx + 1} of ${COUNT}: ${SLIDES[idx].title}`);
  };

  // Autoplay — disabled when manually paused, on hover/focus, or under reduced-motion.
  useEffect(() => {
    if (paused || manualPaused || reduced) return;
    const id = setInterval(() => setActive((i) => (i + 1) % COUNT), INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, manualPaused, reduced]);

  return (
    <section id="feedback" className="relative overflow-hidden bg-black py-20 sm:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-1/4 h-[420px] w-[520px] rounded-full bg-primary/[0.05] blur-[150px]" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* header */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-white/90 sm:text-4xl">
            Every answer comes back with a full coaching report
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/55">
            You get more than a number. Each answer is broken down by dimension, with the
            moments that cost you marks and the changes that would lift your next band.
          </p>
        </div>

        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          {/* left — nav list (desktop) */}
          <ul className="hidden flex-col gap-2 lg:flex">
            {SLIDES.map((s, i) => {
              const on = i === active;
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={on ? "true" : undefined}
                    className={`flex w-full gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
                      on
                        ? "border-primary/30 bg-white/[0.04]"
                        : "border-white/[0.07] bg-transparent hover:border-white/15"
                    }`}
                  >
                    <span
                      className={`mt-0.5 h-9 w-0.5 flex-shrink-0 rounded-full transition-colors ${
                        on ? "bg-primary" : "bg-white/10"
                      }`}
                    />
                    <span>
                      <span className={`block text-sm font-semibold ${on ? "text-white/90" : "text-white/60"}`}>
                        {s.title}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-white/55">
                        {s.caption}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* right — stage. min-w-0 stops the carousel from blowing out the grid column. */}
          <div
            className="flex min-w-0 flex-col gap-5"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
          >
            {/* caption (mobile only — desktop shows it in the list) */}
            <div className="lg:hidden">
              <p className="text-sm font-semibold text-white/90">{SLIDES[active].title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/55">{SLIDES[active].caption}</p>
            </div>

            <div
              role="group"
              aria-roledescription="carousel"
              aria-label="Example AI feedback report"
              className="relative h-[500px] overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-transparent sm:h-[480px]"
            >
              <span className="pointer-events-none absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-medium text-white/35 backdrop-blur">
                Sample report · illustrative
              </span>

              {SLIDES.map((s, i) => {
                const on = i === active;
                return (
                  <div
                    key={s.key}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${i + 1} of ${COUNT}: ${s.title}`}
                    aria-hidden={!on}
                    className="absolute inset-0 flex items-center justify-center px-4 transition-all duration-500 ease-out sm:px-8"
                    style={{
                      opacity: on ? 1 : 0,
                      transform: on ? "translateX(0)" : "translateX(28px)",
                      pointerEvents: on ? "auto" : "none",
                    }}
                  >
                    <s.Preview />
                  </div>
                );
              })}
            </div>

            {/* controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2" role="group" aria-label="Choose a feedback example">
                {SLIDES.map((s, i) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Show ${s.title}`}
                    aria-current={i === active ? "true" : undefined}
                    className={`h-2 rounded-full transition-all duration-200 ${
                      i === active ? "w-6 bg-primary" : "w-2 bg-white/15 hover:bg-white/30"
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setManualPaused((p) => !p)}
                  aria-label={manualPaused ? "Play automatic rotation" : "Pause automatic rotation"}
                  aria-pressed={manualPaused}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/60 transition-colors hover:border-white/25 hover:text-white"
                >
                  {manualPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => go(active - 1)}
                  aria-label="Previous example"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/60 transition-colors hover:border-white/25 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => go(active + 1)}
                  aria-label="Next example"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/60 transition-colors hover:border-white/25 hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* sr-only live region — announces only on user navigation, not autoplay */}
            <div aria-live="polite" className="sr-only">{liveMsg}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
