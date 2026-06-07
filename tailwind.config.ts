import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        washi: "#f5f0e7", // paper ground
        "washi-deep": "#ebe3d5", // raised panels / cards
        sumi: "#211c16", // ink text
        "sumi-soft": "#5b5247", // secondary ink
        vermilion: "#c5362b", // 朱 torii accent
        "vermilion-deep": "#9c2a20",
        gold: "#a98a4b", // restrained metallic accent
      },
      fontFamily: {
        display: ["var(--font-display)", "Cormorant Garamond", "serif"],
        serif: ["var(--font-serif)", "EB Garamond", "Georgia", "serif"],
        jp: ['"Shippori Mincho"', '"Yu Mincho"', '"Hiragino Mincho ProN"', '"Noto Serif JP"', "serif"],
      },
      letterSpacing: {
        widest2: "0.32em",
      },
      maxWidth: {
        prose2: "68ch",
      },
    },
  },
  plugins: [],
};
export default config;
