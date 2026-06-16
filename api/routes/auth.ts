import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth.js';
import type { LoginRequest, LoginResponse } from '../../shared/types.js';

const router = Router();

router.post('/login', (req: Request, res: Response<LoginResponse | { error: string }>) => {
  const { username, password }: LoginRequest = req.body;

  const user = db.getUserByUsername(username);
  if (!user) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  const isValidPassword = bcrypt.compareSync(password, user.passwordHash);
  
  if (!isValidPassword) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  const token = generateToken(user);
  db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });

  res.json({ token, user });
});

router.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: '未认证' });
    return;
  }

  const user = db.getUserById(req.user.id);
  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  res.json(user);
});

export default router;
