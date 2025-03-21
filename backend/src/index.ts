import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import dotenv from 'dotenv';
import { getLocalIP } from './utils/network';

import contentRoutes from './routes/contentRoutes';
import networkRoutes from './routes/networkRoutes';

dotenv.config();

const app = express();
const server = createServer(app);
const HOST = getLocalIP();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || `http://${HOST}:5173`;

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"]
  }
});

// 设置 io 实例，以便在其他地方使用
app.set('io', io);
app.set('host', HOST);

// 中间件
app.use(cors({
  origin: FRONTEND_URL
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 路由
app.use('/api/content', contentRoutes);
app.use('/api/network', networkRoutes);

// Socket.io 连接处理
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('sync-update', (data: unknown) => {
    // 广播更新给所有其他客户端
    socket.broadcast.emit('sync-update', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(Number(PORT), HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
}); 