<template>
  <div class="file-upload">
    <div class="upload-area" @drop.prevent="handleDrop" @dragover.prevent="handleDragOver" @dragleave.prevent="handleDragLeave">
      <input type="file" ref="fileInput" @change="handleFileChange" class="file-input" />
      <div class="upload-content" :class="{ 'dragging': isDragging }">
        <div v-if="!uploading" class="upload-prompt">
          <el-icon class="upload-icon"><Upload /></el-icon>
          <p class="upload-text">点击或拖拽文件上传</p>
          <p class="upload-hint">支持任意类型的文件</p>
        </div>
        <div v-else class="progress">
          <el-progress 
            :percentage="uploadProgress" 
            :stroke-width="16"
            :show-text="true"
            :format="formatProgress"
          />
        </div>
      </div>
    </div>
    <div v-if="uploadedFiles.length > 0" class="uploaded-files">
      <h3>已上传文件</h3>
      <div class="content-items">
        <div v-for="file in uploadedFiles" :key="file.url" class="content-item">
          <div class="content-wrapper">
            <!-- 图片预览 -->
            <el-image
              v-if="isImage(file.originalname)"
              :src="getFullUrl(file.url)"
              :preview-src-list="[getFullUrl(file.url)]"
              fit="cover"
              loading="lazy"
              :initial-index="0"
              preview-teleported
              @error="handleImageError"
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
            <!-- 文件信息 -->
            <div class="file-info">
              <a :href="getFullUrl(file.url)" target="_blank" class="file-link" :title="file.originalname">
                {{ file.originalname }}
              </a>
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
              <div class="file-actions">
                <el-button
                  type="primary"
                  size="small"
                  circle
                  @click="downloadFile(file)"
                  title="下载文件"
                >
                  <el-icon><Download /></el-icon>
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  circle
                  @click="handleDelete(file.url)"
                  title="删除文件"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { Upload, Picture, PictureRounded, Delete, Download } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { API_BASE_URL } from '../config';

const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const uploading = ref(false);
const uploadProgress = ref(0);
const uploadedFiles = ref<Array<{ url: string; originalname: string; size: number }>>([]);

// 获取上传历史记录
const fetchUploadHistory = async () => {
  try {
    const response = await axios.get('/api/upload/files');
    if (response.data) {
      uploadedFiles.value = response.data;
    }
  } catch (error) {
    console.error('获取上传记录失败:', error);
    ElMessage.error('获取上传记录失败');
  }
};

// 在组件挂载时获取历史记录
onMounted(() => {
  fetchUploadHistory();
});

const isImage = (filename: string) => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};

const getFullUrl = (url: string) => {
  try {
    // 确保URL以/api开头
    if (!url.startsWith('/api')) {
      url = `/api${url}`;
    }
    console.log('Image URL:', url); // 调试信息
    return url;
  } catch (error) {
    console.error('构建图片URL失败:', error);
    return url;
  }
};

const handleDragOver = () => {
  isDragging.value = true;
};

const handleDragLeave = () => {
  isDragging.value = false;
};

const handleDrop = (e: DragEvent) => {
  isDragging.value = false;
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    uploadFile(files[0]);
  }
};

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (files && files.length > 0) {
    uploadFile(files[0]);
  }
};

const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    uploading.value = true;
    uploadProgress.value = 0;

    const response = await axios.post('/api/upload/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        }
      },
    });

    if (response.data.data) {
      // 上传成功后重新获取所有记录
      await fetchUploadHistory();
      ElMessage.success('文件上传成功');
    }
  } catch (error) {
    console.error('上传失败:', error);
    ElMessage.error('文件上传失败，请重试');
  } finally {
    uploading.value = false;
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatProgress = (percentage: number) => {
  return `${percentage}%`;
};

// 删除文件
const handleDelete = async (url: string) => {
  try {
    const encodedUrl = encodeURIComponent(url.replace('/uploads/', ''));
    await axios.delete(`/api/upload/file/${encodedUrl}`);
    ElMessage.success('文件删除成功');
    // 重新获取所有记录
    await fetchUploadHistory();
  } catch (error) {
    console.error('删除文件失败:', error);
    ElMessage.error('文件删除失败');
  }
};

// 图片加载错误处理
const handleImageError = (error: Error) => {
  console.error('图片加载失败:', error);
};

// 下载文件
const downloadFile = async (file: { url: string; originalname: string }) => {
  try {
    const response = await axios.get(getFullUrl(file.url), {
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', file.originalname);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('下载文件失败:', error);
    ElMessage.error('下载文件失败');
  }
};
</script>

<style scoped>
.file-upload {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 10px;
  box-sizing: border-box;
}

.upload-area {
  position: relative;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  margin-bottom: 15px;
  transition: all 0.3s ease;
  background-color: #fff;
}

.upload-area:hover {
  border-color: #409eff;
  background-color: rgba(64, 158, 255, 0.05);
}

.upload-area.dragging {
  border-color: #409eff;
  background-color: rgba(64, 158, 255, 0.1);
}

.file-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.upload-content {
  padding: 20px 10px;
}

.upload-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  font-size: 32px;
  color: #409eff;
}

.upload-text {
  font-size: 14px;
  color: #606266;
  margin: 0;
}

.upload-hint {
  font-size: 12px;
  color: #909399;
  margin: 0;
}

.progress {
  width: 100%;
  padding: 10px 0;
}

.uploaded-files {
  margin-top: 15px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 10px;
  background-color: #fff;
}

.uploaded-files h3 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

.content-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.content-item {
  background-color: #f5f7fa;
  border-radius: 4px;
  overflow: hidden;
}

.content-wrapper {
  display: flex;
  align-items: center;
  padding: 8px;
  gap: 8px;
}

@media (max-width: 480px) {
  .content-wrapper {
    flex-direction: column;
    align-items: stretch;
  }

  .content-wrapper .el-image {
    width: 100% !important;
    height: 200px !important;
    margin-right: 0 !important;
    margin-bottom: 8px;
  }

  .file-info {
    padding: 8px !important;
  }
}

.content-wrapper .el-image {
  width: 100px;
  height: 100px;
  margin-right: 10px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.content-wrapper .el-image :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  width: 100%;
  min-width: 0;
  flex-wrap: wrap;
}

.file-link {
  color: #409eff;
  text-decoration: none;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.file-size {
  color: #909399;
  font-size: 12px;
  white-space: nowrap;
}

.file-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

@media (max-width: 480px) {
  .file-info {
    flex-direction: column;
    align-items: flex-start;
  }

  .file-link {
    width: 100%;
  }

  .file-actions {
    margin-left: 0;
    width: 100%;
    justify-content: flex-end;
  }
}

.image-placeholder,
.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #f5f7fa;
  color: #909399;
}

.image-placeholder .el-icon,
.image-error .el-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.image-placeholder span,
.image-error span {
  font-size: 12px;
  color: #909399;
}

:deep(.el-progress-bar__outer) {
  background-color: #f5f7fa;
}

:deep(.el-progress-bar__inner) {
  background-color: #409eff;
  transition: width 0.3s ease;
}

:deep(.el-button) {
  padding: 6px !important;
}

:deep(.el-button--small) {
  min-height: 28px !important;
}
</style> 