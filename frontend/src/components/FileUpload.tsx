import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Upload, message, Progress, List, Button, Modal } from 'antd';
import { InboxOutlined, DeleteOutlined } from '@ant-design/icons';
import { UploadFile } from 'antd/es/upload/interface';

const { Dragger } = Upload;

interface UploadRecord {
  url: string;
  originalname: string;
  size: number;
  createdAt: string;
}

const FileUpload: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadRecords, setUploadRecords] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取上传记录
  const fetchUploadRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/upload/files');
      if (response.data) {
        setUploadRecords(response.data);
      }
    } catch (error) {
      console.error('获取上传记录失败:', error);
      message.error('获取上传记录失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUploadRecords();
  }, [fetchUploadRecords]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', acceptedFiles[0]);

    try {
      const response = await axios.post('/api/upload/file', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total!
          );
          setProgress(percentCompleted);
        },
      });

      if (response.data) {
        message.success('文件上传成功');
        // 重新获取所有记录以确保数据一致性
        await fetchUploadRecords();
      }
    } catch (error) {
      console.error('文件上传失败:', error);
      message.error('文件上传失败');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [fetchUploadRecords]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  });

  const handleDelete = async (url: string) => {
    try {
      const encodedUrl = encodeURIComponent(url.replace('/uploads/', ''));
      await axios.delete(`/api/upload/file/${encodedUrl}`);
      message.success('文件删除成功');
      // 重新获取所有记录以确保数据一致性
      await fetchUploadRecords();
    } catch (error) {
      console.error('删除文件失败:', error);
      message.error('删除文件失败');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div style={{ padding: '20px' }}>
      <div
        {...getRootProps()}
        style={{
          border: '2px dashed #d9d9d9',
          borderRadius: '4px',
          padding: '20px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragActive ? '#fafafa' : '#fff',
        }}
      >
        <input {...getInputProps()} />
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          点击或拖拽文件到此处上传
        </p>
        <p className="ant-upload-hint">
          支持单个文件上传
        </p>
      </div>

      {uploading && (
        <div style={{ marginTop: '20px' }}>
          <Progress percent={progress} />
        </div>
      )}

      <List
        style={{ marginTop: '20px' }}
        header={<div>上传记录</div>}
        bordered
        loading={loading}
        dataSource={uploadRecords}
        renderItem={(record) => (
          <List.Item
            actions={[
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record.url)}
              />,
            ]}
          >
            <List.Item.Meta
              title={record.originalname}
              description={`大小: ${formatFileSize(record.size)}`}
            />
            <div style={{ color: '#999', fontSize: '12px' }}>
              {new Date(record.createdAt).toLocaleString()}
            </div>
          </List.Item>
        )}
      />
    </div>
  );
};

export default FileUpload; 