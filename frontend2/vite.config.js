import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base '/v2/' HARUS sama dengan prefix proxy yang dipasang backend/server.js (app.use di /v2),
// dan basename BrowserRouter di src/App.jsx. Ketiganya wajib konsisten.
var backendPort = parseInt(process.env.PORT || '3000', 10);

export default defineConfig({
  plugins: [react()],
  base: '/v2/',
  server: {
    host: '127.0.0.1', // eksplisit IPv4 -- harus sama persis dgn target proxy di backend/server.js
    port: 5174,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      // Browser membuka halaman lewat backend di port ini (proxy), bukan port Vite langsung --
      // jadi client HMR juga harus connect balik ke port backend, bukan 5174.
      clientPort: backendPort
    }
  }
})
