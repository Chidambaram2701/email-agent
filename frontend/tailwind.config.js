const withOpacity = (variableName) => {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          50: withOpacity('--slate-50'),
          100: withOpacity('--slate-100'),
          200: withOpacity('--slate-200'),
          300: withOpacity('--slate-300'),
          400: withOpacity('--slate-400'),
          500: withOpacity('--slate-500'),
          600: withOpacity('--slate-600'),
          700: withOpacity('--slate-700'),
          800: withOpacity('--slate-800'),
          900: withOpacity('--slate-900'),
          950: withOpacity('--slate-950'),
        },
        brand: {
          50: withOpacity('--brand-50'),
          100: withOpacity('--brand-100'),
          200: withOpacity('--brand-200'),
          300: withOpacity('--brand-300'),
          400: withOpacity('--brand-400'),
          500: withOpacity('--brand-500'),
          600: withOpacity('--brand-600'),
          700: withOpacity('--brand-700'),
          800: withOpacity('--brand-800'),
          900: withOpacity('--brand-900'),
          950: withOpacity('--brand-950'),
        },
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
