import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        washi: "#f7f3ec", // paper ground
        sumi: "#1c1a17", // ink text
        vermilion: "#c1352b", // 朱 torii accent
        "vermilion-deep": "#9c2820",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        jp: ["var(--font-jp)", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
