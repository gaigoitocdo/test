import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [
    solidPlugin({
      solid: {
        generate: 'dom'
      }
    })
  ],
  // ... other config ...
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: (chunkInfo) => {
          // Log để debug
          console.log('🔍 Chunk:', chunkInfo.name, chunkInfo.facadeModuleId);
          
          // Service Worker patterns - nhiều cách check
          if (chunkInfo.name.includes('sw') || 
              chunkInfo.facadeModuleId?.includes('sw?worker') ||
              chunkInfo.facadeModuleId?.includes('sw.ts') ||
              chunkInfo.facadeModuleId?.endsWith('/sw')) {
            console.log('✅ SW detected, building to root');
            return 'sw-[hash].js'; // Root level
          }
          
          return 'assets/[name]-[hash].js';
        }
      }
    }
  },
  // Thêm worker config
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        entryFileNames: 'sw-[hash].js' // Force SW ra root
      }
    }
  }
  // ... rest of config
})