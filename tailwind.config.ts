import type { Config } from "tailwindcss"

/**
 * Dunsteel AIOS tokens (theme-aware via CSS custom properties).
 *
 *   bg          - page background
 *   surface     - card background
 *   surface-2   - subtle alt surface (hover, secondary cards)
 *   surface-3   - input/secondary action background
 *   border      - default border / divider
 *   border-strong - hover/emphasised border
 *   fg          - primary text
 *   fg-muted    - secondary text, labels
 *   fg-subtle   - tertiary text, captions
 *   accent      - Dunsteel signal orange (CTAs, live indicators)
 *   accent-fg   - foreground on accent surfaces
 *   success / warning / danger - status colours
 *
 * Legacy Twinstream tokens (ink, cream, signal, muted, rule) kept as
 * aliases so existing components keep working through the migration.
 *
 * Light/dark swap by setting data-theme="light" on <html>.
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
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        fg: "var(--fg)",
        "fg-muted": "var(--fg-muted)",
        "fg-subtle": "var(--fg-subtle)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          fg: "var(--accent-fg)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: {
          DEFAULT: "var(--danger)",
          fg: "var(--danger-fg)",
        },
        steel: {
          700: "var(--steel-700)",
          800: "var(--steel-800)",
        },
        background: "var(--bg)",
        foreground: "var(--fg)",
        ink: "var(--bg)",
        cream: "var(--fg)",
        signal: {
          DEFAULT: "var(--accent)",
          50: "#FFF6E5",
          100: "#FFE9BF",
          200: "#FFD380",
          300: "#FFBD40",
          400: "var(--accent)",
          500: "#E69300",
          600: "#B37300",
        },
        muted: "var(--fg-muted)",
        rule: "var(--border)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        wider: ".06em",
      },
      boxShadow: {
        "card-sm": "0 1px 2px 0 rgba(0,0,0,0.08)",
        card: "0 1px 3px 0 rgba(0,0,0,0.10), 0 1px 2px -1px rgba(0,0,0,0.10)",
        "card-hover": "0 4px 12px -2px rgba(0,0,0,0.12), 0 2px 4px -1px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
export default config
