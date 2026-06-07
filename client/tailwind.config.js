/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
      extend: {
          "colors": {
              "surface-container-lowest": "#0a0e1a",
              "error": "#ff6b6b",
              "surface": "#0f1524",
              "tertiary": "#c8a0f0",
              "secondary-fixed-dim": "#88b4cc",
              "primary": "#7dd3fc",
              "on-tertiary": "#1a002e",
              "on-primary-fixed": "#001f2e",
              "surface-tint": "#7dd3fc",
              "surface-container-low": "#111828",
              "surface-bright": "#1a2438",
              "surface-variant": "#1a2438",
              "surface-container-high": "#1a2438",
              "on-primary-fixed-variant": "#004d73",
              "secondary-container": "#1a3a4e",
              "on-secondary-fixed": "#0d1f2b",
              "surface-dim": "#0f1524",
              "on-secondary-container": "#c0d8e8",
              "secondary": "#88b4cc",
              "on-tertiary-container": "#e8d0ff",
              "on-tertiary-fixed": "#1a002e",
              "tertiary-fixed": "#e8d0ff",
              "on-error": "#1a0000",
              "surface-container-highest": "#202c42",
              "tertiary-fixed-dim": "#c8a0f0",
              "inverse-on-surface": "#0a0e1a",
              "on-secondary": "#001f2e",
              "on-surface": "#e0e8f0",
              "background": "#0a0e1a",
              "primary-fixed": "#c8eaff",
              "inverse-primary": "#0a4c6e",
              "on-primary-container": "#c8eaff",
              "on-background": "#e0e8f0",
              "on-primary": "#001f2e",
              "error-container": "#3d1414",
              "tertiary-container": "#3d2060",
              "on-secondary-fixed-variant": "#2a4a5e",
              "on-error-container": "#ffb3b3",
              "surface-container": "#141c2e",
              "primary-fixed-dim": "#7dd3fc",
              "on-tertiary-fixed-variant": "#4d2a73",
              "on-surface-variant": "#a0b4c4",
              "secondary-fixed": "#c0d8e8",
              "outline-variant": "#2a3a48",
              "primary-container": "#0e4d6e",
              "outline": "#4a6070",
              "inverse-surface": "#e0e8f0"
          },
          "borderRadius": {
              "DEFAULT": "0.5rem",
              "lg": "1rem",
              "xl": "1.5rem",
              "full": "9999px"
          },
          "fontFamily": {
              "headline": ["Inter", "sans-serif"],
              "display": ["Inter", "sans-serif"],
              "body": ["Inter", "sans-serif"],
              "label": ["Inter", "sans-serif"]
          },
          "keyframes": {
              "fade-in": {
                  "0%": { opacity: 0, transform: "scale(0.98)" },
                  "100%": { opacity: 1, transform: "scale(1)" }
              },
              "fade-out": {
                  "0%": { opacity: 1, transform: "scale(1)" },
                  "100%": { opacity: 0, transform: "scale(0.98)" }
              }
          },
          "animation": {
              "fade-in": "fade-in 0.3s ease-out forwards",
              "fade-out": "fade-out 0.3s ease-in forwards"
          }
      }
  },
  plugins: [],
}
