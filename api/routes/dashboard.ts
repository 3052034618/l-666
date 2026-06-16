import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/stats', authenticateToken, (req: AuthRequest, res: Response) => {
  const stats = db.getDashboardStats();
  res.json(stats);
});

export default router;
