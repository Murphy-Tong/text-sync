import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { networkInterfaces } from 'os'

// 获取本机局域网 IP
function getLocalIP(): string {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (!net.internal && net.family === 'IPv4') {
        return net.address
      }
    }
  }
  return '0.0.0.0'
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  const localIP = getLocalIP()

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: `http://${localIP}:3000`,
          changeOrigin: true,
          secure: false
        },
        '/uploads': {
          target: `http://${localIP}:3000`,
          changeOrigin: true,
          secure: false
        }
      }
    },
    define: {
      // 注入运行时常量
      __LOCAL_IP__: JSON.stringify(localIP)
    }
  }
}) 