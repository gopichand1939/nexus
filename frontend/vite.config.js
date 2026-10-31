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

export default defineConfig({
  plugins: [react(), wasmPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    fs: { allow: ['..'] },
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/_matrix': 'http://127.0.0.1:3000'
    }
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1800
  }
});
