import Link from "next/link";
import {
  Mic,
  PenLine,
  ClipboardCheck,
  ClipboardList,
  SlidersHorizontal,
  Clock,
  Timer,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import {
  SPEAKING_TASK_NAMES,
  SPEAKING_TASK_CONFIG,
  WRITING_TASK_CONFIG,
} from "@/lib/constants";

// ── Speaking: 8 official task types, names + timing from constants ──────────────
const SPEAKING_TASKS = Array.from({ length: 8 }, (_, i) => {
  const n = i + 1;
  const full = SPEAKING_TASK_NAMES[`task-${n}`] ?? `Task ${n}`;
  const cfg = SPEAKING_TASK_CONFIG[
    n as keyof typeof SPEAKING_TASK_CONFIG
  ] as { prep: number; response: number };
  return {
    n,
    name: full.includes("—") ? full.split("—")[1].trim() : full,
    prep: cfg.prep,
    response: cfg.response,
  };
});

// ── Writing: 2 task types, time limit + word range from constants ──────────────
const WRITING_TASKS = [
  {
    n: 1,
    name: "Writing an Email",
    minutes: WRITING_TASK_CONFIG[1].timeLimit / 60,
    minWords: WRITING_TASK_CONFIG[1].minWords,
    maxWords: WRITING_TASK_CONFIG[1].maxWords,
  },
  {
    n: 2,
    name: "Writing an Opinion Essay",
    minutes: WRITING_TASK_CONFIG[2].timeLimit / 60,
    minWords: WRITING_TASK_CONFIG[2].minWords,
    maxWords: WRITING_TASK_CONFIG[2].maxWords,
  },
];

const MOCK_POINTS = [
  "Official-style prep timer before every task",
  "Response windows that match the real exam",
  "Auto-submit the moment time runs out",
  "Estimated band score as soon as you finish",
];

// Mirrors the add-on store in PricingPreview / billing AddonGrid — teaser only.
const ADDONS = [
  { name: "Writing Pack", price: "$2.99", icon: <PenLine className="h-4 w-4 text-blue-400" /> },
  { name: "Speaking Pack", price: "$6.99", icon: <Mic className="h-4 w-4 text-emerald-400" /> },
  { name: "Mock Test Bundle", price: "$2.99", icon: <ClipboardList className="h-4 w-4 text-violet-400" /> },
  { name: "Custom Task Bundle", price: "$1.99", icon: <SlidersHorizontal className="h-4 w-4 text-primary" /> },
];

export function OfferingsSection() {
  return (
    <section id="offerings" className="relative overflow-hidden bg-[#080808] py-20 sm:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-10 h-[360px] w-[680px] -translate-x-1/2 rounded-full bg-primary/[0.05] blur-[150px]" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* header */}
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-white/90 sm:text-4xl">
            Built around the real CELPIP exam
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/55">
            The full set of Speaking and Writing tasks from the General test, with the same
            timing and word limits you&apos;ll meet on exam day.
          </p>
        </div>

        {/* ── Speaking — 8 task types ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/15">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white/90">Speaking — 8 task types</h3>
                <p className="text-sm text-white/55">All eight official tasks, with timed recording</p>
              </div>
            </div>
            <span className="hidden whitespace-nowrap rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary sm:inline">
              Timed
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {SPEAKING_TASKS.map((t) => (
              <div
                key={t.n}
                className="flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-primary/15 text-[11px] font-bold tabular-nums text-primary">
                    {t.n}
                  </span>
                  <span className="text-sm font-medium leading-tight text-white/80">{t.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-white/55">
                  <Timer className="h-3 w-3" />
                  {t.prep}s prep · {t.response}s speak
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Writing + Mock tests ────────────────────────────────────────────── */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Writing */}
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/15">
                <PenLine className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white/90">Writing — 2 task types</h3>
                <p className="text-sm text-white/55">Timed editor with a live word counter</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {WRITING_TASKS.map((t) => (
                <div
                  key={t.n}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-emerald-400/15 text-xs font-bold tabular-nums text-emerald-400">
                      {t.n}
                    </span>
                    <span className="text-sm font-medium text-white/80">{t.name}</span>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1.5 text-[11px] text-white/55">
                    <Clock className="h-3 w-3" />
                    {t.minutes} min · {t.minWords}–{t.maxWords} words
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mock tests */}
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-400/25 bg-indigo-400/15">
                <ClipboardCheck className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white/90">Full mock tests</h3>
                <p className="text-sm text-white/55">A complete exam in one sitting</p>
              </div>
            </div>

            <ul className="flex flex-col gap-3">
              {MOCK_POINTS.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm leading-relaxed text-white/65">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-400/80" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Add-ons teaser ──────────────────────────────────────────────────── */}
        <div className="mt-5 rounded-2xl border border-border bg-surface p-6 sm:p-7">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-white/90">Top up whenever you run low</h3>
              <p className="mt-1 text-sm text-white/55">
                One-time practice packs. Add only what you need.
              </p>
            </div>
            <Link
              href="#pricing"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
            >
              See all add-ons
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {ADDONS.map((a) => (
              <div
                key={a.name}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.08]">
                    {a.icon}
                  </div>
                  <span className="text-sm font-medium leading-tight text-white/75">{a.name}</span>
                </div>
                <span className="flex-shrink-0 text-sm font-bold tabular-nums text-white/90">{a.price}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
