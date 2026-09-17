import type {Config} from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          700: '#047857',
          900: '#064e3b'
        }
      },
      boxShadow: {
        soft: '0 20px 45px -25px rgba(6, 78, 59, 0.35)'
      }
    }
  },
  plugins: []
};

export default config;
