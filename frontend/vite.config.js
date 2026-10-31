import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const wasmPlugin = () => ({
  name: 'wasm-server-plugin',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url && req.url.includes('matrix_sdk_crypto_wasm_bg.wasm')) {
        const wasmPath = path.resolve(__dirname, '../node_modules/@matrix-org/matrix-sdk-crypto-wasm/pkg/matrix_sdk_crypto_wasm_bg.wasm');
        if (fs.existsSync(wasmPath)) {
          res.setHeader('Content-Type', 'application/wasm');
          return fs.createReadStream(wasmPath).pipe(res);
        }
      }
      next();
    });
  }
});

// ==============================================================================
// BACKEND TARGET (Switch between Local and Production Render)
// ==============================================================================
// Option 1: LOCAL BACKEND (Default)
const BACKEND_TARGET = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:3000';

// Option 2: PRODUCTION RENDER (Uncomment below to connect frontend to Render)
// const BACKEND_TARGET = 'https://nexus-4zj1.onrender.com';

export default defineConfig({
  plugins: [react(), wasmPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    cors: true,
    fs: { allow: ['..'] },
    proxy: {
      '/api': {
        target: BACKEND_TARGET,
        changeOrigin: true,
        secure: false
      },
      '/_matrix': {
        target: BACKEND_TARGET,
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1800
  }
});
