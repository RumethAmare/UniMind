import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#121212",
        paper: "#f7f5f0",
        line: "rgba(120, 120, 120, 0.24)"
      },
      boxShadow: {
        panel: "0 18px 60px rgba(0,0,0,0.12)"
      }
    }
  },
  plugins: []
};

export default config;
