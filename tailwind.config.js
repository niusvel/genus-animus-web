/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "var(--color-terminal-bg)",
          text: "var(--color-terminal-text)",
          glow: "var(--color-terminal-glow)",
          accent: "var(--color-terminal-accent)",
          border: "var(--color-terminal-border)",
          muted: "var(--color-terminal-muted)",
        }
      },
      fontFamily: {
        terminal: ["var(--font-terminal)", "monospace"],
      },
      animation: {
        "crt-flicker": "crt-flicker 0.15s infinite",
        "pulse-slow": "pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "cursor-blink": "cursor-blink 1s step-end infinite",
        "glitch": "glitch 1s linear infinite",
      },
      keyframes: {
        "crt-flicker": {
          "0%": { opacity: "0.985" },
          "50%": { opacity: "0.995" },
          "100%": { opacity: "0.99" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1", filter: "brightness(1) contrast(1)" },
          "50%": { opacity: "0.85", filter: "brightness(0.9) contrast(1.1)" },
        },
        "cursor-blink": {
          "from, to": { backgroundColor: "transparent" },
          "50%": { backgroundColor: "currentColor" },
        },
        "glitch": {
          "0%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(-2px, -2px)" },
          "60%": { transform: "translate(2px, 2px)" },
          "80%": { transform: "translate(2px, -2px)" },
          "100%": { transform: "translate(0)" },
        }
      }
    },
  },
  plugins: [],
}
