import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F7F7F5",
        parchment: "#FAFAFA",
        ink: "#171717",
        sage: "#8E9B88",
        brick: "#8E6A62",
        line: "rgba(23, 23, 23, 0.1)"
      },
      fontFamily: {
        "serif-display": ["var(--font-instrument-serif)", "serif"],
        body: ["Times New Roman", "Times", "serif"]
      },
      boxShadow: {
        card: "0 12px 28px rgba(23, 23, 23, 0.05)"
      }
    }
  },
  plugins: []
};

export default config;

