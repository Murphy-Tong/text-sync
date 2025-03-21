<template>
  <div class="app-container">
    <el-container>
      <el-header>
        <div class="header-content">
          <h1>实时同步应用</h1>
          <div class="header-actions" v-if="!isMobile">
            <el-button type="primary" @click="scrollToInput">
              <el-icon><EditPen /></el-icon>
              写点什么
            </el-button>
            <el-popconfirm
              title="确定要清空所有内容吗？此操作不可恢复。"
              @confirm="clearAllContents"
              confirm-button-text="清空"
              cancel-button-text="取消"
            >
              <template #reference>
                <el-button type="danger">
                  <el-icon><Delete /></el-icon>
                  清空全部
                </el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </el-header>
      <el-main>
        <div class="content-container">
          <!-- 输入区域 -->
          <div class="input-section" ref="inputSection">
            <div class="input-wrapper">
              <div class="input-header">
                <el-upload
                  class="image-uploader"
                  action="/api/content/image"
                  :show-file-list="false"
                  :on-success="handleUploadSuccess"
                  :on-error="handleUploadError"
                  :before-upload="beforeUpload"
                  name="image"
                >
                  <el-button type="success">
                    <el-icon><Upload /></el-icon>
                    上传图片
                  </el-button>
                </el-upload>
              </div>
              <el-input
                v-model="textContent"
                type="textarea"
                :rows="4"
                placeholder="输入要同步的文本..."
                resize="none"
                maxlength="1000"
                show-word-limit
              />
              <div class="input-actions">
                <el-button 
                  type="primary" 
                  @click="sendText" 
                  :loading="sending"
                  class="send-button"
                >
                  <el-icon><Position /></el-icon>
                  发送
                </el-button>
              </div>
            </div>
          </div>

          <div class="main-content">
            <!-- 内容展示区域 -->
            <div class="content-list">
              <div v-if="contents.length === 0" class="empty-state">
                <el-empty description="还没有任何内容" />
              </div>
              <div v-else class="content-items">
                <div v-for="item in contents" :key="item._id" class="content-item">
                  <!-- 文本内容 -->
                  <div v-if="item.type === 'text'" class="text-content">
                    <div class="content-wrapper">
                      <div class="text" @click="copyText(item.content)" :title="'点击复制文本'">{{ item.content }}</div>
                      <div class="content-footer">
                        <span class="time">{{ formatTime(item.createdAt) }}</span>
                        <div class="actions">
                          <el-popconfirm
                            title="确定要删除吗？"
                            @confirm="deleteContent(item._id)"
                            confirm-button-text="删除"
                            cancel-button-text="取消"
                          >
                            <template #reference>
                              <el-button
                                type="danger"
                                size="small"
                                circle
                                title="删除"
                              >
                                <el-icon><Delete /></el-icon>
                              </el-button>
                            </template>
                          </el-popconfirm>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- 图片内容 -->
                  <div v-else-if="item.type === 'image'" class="image-content">
                    <div class="content-wrapper">
                      <el-image
                        :src="`${API_BASE_URL}${item.imageUrl}`"
                        :preview-src-list="[`${API_BASE_URL}${item.imageUrl}`]"
                        fit="cover"
                        loading="lazy"
                        :initial-index="0"
                        preview-teleported
                      >
                        <template #placeholder>
                          <div class="image-placeholder">
                            <el-icon><Picture /></el-icon>
                            <span>加载中...</span>
                          </div>
                        </template>
                        <template #error>
                          <div class="image-error">
                            <el-icon><PictureRounded /></el-icon>
                            <span>加载失败</span>
                          </div>
                        </template>
                      </el-image>
                      <div class="content-footer">
                        <span class="time">{{ formatTime(item.createdAt) }}</span>
                        <div class="actions">
                          <el-button
                            type="primary"
                            size="small"
                            circle
                            @click="downloadImage(`${API_BASE_URL}${item.imageUrl}`, item.imageUrl.split('/').pop() || 'image.jpg')"
                            title="下载图片"
                          >
                            <el-icon><Download /></el-icon>
                          </el-button>
                          <el-popconfirm
                            title="确定要删除吗？"
                            @confirm="deleteContent(item._id)"
                            confirm-button-text="删除"
                            cancel-button-text="取消"
                          >
                            <template #reference>
                              <el-button
                                type="danger"
                                size="small"
                                circle
                                title="删除"
                              >
                                <el-icon><Delete /></el-icon>
                              </el-button>
                            </template>
                          </el-popconfirm>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 二维码和用户列表区域 -->
            <div :class="['side-section', { 'mobile': isMobile }]">
              <!-- 在移动端显示用户列表 -->
              <div v-if="isMobile" class="online-users mobile-users">
                <h3>在线用户 ({{ onlineUsers.length }})</h3>
                <ul v-if="onlineUsers.length > 0">
                  <li v-for="user in onlineUsers" :key="user.id">
                    <el-tag 
                      size="small" 
                      :type="user.id === currentUserId ? 'success' : 'info'"
                      :title="user.ip"
                    >
                      {{ user.id === currentUserId ? '我' : user.deviceInfo }}
                      <span class="user-ip">{{ user.ip }}</span>
                    </el-tag>
                  </li>
                </ul>
                <p v-else class="no-users">暂无其他用户在线</p>
              </div>

              <!-- PC端显示二维码和用户列表 -->
              <div v-if="!isMobile" class="qrcode-section">
                <div class="qrcode-container">
                  <h3>扫码访问</h3>
                  <qrcode-vue :value="currentUrl" :size="200" level="H" />
                  <p class="qrcode-tip">使用手机扫描二维码访问</p>
                  <p class="qrcode-url">{{ currentUrl }}</p>
                  
                  <!-- 在线用户列表 -->
                  <div class="online-users">
                    <h3>在线用户 ({{ onlineUsers.length }})</h3>
                    <ul v-if="onlineUsers.length > 0">
                      <li v-for="user in onlineUsers" :key="user.id">
                        <el-tag 
                          size="small" 
                          :type="user.id === currentUserId ? 'success' : 'info'"
                          :title="user.ip"
                        >
                          {{ user.id === currentUserId ? '我' : user.deviceInfo }}
                          <span class="user-ip">{{ user.ip }}</span>
                        </el-tag>
                      </li>
                    </ul>
                    <p v-else class="no-users">暂无其他用户在线</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, Download, DocumentCopy, EditPen, Position, Upload, Picture, PictureRounded } from '@element-plus/icons-vue'
