import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // ── Brand (dark-optimised, amber-gold theme) ────────────────────────
        primary: {
          DEFAULT:    "#C8963E",   // warm amber-gold
          hover:      "#D4A853",   // brighter gold on hover
          light:      "#2A1E0A",   // dark amber tint for backgrounds
          foreground: "#0D0D0D",   // near-black text on gold CTA
        },
        success: { DEFAULT: "#34D399", light: "#064E3B", foreground: "#fff" },
        warning: { DEFAULT: "#FBBF24", light: "#451A03", foreground: "#fff" },
        danger:  { DEFAULT: "#F87171", light: "#450A0A", foreground: "#fff" },
        // ── Dark Neutrals ───────────────────────────────────────────────────
        surface:  "#111111",      // card / panel / navbar backgrounds
        muted:    "#000000",      // page background (pure black)
        border:   "#252836",      // dividers, card borders
        subtle:   "#8892A4",      // secondary / muted text
        // ── Practice full-screen dark mode ─────────────────────────────────
        canvas:        "#08090F",  // practice session bg
        "canvas-muted":  "#0D0F17",
        "canvas-text":   "#E2E6F0",
        "canvas-subtle": "#6B7280",
        // ── shadcn/ui required HSL tokens ───────────────────────────────────
        background: "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        input:  "hsl(var(--input))",
        ring:   "hsl(var(--ring))",
      },
      fontFamily: {
        sans:  ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-source-serif)", "Georgia", "serif"],
        mono:  ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        lg:   "var(--radius)",
        md:   "calc(var(--radius) - 2px)",
        sm:   "calc(var(--radius) - 4px)",
        xl:   "1rem",
        "2xl":"1.5rem",
      },
      boxShadow: {
        card:   "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)",
        panel:  "0 10px 25px rgba(0,0,0,0.08)",
        focus:  "0 0 0 3px rgba(200,150,62,0.35)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.20)",
      },
      keyframes: {
        // shadcn/ui animations
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        // Practice-mode animations
        "pulse-ring": {
          "0%, 100%": { transform: "scale(1)",    opacity: "1"   },
          "50%":       { transform: "scale(1.05)", opacity: "0.8" },
        },
        "waveform-bar": {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%":       { transform: "scaleY(1)"   },
        },
        "countdown-in": {
          "0%":   { opacity: "0", transform: "scale(1.4)" },
          "100%": { opacity: "1", transform: "scale(1)"   },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)"   },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "pulse-ring":     "pulse-ring 1.5s ease-in-out infinite",
        "waveform-bar":   "waveform-bar 0.8s ease-in-out infinite",
        "countdown-in":   "countdown-in 0.35s ease-out",
        "fade-in":        "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
};

export default config;
