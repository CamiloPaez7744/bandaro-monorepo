import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: Number(env.VITE_PORT || 3000),
    },
    preview: {
      port: Number(env.VITE_PORT || 3000),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@bandaro/core': path.resolve(__dirname, '../../packages/core/src'),
      },
    },
  };
});