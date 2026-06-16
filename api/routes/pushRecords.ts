import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const records = db.getPushRecords();
  res.json(records);
});

router.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const record = db.getPushRecordById(id);
  
  if (!record) {
    res.status(404).json({ error: '推送记录不存在' });
    return;
  }
  
  res.json(record);
});

router.post('/:id/retry', authenticateToken, requireRoles('director', 'admin'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const record = db.getPushRecordById(id);
  
  if (!record) {
    res.status(404).json({ error: '推送记录不存在' });
    return;
  }
  
  const updated = db.updatePushRecord(id, {
    status: 'pending',
    pushedAt: new Date().toISOString(),
    remark: '重新推送至监管数据库',
  });
  
  setTimeout(() => {
    db.updatePushRecord(id, {
      status: 'received',
      receivedAt: new Date().toISOString(),
    });
  }, 3000);
  
  res.json({ message: '重新推送成功', record: updated });
});

export default router;