import { io } from 'socket.io-client'
import axios from 'axios'
import QrcodeVue from 'qrcode.vue'
import type { IContent } from '../../backend/src/types/content'
import { API_BASE_URL, SOCKET_URL, getPageUrl } from './config'
import { v4 as uuidv4 } from 'uuid'

// 判断是否为移动设备
const isMobile = ref(false)
const checkMobile = () => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// 获取当前页面 URL（用于二维码）
const currentUrl = ref(getPageUrl())

// 创建 Socket 实例
const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket']
})

const textContent = ref('')
const contents = ref<IContent[]>([])
const sending = ref(false)
const inputSection = ref<HTMLElement | null>(null)

// 在线用户管理
interface OnlineUser {
  id: string;
  joinTime: Date;
  deviceInfo: string;
  ip: string;
}

const currentUserId = ref(uuidv4())
const onlineUsers = ref<OnlineUser[]>([])

// 获取设备信息
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let deviceInfo = '';
  
  if (/iPhone/.test(ua)) {
    deviceInfo = 'iPhone';
  } else if (/iPad/.test(ua)) {
    deviceInfo = 'iPad';
  } else if (/Android/.test(ua)) {
    const match = ua.match(/Android.*?;(.*?)Build/);
    deviceInfo = match ? match[1].trim() : 'Android';
  } else if (/Mac OS X/.test(ua)) {
    deviceInfo = 'Mac';
  } else if (/Windows/.test(ua)) {
    deviceInfo = 'Windows';
  } else if (/Linux/.test(ua)) {
    deviceInfo = 'Linux';
  } else {
    deviceInfo = '未知设备';
  }
  
  return deviceInfo;
}

// 滚动到输入区域
const scrollToInput = () => {
  inputSection.value?.scrollIntoView({ behavior: 'smooth' })
}

