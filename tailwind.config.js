/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0E1015',
        bone: '#FAF8F4',
        paper: '#F2EFE8',
        'ledger-red': '#B23A2A',
        verdigris: '#2F5D50',
        archival: '#B47F3D',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        editorial: ['Newsreader', 'Iowan Old Style', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        serif: ['Spectral', 'Georgia', 'serif'],
        plex: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
