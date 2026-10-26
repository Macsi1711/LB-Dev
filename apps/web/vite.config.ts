import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const BROWSERS = ['chrome109', 'edge109', 'firefox102', 'safari15.4', 'ios15.4'];

export default defineConfig({
  // El demo se publica en cualquier carpeta: rutas relativas.
  base: process.env.VITE_DEMO === '1' ? './' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Las PCs del mostrador son viejas: Windows 7 no pasa de Chrome 109 ni de Firefox 115 ESR.
  build: { target: BROWSERS, cssTarget: BROWSERS },
  server: { port: 5180, strictPort: true },
  preview: { port: 5181, strictPort: true },
});
