import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { brand: { 50: "#eef4ff", 100: "#d9e5ff", 500: "#3b6cf6", 600: "#2a55d8", 700: "#2244b0" } } } },
  plugins: [],
};
export default config;
