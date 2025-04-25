import { Request, Response } from 'express';
import path from 'path';
import { addUpload, readUploads, deleteUpload } from '../utils/fileStorage';
import fs from 'fs';

export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '没有上传文件' });
    }

    const file = req.file;
    const fileUrl = `/uploads/${file.filename}`;
    
    // 保存上传记录
    const record = addUpload({
      url: fileUrl,
      originalname: file.originalname,
      size: file.size
    });
    
    res.status(200).json({
      message: '文件上传成功',
      data: record
    });
  } catch (error) {
    console.error('文件上传错误:', error);
    res.status(500).json({ message: '文件上传失败' });
  }
};

export const getUploads = async (req: Request, res: Response) => {
  try {
    const uploads = readUploads();
    res.status(200).json(uploads);
  } catch (error) {
    console.error('获取上传记录失败:', error);
    res.status(500).json({ message: '获取上传记录失败' });
  }
};

export const deleteFile = async (req: Request, res: Response) => {
  try {
    const { url } = req.params;
    const success = deleteUpload(url);
    
    if (success) {
      // 删除实际文件
      const filename = path.basename(url);
      const filePath = path.join(__dirname, '../uploads', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      res.status(200).json({ message: '文件删除成功' });
    } else {
      res.status(404).json({ message: '文件不存在' });
    }
  } catch (error) {
    console.error('删除文件失败:', error);
    res.status(500).json({ message: '删除文件失败' });
  }
}; 