module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        asphalt: { 950: "#071c45", 900: "#14161c", 800: "#0b2c6b", 700: "#4a5568", 500: "#5c6570" },
        navy: { DEFAULT: "#0b2c6b", deep: "#071c45", mid: "#163f86", light: "#1c5bb8" },
        stripe: { DEFAULT: "#c8102e", dark: "#9e0d24" },
        slab: { DEFAULT: "#f5f6f8", dark: "#e6e9ee" },
      },
      fontFamily: { display: ["var(--font-display)", "sans-serif"], body: ["var(--font-body)", "sans-serif"] },
    },
  },
  plugins: [],
};
