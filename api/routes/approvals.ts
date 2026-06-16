import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const { level, status } = req.query;
  const params = {
    level: level ? parseInt(level as string) : undefined,
    status: status as string | undefined,
  };

  const approvals = db.getApprovals(params);
  res.json(approvals);
});

router.put('/:id', authenticateToken, requireRoles('engineer', 'director', 'admin'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, comment } = req.body;

  const approval = db.getApprovalById(id);
  if (!approval) {
    res.status(404).json({ error: '审批不存在' });
    return;
  }

  if (approval.level === 1 && !['engineer', 'admin'].includes(req.user!.role)) {
    res.status(403).json({ error: '您没有一级审批权限' });
    return;
  }

  if (approval.level === 2 && !['director', 'admin'].includes(req.user!.role)) {
    res.status(403).json({ error: '您没有二级审批权限' });
    return;
  }

  const updatedApproval = db.updateApproval(id, {
    status,
    approverId: req.user!.id,
    approverName: req.user!.name,
    comment,
    reviewedAt: new Date().toISOString(),
  });

  if (status === 'approved') {
    const task = db.getTaskById(approval.taskId);
    if (task) {
      if (approval.level === 1) {
        db.updateTask(approval.taskId, { approvalStatus: 'approved_level1' });
        
        db.createApproval({
          taskId: approval.taskId,
          taskName: approval.taskName,
          level: 2,
          status: 'pending',
          createdAt: new Date().toISOString(),
        });
      } else if (approval.level === 2) {
        db.updateTask(approval.taskId, { approvalStatus: 'approved_level2' });
      }
    }
  } else if (status === 'rejected') {
    db.updateTask(approval.taskId, { approvalStatus: 'rejected' });
  }

  res.json(updatedApproval);
});

router.post('/push/:taskId', authenticateToken, requireRoles('director', 'admin'), (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;
  const task = db.getTaskById(taskId);

  if (!task) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }

  if (task.approvalStatus !== 'approved_level2') {
    res.status(400).json({ error: '任务尚未完成两级审批' });
    return;
  }

  db.updateTask(taskId, { approvalStatus: 'pushed' });

  res.json({ message: '已成功推送至监管数据库', taskId });
});

export default router;
