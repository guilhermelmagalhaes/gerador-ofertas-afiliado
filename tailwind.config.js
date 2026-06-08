/** @type {import('tailwindcss').Config} */
// Configuração do Tailwind. O "content" lista os arquivos onde o Tailwind
// procura classes para gerar apenas o CSS realmente usado (tree-shaking).
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Cor de destaque do app (verde "promoção").
        marca: {
          50: '#ecfdf5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
      },
    },
  },
  plugins: [],
}
