import sitekitPreset from '@suppers-ai/site-kit/tailwind-preset';
import typography from '@tailwindcss/typography';
import forms from '@tailwindcss/forms';
import aspectRatio from '@tailwindcss/aspect-ratio';

/** @type {import('tailwindcss').Config} */
export default {
  // Site-kit preset maps every --sa-* token onto a Tailwind utility
  // (`bg-sa-accent`, `text-sa-muted`, `px-sa-4`, etc.). Local extensions
  // below add the Solobase-specific tokens that aren't part of the kit.
  presets: [sitekitPreset],
  content: [
    './index.html',
    './why/**/*.html',
    './notes/**/*.html',
    './docs/**/*.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      // Solobase brand orange, kept as named tints so marketing-page
      // gradients/banners can pick the exact step they need. The kit's
      // --sa-accent / --sa-accent-hover stay overridden in main.css to
      // keep the kit components (sa-header link hovers, sa-hero CTAs)
      // matching this palette.
      colors: {
        primary: {
          50: '#fff4ed',
          100: '#ffe6d5',
          200: '#ffc9a8',
          300: '#ffa470',
          400: '#fe6627',
          500: '#fc4c03',
          600: '#b72a07',
          700: '#9a1f0a',
          800: '#7c1b0e',
          900: '#661a10',
          950: '#380a06',
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#374151',
            a: {
              color: '#fe6627',
              textDecoration: 'underline',
              fontWeight: '500',
            },
            'a:hover': {
              color: '#b72a07',
            },
            h1: { color: '#111827', fontWeight: '700' },
            h2: { color: '#111827', fontWeight: '600' },
            h3: { color: '#111827', fontWeight: '600' },
            h4: { color: '#111827', fontWeight: '600' },
            code: {
              color: '#1f2937',
              backgroundColor: '#f3f4f6',
              paddingLeft: '0.25rem',
              paddingRight: '0.25rem',
              paddingTop: '0.125rem',
              paddingBottom: '0.125rem',
              borderRadius: '0.25rem',
              fontSize: '0.875em',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            pre: { backgroundColor: '#1f2937', color: '#f9fafb' },
            'pre code': { backgroundColor: 'transparent', color: 'inherit', padding: '0' },
          },
        },
      },
      screens: {
        'xs': '475px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [typography, forms, aspectRatio],
}
