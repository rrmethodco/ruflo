import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        leonardo: {
          sidebar: '#1e2235',
          'sidebar-hover': '#262b42',
          'sidebar-active': '#2d3350',
          'sidebar-section': '#6b7194',
          bg: '#f5f6fa',
          card: '#ffffff',
          navy: '#1a1f36',
          'text-primary': '#1a1f36',
          'text-secondary': '#6b7280',
          'text-muted': '#9ca3af',
          border: '#e5e7eb',
          accent: '#4f46e5',
          positive: '#10b981',
          negative: '#ef4444',
          'positive-bg': '#ecfdf5',
          'negative-bg': '#fef2f2',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
