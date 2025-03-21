<template>
  <div class="app-container">
    <el-container>
      <el-header>
        <h1>实时同步应用</h1>
      </el-header>
      <el-main>
        <div class="content-container">
          <div class="main-content">
            <!-- 文本输入区域 -->
            <div class="input-section">
              <el-input
                v-model="textContent"
                type="textarea"
                :rows="4"
                placeholder="输入要同步的文本..."
              />
              <el-button type="primary" @click="sendText" :loading="sending">
                发送文本
              </el-button>
            </div>

            <!-- 图片上传区域 -->
            <div class="upload-section">
              <el-upload
                class="image-uploader"
                :action="`${API_BASE_URL}/api/content/image`"
                :show-file-list="false"
                :on-success="handleUploadSuccess"
                :on-error="handleUploadError"
                :before-upload="beforeUpload"
                name="image"
              >
                <el-button type="success">上传图片</el-button>
              </el-upload>
            </div>

            <!-- 内容展示区域 -->
            <div class="content-list">
              <el-timeline>
                <el-timeline-item
                  v-for="item in contents"
                  :key="item._id"
                  :timestamp="formatTime(item.createdAt)"
                  placement="top"
                >
                  <!-- 文本内容 -->
                  <div v-if="item.type === 'text'" class="text-content">
                    <div class="content-wrapper">
                      <div class="text">{{ item.content }}</div>
                      <div class="actions">
                        <el-button
                          type="primary"
                          size="small"
                          circle
                          @click="copyText(item.content)"
                          title="复制文本"
                        >
                          <el-icon><DocumentCopy /></el-icon>
                        </el-button>
                        <el-button
                          type="danger"
                          size="small"
                          circle
                          @click="deleteContent(item._id)"
                          title="删除"
                        >
                          <el-icon><Delete /></el-icon>
                        </el-button>
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
                      />
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
                        <el-button
                          type="danger"
                          size="small"
                          circle
                          @click="deleteContent(item._id)"
                          title="删除"
                        >
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </div>
                    </div>
                  </div>
                </el-timeline-item>
              </el-timeline>
            </div>
          </div>

          <!-- 二维码区域 -->
          <div v-if="!isMobile" class="qrcode-section">
            <div class="qrcode-container">
              <h3>扫码访问</h3>
              <qrcode-vue :value="currentUrl" :size="200" level="H" />
              <p class="qrcode-tip">使用手机扫描二维码访问</p>
              <p class="qrcode-url">{{ currentUrl }}</p>
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
import { Delete, Download, DocumentCopy } from '@element-plus/icons-vue'
import { io } from 'socket.io-client'
import axios from 'axios'
import QrcodeVue from 'qrcode.vue'
import type { IContent } from '../../backend/src/types/content'
import { API_BASE_URL, SOCKET_URL, getPageUrl } from './config'

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

// 处理图片上传成功
const handleUploadSuccess = () => {
  console.log('上传成功')
  ElMessage.success('上传成功')
}

// 处理图片上传失败
const handleUploadError = (err: any) => {
  console.error('上传失败:', err)
  ElMessage.error(`上传失败: ${err.response?.data?.message || err.message || '未知错误'}`)
}

// 上传前检查
const beforeUpload = (file: File) => {
  console.log('准备上传文件:', file)
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

// Socket 事件处理
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
}

.el-header {
  background-color: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
}

.content-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  gap: 20px;
}

.main-content {
  flex: 1;
  min-width: 0;
}

.qrcode-section {
  width: 300px;
  flex-shrink: 0;
}

.qrcode-container {
  background-color: #fff;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  text-align: center;
  position: sticky;
  top: 20px;
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
  margin-top: 15px;
  color: #909399;
  font-size: 14px;
}

.input-section {
  margin-bottom: 20px;
}

.input-section .el-button {
  margin-top: 10px;
}

.upload-section {
  margin-bottom: 20px;
}

.content-list {
  background-color: #fff;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.text-content {
  white-space: pre-wrap;
  word-break: break-all;
}

.image-content {
  margin: 10px 0;
}

.image-content .el-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.content-wrapper {
  position: relative;
}

.text {
  white-space: pre-wrap;
  word-break: break-all;
  margin-bottom: 8px;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 4px;
  border-radius: 4px;
}

/* 移动端样式 */
@media (max-width: 768px) {
  .content-container {
    flex-direction: column;
  }

  .qrcode-section {
    width: 100%;
    order: -1;
  }

  .qrcode-container {
    position: static;
  }
}
</style> 