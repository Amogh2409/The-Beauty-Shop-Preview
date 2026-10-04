import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  root:fileURLToPath(new URL('.',import.meta.url)),
  base:'/The-Beauty-Shop-Preview/',
  plugins:[react()],
  resolve:{alias:{'@shared':fileURLToPath(new URL('../shared/src',import.meta.url))}},
  build:{outDir:'../dist',emptyOutDir:true,sourcemap:false,modulePreload:{polyfill:false}},
  server:{host:'127.0.0.1',port:5174,strictPort:true}
});
