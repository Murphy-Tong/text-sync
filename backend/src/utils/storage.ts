import fs from 'fs/promises';
import path from 'path';
import { IContent } from '../types/content';

const DATA_FILE = path.join(__dirname, '../data/contents.json');

// 确保数据目录存在
async function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

// 读取所有内容
export async function getAllContents(): Promise<IContent[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // 如果文件不存在，返回空数组
    return [];
  }
}

// 保存所有内容
async function saveContents(contents: IContent[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(contents, null, 2));
}

// 添加新内容
export async function addContent(content: IContent): Promise<IContent> {
  const contents = await getAllContents();
  const newContent = {
    ...content,
    _id: Date.now().toString(), // 使用时间戳作为ID
    createdAt: new Date(),
    updatedAt: new Date()
  };
  contents.push(newContent);
  await saveContents(contents);
  return newContent;
}

// 删除内容
export async function deleteContent(id: string): Promise<boolean> {
  const contents = await getAllContents();
  const initialLength = contents.length;
  const filteredContents = contents.filter(content => content._id !== id);
  
  if (filteredContents.length === initialLength) {
    return false;
  }
  
  await saveContents(filteredContents);
  return true;
}

// 清空所有内容
export async function clearAllContents(): Promise<void> {
  await saveContents([]);
} 