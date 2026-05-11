import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react(), tailwindcss()],

    define: {
      // Only non-secret, non-sensitive runtime config goes here.
      // API URLs are always derived dynamically on the client — never hardcoded.
      'import.meta.env.VITE_APP_NAME': JSON.stringify(env.APP_NAME || 'OSDAI'),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify('2.0.0'),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            charts: ['recharts'],
            motion: ['framer-motion', 'motion'],
            query: ['@tanstack/react-query'],
          },
        },
      },
    },

    server: {
      host: '0.0.0.0',
      port: 5173,
      hmr: process.env.DISABLE_HMR !== 'true',
      allowedHosts: true,
      proxy: {
        '/api': {
          target: `http://localhost:${env.APP_PORT || '5000'}`,
          changeOrigin: true,
        },
        '/socket.io': {
          target: `http://localhost:${env.APP_PORT || '5000'}`,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
