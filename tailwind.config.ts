import type { Config } from 'tailwindcss';

// All colour values live in src/styles/tokens.css as CSS variables (single
// source of truth shared with D3/canvas code). Tailwind maps onto them here.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: 'var(--dark)',
        'dark-2': 'var(--dark-2)',
        accent: 'var(--accent)',
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        line: 'var(--line)',
        banner: 'var(--banner)',
        'banner-ink': 'var(--banner-ink)',
      },
      fontFamily: {
        sans: ['ui-sans-serif', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', '16px'],
        sm: ['14px', '20px'],
        base: ['16px', '24px'],
        lg: ['20px', '28px'],
        xl: ['24px', '32px'],
        '2xl': ['32px', '40px'],
      },
    },
  },
  plugins: [],
} satisfies Config;
