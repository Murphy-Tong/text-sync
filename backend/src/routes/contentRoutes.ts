import { Router } from 'express';
import * as contentController from '../controllers/contentController';

const router = Router();

// 获取所有内容
router.get('/', contentController.getAllContent);

// 添加文字内容
router.post('/text', contentController.addTextContent);

// 上传图片
router.post('/image', contentController.upload.single('image'), contentController.uploadImage);

// 删除内容
router.delete('/:id', contentController.deleteContent);

export default router; 