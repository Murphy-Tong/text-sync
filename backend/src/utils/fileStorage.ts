import fs from 'fs';
import path from 'path';

const STORAGE_FILE = path.join(__dirname, '../data/uploads.json');

interface UploadRecord {
  url: string;
  originalname: string;
  size: number;
  createdAt: string;
}

// 确保存储文件存在
const ensureStorageFile = () => {
  const dir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STORAGE_FILE)) {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify([]));
  }
};

// 读取所有上传记录
export const readUploads = (): UploadRecord[] => {
  ensureStorageFile();
  try {
    const data = fs.readFileSync(STORAGE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取上传记录失败:', error);
    return [];
  }
};

// 添加新的上传记录
export const addUpload = (record: Omit<UploadRecord, 'createdAt'>): UploadRecord => {
  ensureStorageFile();
  const uploads = readUploads();
  const newRecord = {
    ...record,
    createdAt: new Date().toISOString()
  };
  uploads.unshift(newRecord);
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(uploads, null, 2));
  return newRecord;
};

// 删除上传记录
export const deleteUpload = (url: string): boolean => {
  ensureStorageFile();
  const uploads = readUploads();
  const initialLength = uploads.length;
  const filteredUploads = uploads.filter(record => record.url !== url);
  
  if (filteredUploads.length !== initialLength) {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(filteredUploads, null, 2));
    return true;
  }
  return false;
}; 