declare const __LOCAL_IP__: string

// 获取后端服务器地址
const getBackendUrl = () => {
  return `http://${__LOCAL_IP__}:3000`
}

// API 基础 URL
export const API_BASE_URL = getBackendUrl()

// WebSocket URL
export const SOCKET_URL = API_BASE_URL

// 获取当前页面完整 URL（用于二维码）
export const getPageUrl = () => {
  const { port } = window.location
  return `http://${__LOCAL_IP__}:${port}`
} 