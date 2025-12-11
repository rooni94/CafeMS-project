module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Zain"', "system-ui", "sans-serif"], // 👈 الخط الافتراضي
      },
      colors: {
        gulfOrange: "#F39C1A", // غيّر الأكواد لو عندك الكود الدقيق من الشعار
        gulfPurple: "#43218F",
      },
    },
  },
  plugins: [],
};
