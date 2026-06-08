import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Acentos dorado/ámbar de la marca
        gold: {
          DEFAULT: "#c9a24b",
          50: "#fbf7ed",
          100: "#f3e9cb",
          200: "#e7d196",
          300: "#dab85f",
          400: "#cfa53f",
          500: "#c9a24b",
          600: "#a37d33",
          700: "#7f5f2b",
          800: "#684e29",
          900: "#594226",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        panel: "0 1px 3px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
