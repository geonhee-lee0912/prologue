import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: '#1a1a1a',
          paper: '#fafaf8',
          accent: '#7a5a3a',
        },
      },
    },
  },
  plugins: [],
};

export default config;
