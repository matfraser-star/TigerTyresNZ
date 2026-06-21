/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'tiger-orange': '#ff6b00',
        'garage-black': '#070707',
        asphalt: '#101114',
        rubber: '#18191d',
        steel: '#8f98a3',
        warning: '#f59e0b',
        success: '#22c55e',
      },
      fontFamily: {
        display: ['Bebas Neue', 'Impact', 'sans-serif'],
        condensed: ['Barlow Condensed', 'Arial Narrow', 'sans-serif'],
        body: ['Barlow', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 44px rgba(255, 107, 0, 0.28)',
        panel: '0 24px 80px rgba(0, 0, 0, 0.42)',
        lift: '0 20px 50px rgba(0, 0, 0, 0.34)',
      },
      maxWidth: {
        shell: '1380px',
      },
    },
  },
  plugins: [],
}
