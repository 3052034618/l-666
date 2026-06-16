import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles, AuthRequest } from '../middleware/auth.js';
import type { AlertStatus } from '../../shared/types.js';

const router = Router();

router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const { level, status } = req.query;
  const params = {
    level: level as string | undefined,
    status: status as string | undefined,
  };

  const alerts = db.getAlerts(params);
  res.json(alerts);
});

router.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const alert = db.getAlertById(id);

  if (!alert) {
    res.status(404).json({ error: '预警不存在' });
    return;
  }

  res.json(alert);
});

router.put('/:id/review', authenticateToken, requireRoles('analyst', 'geologist', 'engineer', 'admin'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { comment, adjustmentParams } = req.body;

  const alert = db.getAlertById(id);
  if (!alert) {
    res.status(404).json({ error: '预警不存在' });
    return;
  }

  const updatedAlert = db.updateAlert(id, {
    status: 'reviewed',
    reviewedBy: req.user!.id,
    reviewedByName: req.user!.name,
    reviewComment: comment,
    reviewedAt: new Date().toISOString(),
  });

  if (adjustmentParams) {
    const task = db.getTaskById(alert.taskId);
    if (task) {
      if (adjustmentParams.spacing) {
        db.createParamAdjustment({
          taskId: alert.taskId,
          paramName: 'wastePackageParams.spacing',
          oldValue: task.params.wastePackageParams.spacing,
          newValue: adjustmentParams.spacing,
          reason: comment || '预警复核调整',
          adjustedBy: req.user!.id,
          adjustedByName: req.user!.name || '未知用户',
          createdAt: new Date().toISOString(),
        });
      }
      if (adjustmentParams.bufferThickness) {
        db.createParamAdjustment({
          taskId: alert.taskId,
          paramName: 'engineeringBarrierParams.bufferLayer.thickness',
          oldValue: task.params.engineeringBarrierParams.bufferLayer.thickness,
          newValue: adjustmentParams.bufferThickness,
          reason: comment || '预警复核调整',
          adjustedBy: req.user!.id,
          adjustedByName: req.user!.name || '未知用户',
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  res.json(updatedAlert);
});

router.put('/:id/resolve', authenticateToken, requireRoles('analyst', 'geologist', 'engineer', 'admin'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const alert = db.getAlertById(id);
  if (!alert) {
    res.status(404).json({ error: '预警不存在' });
    return;
  }

  const updatedAlert = db.updateAlert(id, {
    status: 'resolved',
  });

  res.json(updatedAlert);
});

export default router;
