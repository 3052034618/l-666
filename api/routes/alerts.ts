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

router.put('/:id/review', authenticateToken, requireRoles('analyst', 'geologist', 'engineer', 'admin'), async (req: AuthRequest, res: Response) => {
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

  if (adjustmentParams && (adjustmentParams.spacing || adjustmentParams.bufferThickness)) {
    const task = db.getTaskById(alert.taskId);
    if (task) {
      const newParams = { ...task.params };
      let hasChanges = false;

      if (adjustmentParams.spacing && adjustmentParams.spacing !== task.params.wastePackageParams.spacing) {
        db.createParamAdjustment({
          taskId: alert.taskId,
          paramName: 'wastePackageParams.spacing',
          oldValue: task.params.wastePackageParams.spacing,
          newValue: adjustmentParams.spacing,
          reason: comment || '预警复核调整 - 废物包间距',
          adjustedBy: req.user!.id,
          adjustedByName: req.user!.name || '未知用户',
          createdAt: new Date().toISOString(),
        });
        newParams.wastePackageParams = {
          ...newParams.wastePackageParams,
          spacing: adjustmentParams.spacing,
        };
        hasChanges = true;
      }

      if (adjustmentParams.bufferThickness && adjustmentParams.bufferThickness !== task.params.engineeringBarrierParams.bufferLayer.thickness) {
        db.createParamAdjustment({
          taskId: alert.taskId,
          paramName: 'engineeringBarrierParams.bufferLayer.thickness',
          oldValue: task.params.engineeringBarrierParams.bufferLayer.thickness,
          newValue: adjustmentParams.bufferThickness,
          reason: comment || '预警复核调整 - 缓冲层厚度',
          adjustedBy: req.user!.id,
          adjustedByName: req.user!.name || '未知用户',
          createdAt: new Date().toISOString(),
        });
        newParams.engineeringBarrierParams = {
          ...newParams.engineeringBarrierParams,
          bufferLayer: {
            ...newParams.engineeringBarrierParams.bufferLayer,
            thickness: adjustmentParams.bufferThickness,
          },
        };
        hasChanges = true;
      }

      if (hasChanges) {
        db.addTaskLog(alert.taskId, {
          level: 'warning',
          message: `预警复核调整参数，准备重新模拟。${adjustmentParams.spacing ? `废物包间距: ${task.params.wastePackageParams.spacing}m → ${adjustmentParams.spacing}m` : ''} ${adjustmentParams.bufferThickness ? `缓冲层厚度: ${task.params.engineeringBarrierParams.bufferLayer.thickness}m → ${adjustmentParams.bufferThickness}m` : ''}`,
        });

        db.updateTask(alert.taskId, {
          params: newParams,
          status: 'pending_validation',
          progress: 0,
          result: undefined,
          approvalStatus: 'pending',
          updatedAt: new Date().toISOString(),
        });

        db.addTaskLog(alert.taskId, {
          level: 'info',
          message: '参数更新完成，任务已重置，开始重新模拟...',
        });

        await db.startTaskSimulation(alert.taskId);
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
