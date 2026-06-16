import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const recommendations = db.getRecommendations();
  res.json(recommendations);
});

router.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const { basedOnTaskId, recommendedParams, explanation } = req.body;

  const basedOnTask = basedOnTaskId ? db.getTaskById(basedOnTaskId) : null;

  const newRec = db.createRecommendation({
    basedOnTaskId,
    basedOnTaskName: basedOnTask?.name,
    recommendedParams,
    confidenceScore: 0.85 + Math.random() * 0.1,
    explanation: explanation || '基于历史数据分析生成的推荐方案',
    createdAt: new Date().toISOString(),
  });

  res.status(201).json(newRec);
});

export default router;
