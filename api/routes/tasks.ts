import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles, AuthRequest } from '../middleware/auth.js';
import type { SimulationTask, TaskParams } from '../../shared/types.js';

const router = Router();

router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const { status, page = '0', size = '10' } = req.query;
  const params = {
    status: status as string | undefined,
    page: parseInt(page as string),
    size: parseInt(size as string),
  };

  const result = db.getTasks(params);
  res.json(result);
});

router.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const task = db.getTaskById(id);

  if (!task) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }

  res.json(task);
});

router.post('/', authenticateToken, requireRoles('analyst', 'admin'), (req: AuthRequest, res: Response) => {
  const { name, description, params }: { name: string; description: string; params: TaskParams } = req.body;

  if (!name || !params) {
    res.status(400).json({ error: '缺少必要参数' });
    return;
  }

  const validation = db.validateParams(params);
  if (!validation.valid) {
    res.status(400).json({ error: '参数校验失败', validation });
    return;
  }

  const newTask = db.createTask({
    name,
    description,
    status: 'pending_validation',
    progress: 0,
    createdBy: req.user!.id,
    createdByName: req.user!.name || '未知用户',
    params,
    approvalStatus: 'pending',
    deviationCount: 0,
  });

  db.addTaskLog(newTask.id, {
    level: 'info',
    message: '任务创建成功，等待数据校验',
  });

  db.startTaskSimulation(newTask.id);

  res.status(201).json(newTask);
});

router.put('/:id/cancel', authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const task = db.getTaskById(id);

  if (!task) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }

  if (task.status === 'completed' || task.status === 'failed') {
    res.status(400).json({ error: '该任务状态不允许取消' });
    return;
  }

  const updatedTask = db.updateTask(id, { status: 'failed', progress: 0 });
  db.addTaskLog(id, {
    level: 'warning',
    message: '任务被用户取消',
  });

  res.json(updatedTask);
});

router.get('/:id/monitor', authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const task = db.getTaskById(id);

  if (!task) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }

  if (task.status === 'computing' || task.status === 'completed') {
    const now = Date.now();
    const baseTemp = 60 + Math.random() * 35;
    const basePressure = 2 + Math.random() * 3;
    const baseConcentration = 1e-7 + Math.random() * 1e-6;

    res.json({
      temperature: {
        current: baseTemp,
        max: 95,
        threshold: 100,
        units: '°C',
        timestamp: now,
      },
      pressure: {
        current: basePressure,
        max: 4.8,
        threshold: 10,
        units: 'MPa',
        timestamp: now,
      },
      concentration: {
        current: baseConcentration,
        max: 8.5e-6,
        threshold: 1e-5,
        units: 'mol/L',
        timestamp: now,
      },
    });
  } else {
    res.status(400).json({ error: '任务尚未开始计算' });
  }
});

router.get('/:id/adjustments', authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const adjustments = db.getParamAdjustments(id);
  res.json(adjustments);
});

router.get('/:id/timeline', authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const task = db.getTaskById(id);
  if (!task) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }

  const timeline: Array<{
    timestamp: string;
    action: string;
    type: 'task' | 'adjustment' | 'approval' | 'report' | 'push';
    detail: string;
    linkId?: string;
    linkType?: string;
    status?: string;
    operator?: string;
  }> = [];

  timeline.push({
    timestamp: task.createdAt,
    action: '任务创建',
    type: 'task',
    detail: `创建模拟任务「${task.name}」，创建人：${task.createdByName}`,
    operator: task.createdByName,
  });

  const adjustments = db.getParamAdjustments(id);
  for (const adj of adjustments) {
    timeline.push({
      timestamp: adj.createdAt,
      action: '参数复核调整',
      type: 'adjustment',
      detail: `调整${adj.paramName}：${adj.oldValue} → ${adj.newValue}，原因：${adj.reason}`,
      operator: adj.adjustedByName,
      linkId: adj.id,
      linkType: 'adjustment',
    });
  }

  const approvals = db.getApprovals({ taskId: id });
  for (const app of approvals) {
    const levelLabel = app.level === 1 ? '一级审批' : '二级审批';
    const statusLabel = app.status === 'pending' ? '待审批' : app.status === 'approved' ? '已通过' : '已驳回';
    timeline.push({
      timestamp: app.reviewedAt || app.createdAt,
      action: `${levelLabel}${statusLabel}`,
      type: 'approval',
      detail: app.comment
        ? `${levelLabel} ${statusLabel}，审批人：${app.approverName || '系统'}，意见：${app.comment}`
        : `${levelLabel} ${statusLabel}，审批人：${app.approverName || '待处理'}`,
      linkId: app.id,
      linkType: 'approval',
      status: app.status,
      operator: app.approverName,
    });
  }

  const reports = db.getReports(id);
  for (const rpt of reports) {
    timeline.push({
      timestamp: rpt.generatedAt || rpt.createdAt,
      action: `报告生成 V${rpt.version}`,
      type: 'report',
      detail: `生成${rpt.name}（V${rpt.version}），来源：${rpt.source || '系统自动'}`,
      linkId: rpt.id,
      linkType: 'report',
      status: rpt.status,
    });
  }

  const pushRecords = db.getPushRecords().filter((r) => r.taskId === id);
  for (const pr of pushRecords) {
    const statusLabel = pr.status === 'pending' ? '推送中' : pr.status === 'received' ? '已接收' : '推送失败';
    timeline.push({
      timestamp: pr.pushedAt,
      action: `监管推送${statusLabel}`,
      type: 'push',
      detail: `推送批次：${pr.batchNo}，推送人：${pr.pushedByName}${pr.receipt ? `，回执：${pr.receipt.receiptNo}` : ''}`,
      linkId: pr.id,
      linkType: 'push',
      status: pr.status,
      operator: pr.pushedByName,
    });
  }

  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  res.json(timeline);
});

export default router;
