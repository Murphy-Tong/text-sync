import express from 'express';
import { getLocalIP } from '../utils/network';

const router = express.Router();

router.get('/ip', (req, res) => {
  const ip = getLocalIP();
  res.json({ ip });
});

export default router; 