import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.dev'],
  },
  build: {
    rollupOptions: {
      external: (id) => id === 'three' || id.startsWith('three/') || id === 'mindar-image-three',
    },
  },
});
