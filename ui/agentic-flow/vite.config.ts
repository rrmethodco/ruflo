import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Plugin to handle SPA fallback before proxy
const htmlFallbackPlugin = () => ({
  name: 'html-fallback',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      // Client-side routes that should serve index.html
      const spaRoutes = ['/api-docs', '/swarm', '/mcp-tools', '/terminal', '/dashboard', '/memory']
      
      if (req.url && spaRoutes.some(route => req.url.startsWith(route))) {
        // Force Vite to serve the index.html
        req.url = '/index.html'
      }
      
      next()
    })
  }
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [htmlFallbackPlugin(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
    fs: {
      strict: false
    }
  },
  preview: {
    port: 5173,
  },
  // Add app type for SPA routing
  appType: 'spa',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})