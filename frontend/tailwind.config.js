/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // "Slate ink" identity: a cool graphite base with a single warm
        // signal color (amber) reserved for active/streaming state only.
        ink: {
          950: "#0b0d10",
          900: "#12151a",
          850: "#171b21",
          800: "#1d222a",
          700: "#282e38",
          600: "#3a4250",
          500: "#5b6472",
          400: "#8891a0",
          300: "#b4bcc7",
          200: "#dde1e7",
          100: "#f1f3f5",
        },
        signal: {
          DEFAULT: "#e8a33d",
          soft: "#f3c777",
        },
      },
      fontFamily: {
        display: ["'Source Serif 4'", "Georgia", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      keyframes: {
        pulse_dot: {
          "0%, 100%": { opacity: 0.3 },
          "50%": { opacity: 1 },
        },
      },
      animation: {
        pulse_dot: "pulse_dot 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