// 获取所有内容
const fetchContents = async () => {
  try {
    const response = await axios.get<IContent[]>('/api/content')
    // 按创建时间倒序排序
    contents.value = response.data.sort((a, b) => {
      return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    })
  } catch (error) {
    ElMessage.error('获取内容失败')
  }
}

// 发送文本
const sendText = async () => {
  if (!textContent.value.trim()) {
    ElMessage.warning('请输入内容')
    return
  }

  sending.value = true
  try {
    await axios.post<IContent>('/api/content/text', {
      content: textContent.value
    })
    textContent.value = ''
    ElMessage.success('发送成功')
  } catch (error) {
    ElMessage.error('发送失败')
  } finally {
    sending.value = false
  }
}

// 复制文本
const copyText = async (text: string) => {
  try {
    // 创建临时文本区域
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    textArea.style.top = '0'
    document.body.appendChild(textArea)
    
    // 选择文本
    textArea.select()
    textArea.setSelectionRange(0, textArea.value.length)
    
    // 执行复制
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    
    if (successful) {
      ElMessage.success('复制成功')
    } else {
      // 如果 execCommand 失败，尝试使用 clipboard API
      await navigator.clipboard.writeText(text)
      ElMessage.success('复制成功')
    }
  } catch (error) {
    ElMessage.error('复制失败')
    console.error('复制失败:', error)
  }
}

// 下载图片
const downloadImage = async (url: string, filename: string) => {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'blob',
    })
    
    // 创建 Blob URL
    const blob = new Blob([response.data], { 
      type: response.headers['content-type'] 
    })
    const objectUrl = URL.createObjectURL(blob)
    
    // 创建临时链接并触发下载
    const link = document.createElement('a')
    link.style.display = 'none'
    link.href = objectUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    
    // 清理
    setTimeout(() => {
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)
    }, 100)
    
    ElMessage.success('下载成功')
  } catch (error: any) {
    console.error('下载失败:', error)
    ElMessage.error(error.response?.data?.message || '下载失败，请稍后重试')
  }
}

// 处理图片上传成功
const handleUploadSuccess = () => {
  ElMessage.success('上传成功')
}

// 处理图片上传失败
const handleUploadError = (err: any) => {
  console.error('上传失败:', err)
  ElMessage.error(`上传失败: ${err.response?.data?.message || err.message || '未知错误'}`)
}

// 上传前检查
const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}

// 删除内容
const deleteContent = async (id: string) => {
  try {
    await axios.delete(`/api/content/${id}`)
    ElMessage.success('删除成功')
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

// 格式化时间
const formatTime = (time: string | Date) => {
  return new Date(time).toLocaleString()
}

// 清空所有内容
const clearAllContents = async () => {
  try {
    await axios.delete('/api/content');
    ElMessage.success('已清空所有内容');
  } catch (error) {
    ElMessage.error('清空失败');
  }
};

// 更新 Socket 事件处理
const setupSocketEvents = () => {
  // 监听连接状态
  socket.on('connect', () => {
    console.log('Socket connected')
  })

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error)
  })

  // 监听实时更新
  socket.on('sync-update', (data: IContent) => {
    // 检查是否已经存在相同的内容
    const exists = contents.value.some(item => item._id === data._id)
    if (!exists) {
      contents.value.unshift(data)
    }
  })

  socket.on('sync-delete', (id: string) => {
    contents.value = contents.value.filter(item => item._id !== id)
  })

  // 监听清空事件
  socket.on('sync-clear', () => {
    contents.value = []
  })

  // 用户加入
  socket.emit('user-join', { 
    id: currentUserId.value,
    deviceInfo: getDeviceInfo()
  })

  // 监听用户列表更新
  socket.on('users-update', (users: OnlineUser[]) => {
    onlineUsers.value = users
  })
}

// 组件挂载时
onMounted(() => {
  checkMobile()
  fetchContents()
  setupSocketEvents()
  
  // 监听窗口大小变化
  window.addEventListener('resize', checkMobile)
})

// 组件卸载时
onUnmounted(() => {
  socket.off('sync-update')
  socket.off('sync-delete')
  socket.off('connect')
  socket.off('connect_error')
  socket.disconnect()
  
  // 移除事件监听
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  overflow-x: hidden;
  width: 100%;
}

.el-container {
  width: 100%;
  overflow-x: hidden;
}

.el-main {
  overflow-x: hidden;
  width: 100%;
}

.content-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  gap: 20px;
  width: 100%;
  box-sizing: border-box;
}

