// Tailwind CSS configuration
var plugin = require("tailwindcss/plugin");

module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        urbanist: ["Urbanist", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
      },
      width: {
        66: "66%",
        88: "88%",
        70: "70%",
      },
      fontSize: {
        xs: "12px",
        sm: "14px",
        base: "16px",
        lg: "18px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "28px",
        "4xl": "32px",
        "5xl": "48px",
      },
      colors: {
        // Brand color - Facturales orange
        primary: "#ec8228",
        "primary-hover": "#d47524",

        // Semantic colors using brand orange as "success" in UI
        success: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#ec8228",
          400: "#d47524",
        },

        // True green for actual success states (payment confirmed, etc.)
        ok: {
          50: "#D9FBE6",
          100: "#B7FFD1",
          200: "#4ADE80",
          300: "#22C55E",
          400: "#16A34A",
        },

        warning: {
          100: "#FDE047",
          200: "#FACC15",
          300: "#EAB308",
        },
        error: {
          50: "#FCDEDE",
          100: "#FF7171",
          200: "#FF4747",
          300: "#DD3333",
        },

        // Dark theme palette
        darkblack: {
          300: "#747681",
          400: "#2A313C",
          500: "#23262B",
          600: "#1D1E24",
          700: "#151515",
        },

        // Neutral grays
        bgray: {
          50: "#FAFAFA",
          100: "#F7FAFC",
          200: "#EDF2F7",
          300: "#E2E8F0",
          400: "#CBD5E0",
          500: "#A0AEC0",
          600: "#718096",
          700: "#4A5568",
          800: "#2D3748",
          900: "#1A202C",
        },

        orange: {
          DEFAULT: "#ec8228",
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#ec8228",
          600: "#d47524",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
          950: "#431407",
        },
        purple: "#936DFF",

        secondary: {
          100: "#F2F6FF",
          200: "#D8E3F8",
          300: "#74787B",
          400: "#363B46",
        },
      },

      lineHeight: {
        "extra-loose": "44.8px",
        "big-loose": "140%",
        130: "130%",
        150: "150%",
        160: "160%",
        175: "175%",
        180: "180%",
        200: "200%",
        220: "220%",
      },
      letterSpacing: {
        tight: "-0.96px",
        40: "-0.4px",
      },
      borderRadius: {
        20: "20px",
      },
      backgroundImage: {
        "bgc-dark": "url('/assets/images/background/comming-soon-dark.svg')",
        "bgc-light": "url('/assets/images/background/coming-soon-bg.svg')",
        "notfound-dark": "url('/assets/images/background/404-dark.jpg')",
        "notfound-light": "url('/assets/images/background/404-bg.png')",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    plugin(function ({ addVariant }) {
      addVariant("current", "&.active");
    }),
  ],
};
