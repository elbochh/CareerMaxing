import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0a0f",
          subtle: "#101019",
          card: "#13131d",
          elevated: "#1a1a26",
        },
        border: {
          DEFAULT: "#23232f",
          strong: "#2f2f3f",
        },
        accent: {
          DEFAULT: "#7c5cff",
          glow: "#9d85ff",
          muted: "#5a3fd4",
        },
        success: "#34d399",
        warning: "#fbbf24",
        danger: "#f87171",
        muted: {
          DEFAULT: "#8a8aa3",
          strong: "#b8b8d0",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.5)",
        glow: "0 0 0 1px rgba(124,92,255,0.4), 0 0 40px -10px rgba(124,92,255,0.5)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.1rem",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