.main-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-section {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  width: 100%;
  margin-bottom: 20px;
}

.content-list {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  flex: 1;
  min-width: 0;
}

.empty-state {
  padding: 40px 0;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-header {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 8px;
}

.input-actions {
  display: flex;
  justify-content: flex-start;
}

.send-button {
  min-width: 120px;
}

.content-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.content-item {
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.content-wrapper {
  padding: 16px;
  width: 100%;
  box-sizing: border-box;
}

.text {
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.6;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
  margin-bottom: 12px;
  width: 100%;
  box-sizing: border-box;
}

.content-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.time {
  color: #909399;
  font-size: 12px;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-start;
}

.image-content .el-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.qrcode-section {
  width: 260px;
  flex-shrink: 0;
}

.qrcode-container {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  text-align: center;
  position: sticky;
  top: 90px;
}

.qrcode-container h3 {
  margin-bottom: 20px;
  color: #409EFF;
}

.qrcode-tip {
  margin-top: 15px;
  color: #909399;
  font-size: 14px;
}

.qrcode-url {
  margin-top: 10px;
  color: #909399;
  font-size: 12px;
  word-break: break-all;
}

.image-placeholder,
.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  background-color: #f5f7fa;
  color: #909399;
  border-radius: 8px;
}

.image-placeholder .el-icon,
.image-error .el-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.online-users {
  margin-top: 20px;
  border-top: 1px solid #ebeef5;
  padding-top: 20px;
}

.online-users h3 {
  margin-bottom: 12px;
  color: #409EFF;
  font-size: 16px;
}

.online-users ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.online-users li {
  margin: 0;
}

.no-users {
  color: #909399;
  font-size: 14px;
  margin: 0;
}

.user-ip {
  margin-left: 4px;
  opacity: 0.8;
  font-size: 0.9em;
}

.el-tag {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side-section {
  width: 260px;
  flex-shrink: 0;
}

.side-section.mobile {
  width: 100%;
  margin-top: 12px;
}

.mobile-users {
  background-color: #fff;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

/* 移动端样式 */
@media (max-width: 768px) {
  .el-container {
    margin: 0;
    padding: 0;
    width: 100%;
  }

  .el-main {
    padding: 0;
    width: 100%;
  }

  .content-container {
    flex-direction: column;
    padding: 12px;
    margin: 0;
    width: 100%;
    box-sizing: border-box;
  }

  .main-content {
    flex-direction: column;
    width: 100%;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  .input-section {
    position: static;
    margin: 0 0 12px 0;
    width: 100%;
    box-sizing: border-box;
  }

  .content-list {
    margin: 0;
    width: 100%;
    box-sizing: border-box;
  }

  .content-items {
    gap: 12px;
    width: 100%;
  }

  .content-item {
    width: 100%;
    box-sizing: border-box;
  }

  .content-wrapper {
    padding: 12px;
    width: 100%;
    box-sizing: border-box;
  }

  .text {
    padding: 6px;
    margin-bottom: 8px;
    width: 100%;
    box-sizing: border-box;
  }

  .image-content .el-image {
    max-width: 100%;
    width: 100%;
    box-sizing: border-box;
  }

  .side-section.mobile {
    width: 100%;
    margin: 12px 0 0 0;
    padding: 0;
    box-sizing: border-box;
  }

  .mobile-users {
    width: 100%;
    box-sizing: border-box;
  }

  .header-content {
    width: 100%;
    box-sizing: border-box;
    padding: 0 12px;
  }
}

/* 大屏幕响应式布局 */
@media (min-width: 769px) {
  .main-content {
    flex-direction: row;
  }

  .input-section {
    width: 320px;
    margin-right: 20px;
    align-self: flex-start;
  }

  .content-list {
    min-width: 0;
    flex: 1;
  }

  /* 当屏幕宽度小于 1400px 时，输入框显示在上方 */
  @media (max-width: 1400px) {
    .main-content {
      flex-direction: column;
    }

    .input-section {
      width: 100%;
      margin-right: 0;
      margin-bottom: 20px;
    }
  }
}
</style> 