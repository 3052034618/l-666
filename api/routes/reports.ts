import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import type { ReportType } from '../../shared/types.js';

const router = Router();

router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const { taskId } = req.query;
  const reports = db.getReports(taskId as string | undefined);
  res.json(reports);
});

router.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const { taskId, type }: { taskId: string; type: ReportType } = req.body;

  const task = db.getTaskById(taskId);
  if (!task) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }

  if (task.status !== 'completed') {
    res.status(400).json({ error: '任务尚未完成，无法生成报告' });
    return;
  }

  const typeNames: Record<ReportType, string> = {
    comprehensive: '综合评估报告',
    temperature: '温度场分析报告',
    stress: '应力应变分析报告',
    nuclide: '核素迁移分析报告',
  };

  const newReport = db.createReport({
    taskId,
    taskName: task.name,
    name: typeNames[type],
    type,
    status: 'generating',
    createdAt: new Date().toISOString(),
  });

  setTimeout(() => {
    db.updateReport(newReport.id, {
      status: 'ready',
      fileUrl: `/reports/${taskId}-${type}.pdf`,
      generatedAt: new Date().toISOString(),
    });
  }, 2000);

  res.status(201).json(newReport);
});

router.get('/:id/download', authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const report = db.getReportById(id);

  if (!report) {
    res.status(404).json({ error: '报告不存在' });
    return;
  }

  if (report.status !== 'ready') {
    res.status(400).json({ error: '报告尚未生成完成' });
    return;
  }

  res.json({
    downloadUrl: report.fileUrl,
    fileName: `${report.name}.pdf`,
  });
});

export default router;
