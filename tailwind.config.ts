import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: { DEFAULT: "#8B5CF6", light: "#A78BFA", dark: "#6D28D9", 50: "#F5F3FF", 100: "#EDE9FE", 200: "#DDD6FE", 300: "#C4B5FD", 400: "#A78BFA", 500: "#8B5CF6", 600: "#7C3AED", 700: "#6D28D9", 800: "#5B21B6", 900: "#4C1D95" },
          blue: { DEFAULT: "#3B82F6", light: "#60A5FA", dark: "#2563EB" },
          cyan: { DEFAULT: "#06B6D4", light: "#22D3EE", dark: "#0891B2" },
          magenta: { DEFAULT: "#D946EF", light: "#E879F9", dark: "#C026D3" },
        },
        surface: { DEFAULT: "#1A1A2E", light: "#16213E", dark: "#0B0B14", hover: "#252547", border: "#334155" },
        success: { DEFAULT: "#22C55E", light: "#4ADE80", dark: "#16A34A", bg: "#052E16" },
        warning: { DEFAULT: "#F59E0B", light: "#FBBF24", dark: "#D97706", bg: "#451A03" },
        danger: { DEFAULT: "#EF4444", light: "#F87171", dark: "#DC2626", bg: "#450A0A" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 50%, #06B6D4 100%)",
        "gradient-purple": "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
        "gradient-surface": "linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)",
      },
      boxShadow: {
        "glow-purple": "0 0 20px rgba(139, 92, 246, 0.3)",
        "glow-cyan": "0 0 20px rgba(6, 182, 212, 0.3)",
        "card-dark": "0 4px 24px rgba(0, 0, 0, 0.4)",
        "card-light": "0 4px 24px rgba(0, 0, 0, 0.08)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "slide-in-left": "slideInLeft 0.3s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(20px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        slideInLeft: { "0%": { opacity: "0", transform: "translateX(-20px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
