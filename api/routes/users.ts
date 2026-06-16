import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles, AuthRequest } from '../middleware/auth.js';
import type { UserRole } from '../../shared/types.js';

const router = Router();

router.get('/', authenticateToken, requireRoles('admin'), (req: AuthRequest, res: Response) => {
  const users = db.getUsers();
  res.json(users);
});

router.post('/', authenticateToken, requireRoles('admin'), (req: AuthRequest, res: Response) => {
  const { username, password, name, role, email } = req.body;

  if (!username || !password || !name || !role || !email) {
    res.status(400).json({ error: '缺少必要参数' });
    return;
  }

  const existingUser = db.getUserByUsername(username);
  if (existingUser) {
    res.status(400).json({ error: '用户名已存在' });
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const newUser = db.createUser({
    username,
    name,
    role: role as UserRole,
    email,
    passwordHash,
  });

  res.status(201).json(newUser);
});

router.put('/:id', authenticateToken, requireRoles('admin'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, role, email, password } = req.body;

  const updates: Partial<any> = {};
  if (name) updates.name = name;
  if (role) updates.role = role;
  if (email) updates.email = email;
  if (password) updates.passwordHash = bcrypt.hashSync(password, 10);

  const updatedUser = db.updateUser(id, updates);
  if (!updatedUser) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  res.json(updatedUser);
});

router.delete('/:id', authenticateToken, requireRoles('admin'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (req.user!.id === id) {
    res.status(400).json({ error: '不能删除自己' });
    return;
  }

  const success = db.deleteUser(id);
  if (!success) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  res.json({ message: '删除成功' });
});

export default router;
