import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        }
      },
      boxShadow: {
        gold: '0 0 24px rgba(255, 214, 10, 0.55)',
        silver: '0 0 18px rgba(189, 198, 208, 0.45)',
        bronze: '0 0 16px rgba(181, 127, 79, 0.35)',
        diamond: '0 0 26px rgba(87, 201, 255, 0.55)'
      }
    }
  },
  plugins: []
};

export default config;