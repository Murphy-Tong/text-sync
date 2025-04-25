import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadFile, getUploads, deleteFile } from '../controllers/uploadController';

const router = express.Router();

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// 文件过滤器
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 这里可以根据需要添加文件类型限制
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter
});

// 文件上传路由
router.post('/file', upload.single('file'), uploadFile);

// 获取上传记录
router.get('/files', getUploads);

// 删除文件
router.delete('/file/:url', deleteFile);

export default router; 