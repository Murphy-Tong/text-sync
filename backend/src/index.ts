import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import dotenv from 'dotenv';
import { getLocalIP } from './utils/network';
import fs from 'fs';

import contentRoutes from './routes/contentRoutes';
import networkRoutes from './routes/networkRoutes';
import uploadRoutes from './routes/uploadRoutes';

dotenv.config();

const app = express();
const server = createServer(app);
const HOST = getLocalIP(); // 使用实际的局域网IP
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || `http://${HOST}:5173`;

const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL, `http://${HOST}:5173`],
    methods: ["GET", "POST"]
  }
});

// 设置 io 实例，以便在其他地方使用
app.set('io', io);
app.set('host', HOST);

// 中间件
app.use(cors({
  origin: [FRONTEND_URL, `http://${HOST}:5173`],
  credentials: true
}));
app.use(express.json());

// 静态文件服务
const uploadsPath = path.join(__dirname, 'uploads');
// 确保上传目录存在
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
// 配置静态文件服务
app.use('/uploads', express.static(uploadsPath));
app.use('/api/uploads', express.static(uploadsPath)); // 添加一个额外的路径

// 路由
app.use('/api/content', contentRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/upload', uploadRoutes);

// 在线用户管理
interface OnlineUser {
  id: string;
  joinTime: Date;
  socketId: string;
  deviceInfo: string;
  ip: string;
}

const onlineUsers = new Map<string, OnlineUser>();

// 获取客户端 IP 地址
const getClientIp = (socket: any) => {
  const clientIp = socket.handshake.headers['x-forwarded-for'] || 
                  socket.handshake.address || 
                  socket.request.connection.remoteAddress;
                  
  // 如果是 IPv6 格式的 IPv4 地址，提取 IPv4 部分
  if (clientIp.substr(0, 7) === '::ffff:') {
    return clientIp.substr(7);
  }
  return clientIp;
};

// Socket.io 连接处理
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('user-join', (data: { id: string; deviceInfo: string }) => {
    const user: OnlineUser = {
      id: data.id,
      deviceInfo: data.deviceInfo,
      joinTime: new Date(),
      socketId: socket.id,
      ip: getClientIp(socket)
    };
    onlineUsers.set(socket.id, user);
    
    // 广播用户列表更新
    io.emit('users-update', Array.from(onlineUsers.values()));
  });

  socket.on('sync-update', (data: unknown) => {
    // 广播更新给所有其他客户端
    socket.broadcast.emit('sync-update', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
    // 移除用户
    onlineUsers.delete(socket.id);
    // 广播用户列表更新
    io.emit('users-update', Array.from(onlineUsers.values()));
  });
});

server.listen(Number(PORT), HOST, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
}); 