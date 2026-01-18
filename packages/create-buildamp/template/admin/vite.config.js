import { defineConfig } from 'vite';
import { plugin as elm } from 'vite-plugin-elm';

export default defineConfig({
  base: '/admin/ui/',
  plugins: [
    elm()
  ],
  server: {
    proxy: {
      '/admin/api': 'http://localhost:3000',
    },
  },
});
