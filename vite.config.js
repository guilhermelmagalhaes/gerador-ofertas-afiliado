import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração mínima do Vite com suporte a React.
// Não há backend: o build gera arquivos estáticos prontos para a Vercel.
export default defineConfig({
  plugins: [react()],
})
