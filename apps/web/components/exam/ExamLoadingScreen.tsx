"use client";

// ExamLoadingScreen — shown while the 8 mock exam prompts are being fetched.

import { Mic } from "lucide-react";

export function ExamLoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-canvas gap-8">
      {/* Animated mic ring */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full border-2 border-indigo-500/20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/40 animate-ping" />
          <div className="w-16 h-16 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Mic className="w-8 h-8 text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="text-center space-y-3">
        <p className="text-lg font-semibold text-foreground">Preparing your exam</p>
        <p className="text-sm text-subtle">Loading 8 tasks — this takes just a moment…</p>
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
