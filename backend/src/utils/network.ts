import { networkInterfaces } from 'os'

export function getLocalIP(): string {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      // 跳过内部 IP 和非 IPv4 地址
      if (!net.internal && net.family === 'IPv4') {
        return net.address
      }
    }
  }
  return '0.0.0.0' // 如果没有找到合适的 IP，返回默认值
} 