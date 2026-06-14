import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    cssMinify: 'esbuild',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
        },
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? ''
          if (/\.css$/.test(name)) return 'assets/[name]-[hash].[ext]'
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(name)) return 'assets/img/[name]-[hash].[ext]'
          if (/\.(woff2?|eot|ttf|otf)$/.test(name)) return 'assets/fonts/[name]-[hash].[ext]'
          return 'assets/[name]-[hash].[ext]'
        },
      },
    },
    target: 'es2020',
    cssCodeSplit: false,
  },
})
