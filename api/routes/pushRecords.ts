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

  const retryAt = new Date().toISOString();
  const newBatchNo = `REG-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  
  const updated = db.updatePushRecord(id, {
    status: 'pending',
    pushedAt: retryAt,
    batchNo: newBatchNo,
    remark: '重新推送至监管数据库',
    receipt: undefined,
    receivedAt: undefined,
    syncLogs: [
      ...record.syncLogs,
      { timestamp: retryAt, action: '重新推送', status: 'pending', detail: `重新推送，新批次号：${newBatchNo}` },
    ],
  });
  
  setTimeout(() => {
    const receivedAt = new Date().toISOString();
    const current = db.getPushRecordById(id);
    if (current) {
      db.updatePushRecord(id, {
        status: 'received',
        receivedAt,
        receipt: {
          receiptNo: `RCPT-${Date.now()}`,
          receivedBy: '国家核安全局监管处',
          receivedOrg: '国家核安全局',
          message: '数据接收确认，格式校验通过，已入库归档',
        },
        syncLogs: [
          ...current.syncLogs,
          { timestamp: receivedAt, action: '接收确认', status: 'success', detail: '国家核安全局已确认接收，回执号：RCPT-' + Date.now() },
        ],
      });
    }
  }, 3000);
  
  res.json({ message: '重新推送成功', record: updated });
});

export default router;
