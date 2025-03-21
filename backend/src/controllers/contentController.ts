import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { CreateTextContentDto, CreateImageContentDto } from '../types/content';
import * as storage from '../utils/storage';

// 配置 multer 存储
const fileStorage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

export const upload = multer({ storage: fileStorage });

// 获取所有内容
export const getAllContent = async (_req: Request, res: Response): Promise<void> => {
  try {
    const contents = await storage.getAllContents();
    res.json(contents);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '未知错误' });
  }
};

// 添加文字内容
export const addTextContent = async (req: Request<{}, {}, CreateTextContentDto>, res: Response): Promise<void> => {
  try {
    const newContent = await storage.addContent({
      type: 'text',
      content: req.body.content
    });
    
    // 通知所有客户端
    req.app.get('io').emit('sync-update', newContent);
    res.status(201).json(newContent);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : '未知错误' });
  }
};

// 上传图片
export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: '没有上传文件' });
      return;
    }

    const newContent = await storage.addContent({
      type: 'image',
      content: req.file.originalname,
      imageUrl: `/uploads/${req.file.filename}`
    });

    // 通知所有客户端
    req.app.get('io').emit('sync-update', newContent);
    res.status(201).json(newContent);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : '未知错误' });
  }
};

// 删除内容
export const deleteContent = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const deleted = await storage.deleteContent(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: '内容不存在' });
      return;
    }
    
    // 通知所有客户端
    req.app.get('io').emit('sync-delete', req.params.id);
    res.json({ message: '内容已删除' });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '未知错误' });
  }
};

// 清空所有内容
export const clearAllContents = async (req: Request, res: Response): Promise<void> => {
  try {
    await storage.clearAllContents();
    
    // 通知所有客户端清空内容
    req.app.get('io').emit('sync-clear');
    res.json({ message: '所有内容已清空' });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '未知错误' });
  }
}; 