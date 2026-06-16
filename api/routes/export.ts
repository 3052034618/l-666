import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticateToken, requireRoles('analyst', 'engineer', 'admin'), (req: AuthRequest, res: Response) => {
  const { taskId, unitId, timeWindow, format } = req.body;

  const task = db.getTaskById(taskId);
  if (!task) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }

  if (task.status !== 'completed') {
    res.status(400).json({ error: '任务尚未完成，无法导出数据' });
    return;
  }

  const exportId = uuidv4();
  const fileName = `${task.name}_${unitId || 'all'}_${timeWindow?.start || 'full'}.${format}`;

  setTimeout(() => {
    res.json({
      exportId,
      fileName,
      downloadUrl: `/exports/${exportId}/${fileName}`,
      fileSize: 1024 * 1024 * (2 + Math.random() * 5),
      format,
    });
  }, 1000);
});

router.get('/preview/:taskId', authenticateToken, (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;
  const task = db.getTaskById(taskId);

  if (!task) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }

  const units = [
    { id: 'unit-01', name: '处置单元A-01', status: 'available' },
    { id: 'unit-02', name: '处置单元A-02', status: 'available' },
    { id: 'unit-03', name: '处置单元B-01', status: 'available' },
    { id: 'unit-04', name: '处置单元B-02', status: 'available' },
    { id: 'all', name: '全部处置单元', status: 'available' },
  ];

  const timeWindows = [
    { id: '0-100', name: '0-100年', start: 0, end: 100 },
    { id: '0-1000', name: '0-1000年', start: 0, end: 1000 },
    { id: '1000-10000', name: '1000-10000年', start: 1000, end: 10000 },
    { id: 'full', name: '完整时间序列', start: 0, end: 100000 },
  ];

  const formats = [
    { id: 'csv', name: 'CSV 格式', description: '逗号分隔值文件' },
    { id: 'json', name: 'JSON 格式', description: 'JavaScript对象表示法' },
    { id: 'excel', name: 'Excel 格式', description: 'Microsoft Excel 文件' },
  ];

  res.json({
    units,
    timeWindows,
    formats,
  });
});

export default router;
