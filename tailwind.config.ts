import type { Config } from "tailwindcss"

/**
 * Twinstream brand tokens (shared with nathan-aios so the two AIOS apps
 * read as one product family):
 *
 *   ink     #111111 - page background
 *   cream   #F8F6F1 - primary text on dark
 *   signal  #FFA300 - primary CTA, urgent state
 *   muted   #7A7670 - secondary text, labels
 *   rule    #1F1F1F - dividers and borders on dark
 *
 * Existing neutral-* / orange-* utilities are kept working so per-component
 * sweeps can happen incrementally.
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: "#111111",
        cream: "#F8F6F1",
        signal: {
          DEFAULT: "#FFA300",
          50: "#FFF6E5",
          100: "#FFE9BF",
          200: "#FFD380",
          300: "#FFBD40",
          400: "#FFA300",
          500: "#E69300",
          600: "#B37300",
        },
        muted: "#7A7670",
        rule: "#1F1F1F",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        wider: ".06em",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
export default config
