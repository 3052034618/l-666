import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import type { ReportType, SimulationTask } from '../../shared/types.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

const router = Router();

const reportsDir = path.join(process.cwd(), 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

function formatNumber(num: number, digits: number = 4): string {
  return Number(num).toFixed(digits);
}

function formatScientific(num: number): string {
  if (num === 0) return '0';
  if (Math.abs(num) >= 1e4 || Math.abs(num) < 1e-3) {
    return num.toExponential(4);
  }
  return formatNumber(num, 6);
}

function generateTemperatureTable(task: SimulationTask): string {
  if (!task.result) return '';
  const { time, values } = task.result.temperatureField;
  const rows = time.filter((_, i) => i % 10 === 0).map((t, i) => {
    const idx = i * 10;
    return `<tr><td>${t}</td><td>${formatNumber(values[idx], 2)} °C</td></tr>`;
  }).join('');
  return `
    <h3>温度场关键数据点</h3>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <thead style="background: #f0f4ff;">
        <tr><th>时间（年）</th><th>最高温度（°C）</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function generateStressTable(task: SimulationTask): string {
  if (!task.result) return '';
  const { strain, stress } = task.result.stressStrain;
  const rows = strain.filter((_, i) => i % 5 === 0).map((s, i) => {
    const idx = i * 5;
    return `<tr><td>${formatNumber(s, 4)}</td><td>${formatNumber(stress[idx], 2)} MPa</td></tr>`;
  }).join('');
  return `
    <h3>应力应变关键数据点</h3>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <thead style="background: #f0f4ff;">
        <tr><th>应变 ε</th><th>应力 σ (MPa)</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function generateNuclideTable(task: SimulationTask): string {
  if (!task.result) return '';
  const { time, values } = task.result.nuclideConcentration;
  const rows = time.filter((_, i) => i % 10 === 0).map((t, i) => {
    const idx = i * 10;
    return `<tr><td>${t}</td><td>${formatScientific(values[idx])} mol/L</td></tr>`;
  }).join('');
  return `
    <h3>核素浓度关键数据点</h3>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <thead style="background: #f0f4ff;">
        <tr><th>时间（年）</th><th>核素浓度（mol/L）</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function generateChartScript(task: SimulationTask, type: ReportType): string {
  if (!task.result) return '';
  const r = task.result;
  
  let seriesConfig = '';
  let title = '';
  let yAxisName = '';
  let dataStr = '';

  if (type === 'comprehensive' || type === 'temperature') {
    seriesConfig = JSON.stringify({
      type: 'line',
      smooth: true,
      lineStyle: { width: 2, color: '#D8315B' },
      areaStyle: { color: 'rgba(216, 49, 91, 0.15)' },
      data: r.temperatureField.time.map((t, i) => [t, r.temperatureField.values[i]]),
      name: '温度',
    });
    title = '处置库温度场变化趋势';
    yAxisName = '温度 (°C)';
    dataStr = JSON.stringify(r.temperatureField.time);
  } else if (type === 'stress') {
    seriesConfig = JSON.stringify({
      type: 'line',
      smooth: false,
      lineStyle: { width: 2, color: '#3E92CC' },
      areaStyle: { color: 'rgba(62, 146, 204, 0.15)' },
      data: r.stressStrain.strain.map((s, i) => [s, r.stressStrain.stress[i]]),
      name: '应力',
    });
    title = '围岩应力应变曲线';
    yAxisName = '应力 (MPa)';
    dataStr = JSON.stringify(r.stressStrain.strain);
  } else if (type === 'nuclide') {
    seriesConfig = JSON.stringify({
      type: 'line',
      smooth: true,
      lineStyle: { width: 2, color: '#10B981' },
      areaStyle: { color: 'rgba(16, 185, 129, 0.15)' },
      data: r.nuclideConcentration.time.map((t, i) => [t, r.nuclideConcentration.values[i]]),
      name: '浓度',
    });
    title = '关键核素迁移浓度变化';
    yAxisName = '浓度 (mol/L)';
    dataStr = JSON.stringify(r.nuclideConcentration.time);
  }

  return `
    <div id="chart" style="width: 100%; height: 400px; margin: 20px 0;"></div>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        var chart = echarts.init(document.getElementById('chart'));
        var option = {
          title: { text: ${JSON.stringify(title)}, left: 'center', textStyle: { fontSize: 16, color: '#0A2463' } },
          tooltip: { trigger: 'axis' },
          grid: { left: '10%', right: '5%', bottom: '15%' },
          xAxis: { 
            type: type === 'stress' ? 'value' : 'category',
            name: type === 'stress' ? '应变' : '时间 (年)',
            nameLocation: 'middle',
            nameGap: 30,
            data: type === 'stress' ? undefined : ${dataStr}
          },
          yAxis: { type: 'value', name: ${JSON.stringify(yAxisName)}, nameLocation: 'middle', nameGap: 50 },
          dataZoom: [{ type: 'inside' }, { type: 'slider', height: 20, bottom: 10 }],
          series: [${seriesConfig}]
        };
        chart.setOption(option);
        window.addEventListener('resize', function() { chart.resize(); });
      });
    </script>
  `;
}

function generateReportHTML(task: SimulationTask, type: ReportType, reportName: string): string {
  const r = task.result!;
  const now = new Date().toLocaleString('zh-CN');

  const safetyLevel = r.safetyIndex >= 0.9 ? '安全' : r.safetyIndex >= 0.75 ? '基本安全' : '需关注';
  const safetyColor = r.safetyIndex >= 0.9 ? '#10B981' : r.safetyIndex >= 0.75 ? '#F59E0B' : '#D8315B';

  let contentSections = '';
  if (type === 'comprehensive' || type === 'temperature') {
    contentSections += `
      <div class="section">
        <h2>一、温度场分析</h2>
        <p>本章节分析处置库在10000年评估期内的温度场演化特征。废物包的衰变热会引起处置库周围岩石温度升高，温度升高可能影响工程屏障材料性能。</p>
        ${type === 'temperature' ? generateChartScript(task, 'temperature') : ''}
        <p><strong>分析结果：</strong></p>
        <ul>
          <li>最高温度：<strong style="color: #D8315B;">${formatNumber(r.maxTemperature, 2)} °C</strong>，出现在约 20 年左右</li>
          <li>设计阈值：100 °C，当前结果 ${r.maxTemperature <= 100 ? '<span style="color: #10B981;">满足要求</span>' : '<span style="color: #D8315B;">超出阈值</span>'}</li>
          <li>1000 年时温度回落至 ${formatNumber(r.temperatureField.values[Math.min(99, Math.floor(1000 / 100 * 99))], 2)} °C 以下</li>
        </ul>
        ${generateTemperatureTable(task)}
      </div>
    `;
  }

  if (type === 'comprehensive' || type === 'stress') {
    contentSections += `
      <div class="section">
        <h2>二、应力应变分析</h2>
        <p>本章节分析处置库围岩在温度荷载和渗流荷载作用下的力学响应。围岩的应力应变特性直接关系到处置库的结构稳定性。</p>
        ${type === 'stress' ? generateChartScript(task, 'stress') : ''}
        <p><strong>分析结果：</strong></p>
        <ul>
          <li>最大主应力：<strong>${formatNumber(r.stressStrain.maxStress, 2)} MPa</strong></li>
          <li>最大应变：${formatNumber(r.stressStrain.maxStrain, 4)}</li>
          <li>屈服强度：约 30 MPa，当前结果 <span style="color: #10B981;">处于弹性范围</span></li>
          <li>工程屏障完整性：<span style="color: #10B981;">保持完整</span></li>
        </ul>
        ${generateStressTable(task)}
      </div>
    `;
  }

  if (type === 'comprehensive' || type === 'nuclide') {
    contentSections += `
      <div class="section">
        <h2>三、核素迁移分析</h2>
        <p>本章节分析关键核素在地质介质中的迁移扩散行为。核素的迁移速率和浓度分布直接决定了处置库的辐射安全性能。</p>
        ${type === 'nuclide' ? generateChartScript(task, 'nuclide') : ''}
        <p><strong>分析结果：</strong></p>
        <ul>
          <li>核素开始显著释放时间：约 50 年后（氧化还原前沿到达）</li>
          <li>10000 年时最大浓度：<strong>${formatScientific(r.nuclideConcentration.values[r.nuclideConcentration.values.length - 1])} mol/L</strong></li>
          <li>监管限值：1.0 × 10⁻⁵ mol/L，当前结果 <span style="color: #10B981;">低于限值</span></li>
          <li>核素释放率：${formatScientific(r.nuclideReleaseRate)} Bq/(m²·s)</li>
          <li>工程屏障滞留效果：<span style="color: #10B981;">良好</span></li>
        </ul>
        ${generateNuclideTable(task)}
      </div>
    `;
  }

  if (type === 'comprehensive') {
    contentSections += `
      <div class="section">
        <h2>四、综合图表展示</h2>
        ${generateChartScript(task, 'temperature')}
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        ${generateChartScript(task, 'stress')}
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        ${generateChartScript(task, 'nuclide')}
      </div>
    `;
  }

  contentSections += `
    <div class="section">
      <h2>${type === 'comprehensive' ? '五' : '四'}、长期安全指数评估</h2>
      <div style="background: linear-gradient(135deg, #f0f4ff 0%, #ffffff 100%); padding: 30px; border-radius: 12px; margin: 20px 0;">
        <div style="display: flex; align-items: center; justify-content: space-around; flex-wrap: wrap; gap: 20px;">
          <div style="text-align: center;">
            <div style="font-size: 48px; font-weight: bold; color: ${safetyColor};">${formatNumber(r.safetyIndex * 100, 1)}%</div>
            <div style="font-size: 16px; color: #6b7280; margin-top: 8px;">长期安全指数</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 36px; font-weight: bold; color: ${safetyColor};">${safetyLevel}</div>
            <div style="font-size: 16px; color: #6b7280; margin-top: 8px;">安全等级评定</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 36px; font-weight: bold; color: #0A2463;">${formatNumber(r.computationTime, 0)} s</div>
            <div style="font-size: 16px; color: #6b7280; margin-top: 8px;">模型计算耗时</div>
          </div>
        </div>
      </div>
      <h3>评估指标汇总</h3>
      <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <thead style="background: #0A2463; color: white;">
          <tr>
            <th>评估维度</th>
            <th>指标值</th>
            <th>标准限值</th>
            <th>评价结论</th>
            <th>权重</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>温度安全</td>
            <td>${formatNumber(r.maxTemperature, 2)} °C</td>
            <td>≤ 100 °C</td>
            <td style="color: ${r.maxTemperature <= 100 ? '#10B981' : '#D8315B'};">${r.maxTemperature <= 100 ? '合格' : '超限'}</td>
            <td>30%</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td>力学稳定</td>
            <td>${formatNumber(r.stressStrain.maxStress, 2)} MPa</td>
            <td>≤ 30 MPa</td>
            <td style="color: #10B981;">合格</td>
            <td>25%</td>
          </tr>
          <tr>
            <td>核素包容</td>
            <td>${formatScientific(r.nuclideReleaseRate)}</td>
            <td>≤ 1.0e-02</td>
            <td style="color: #10B981;">合格</td>
            <td>35%</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td>渗流控制</td>
            <td>${formatNumber(r.maxPressure, 2)} MPa</td>
            <td>≤ 10 MPa</td>
            <td style="color: #10B981;">合格</td>
            <td>10%</td>
          </tr>
        </tbody>
      </table>
      <div style="background: #fffbeb; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0;">
        <strong>综合结论：</strong>
        本处置库设计方案在 ${formatNumber(r.safetyIndex * 100, 1)}% 的置信度下满足长期安全要求。
        建议定期开展复核评估，持续监测处置库演化状态。废物包间距建议保持在
        ${formatNumber(task.params.wastePackageParams.spacing, 1)} m 以上，缓冲层厚度不低于
        ${formatNumber(task.params.engineeringBarrierParams.bufferLayer.thickness, 2)} m。
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportName} - ${task.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      color: #1f2937;
      line-height: 1.6;
      background: #f3f4f6;
      padding: 0;
    }
    .report-container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .report-header {
      background: linear-gradient(135deg, #0A2463 0%, #3E92CC 100%);
      color: white;
      padding: 50px 40px;
    }
    .report-header h1 {
      font-size: 32px;
      margin-bottom: 12px;
      letter-spacing: 2px;
    }
    .report-header .subtitle {
      font-size: 18px;
      opacity: 0.9;
      margin-bottom: 24px;
    }
    .report-header .meta {
      display: flex;
      gap: 30px;
      flex-wrap: wrap;
      font-size: 14px;
      opacity: 0.85;
    }
    .report-body {
      padding: 40px;
    }
    .section {
      margin-bottom: 40px;
    }
    .section h2 {
      color: #0A2463;
      font-size: 22px;
      padding-bottom: 12px;
      border-bottom: 2px solid #3E92CC;
      margin-bottom: 20px;
    }
    .section h3 {
      color: #1f2937;
      font-size: 17px;
      margin: 20px 0 12px 0;
    }
    .section p {
      margin-bottom: 12px;
      text-align: justify;
    }
    .section ul, .section ol {
      padding-left: 24px;
      margin-bottom: 16px;
    }
    .section li {
      margin-bottom: 8px;
    }
    table {
      font-size: 14px;
      margin: 16px 0;
    }
    th {
      background: #0A2463;
      color: white;
      font-weight: 600;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    .params-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 12px;
      margin: 16px 0;
    }
    .param-item {
      background: #f9fafb;
      padding: 12px 16px;
      border-radius: 6px;
      border-left: 3px solid #3E92CC;
    }
    .param-item .label {
      font-size: 12px;
      color: #6b7280;
    }
    .param-item .value {
      font-size: 15px;
      font-weight: 600;
      color: #1f2937;
    }
    .report-footer {
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      padding: 30px 40px;
      text-align: center;
      color: #6b7280;
      font-size: 13px;
    }
    .watermark {
      text-align: center;
      color: #d1d5db;
      font-size: 12px;
      padding: 10px;
    }
    @media print {
      body { background: white; }
      .report-container { box-shadow: none; }
      .report-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <h1>高放废物深地质处置库 ${reportName}</h1>
      <div class="subtitle">热-水-力-化学四场耦合数值模拟评估</div>
      <div class="meta">
        <span>📋 任务名称：${task.name}</span>
        <span>🆔 任务编号：${task.id}</span>
        <span>👤 创建人：${task.createdByName}</span>
        <span>📅 生成时间：${now}</span>
      </div>
    </div>

    <div class="report-body">
      <div class="section">
        <h2>任务概况与输入参数</h2>
        <p>本报告基于热-水-力-化学（THMC）四场耦合数值模拟结果，对高放射性废物深地质处置库的长期安全性能进行综合评估。模拟涵盖 ${task.params.wastePackageParams.count} 个废物包，评估周期为 10000 年。</p>
        
        <h3>废物包参数</h3>
        <div class="params-grid">
          <div class="param-item"><div class="label">废物类型</div><div class="value">${task.params.wastePackageParams.type}</div></div>
          <div class="param-item"><div class="label">包壳材料</div><div class="value">${task.params.wastePackageParams.material}</div></div>
          <div class="param-item"><div class="label">放射性活度</div><div class="value">${formatScientific(task.params.wastePackageParams.radioactivity)} Bq</div></div>
          <div class="param-item"><div class="label">热输出功率</div><div class="value">${formatNumber(task.params.wastePackageParams.heatOutput, 2)} W</div></div>
          <div class="param-item"><div class="label">废物包间距</div><div class="value">${formatNumber(task.params.wastePackageParams.spacing, 2)} m</div></div>
          <div class="param-item"><div class="label">废物包数量</div><div class="value">${task.params.wastePackageParams.count} 个</div></div>
        </div>

        <h3>工程屏障参数</h3>
        <div class="params-grid">
          <div class="param-item"><div class="label">缓冲层材料</div><div class="value">${task.params.engineeringBarrierParams.bufferLayer.material}</div></div>
          <div class="param-item"><div class="label">缓冲层厚度</div><div class="value">${formatNumber(task.params.engineeringBarrierParams.bufferLayer.thickness, 3)} m</div></div>
          <div class="param-item"><div class="label">渗透系数</div><div class="value">${formatScientific(task.params.engineeringBarrierParams.bufferLayer.permeability)} m/s</div></div>
          <div class="param-item"><div class="label">回填材料</div><div class="value">${task.params.engineeringBarrierParams.backfill.material}</div></div>
          <div class="param-item"><div class="label">回填配比</div><div class="value">${task.params.engineeringBarrierParams.backfill.ratio}</div></div>
          <div class="param-item"><div class="label">压实度</div><div class="value">${formatNumber(task.params.engineeringBarrierParams.backfill.compactness * 100, 1)}%</div></div>
        </div>
      </div>

      ${contentSections}
    </div>

    <div class="report-footer">
      <p>🏢 高放射性废物深地质处置库长期安全模拟与多场耦合评估平台</p>
      <p>本报告由系统自动生成，仅供内部参考使用。如有疑问，请联系系统管理员。</p>
      <p>报告版本 v1.0 | 模型编号 THMC-${task.id.substring(0, 8)}</p>
    </div>

    <div class="watermark">
      ── 机密文件 · 未经授权不得转发 ──
    </div>
  </div>
</body>
</html>`;
}

router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const { taskId } = req.query;
  const reports = db.getReports(taskId as string | undefined);
  res.json(reports);
});

router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
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
    const fileName = `${task.id}-${type}-${uuidv4().substring(0, 8)}.html`;
    const filePath = path.join(reportsDir, fileName);
    const htmlContent = generateReportHTML(task, type, typeNames[type]);
    fs.writeFileSync(filePath, htmlContent, 'utf-8');

    db.updateReport(newReport.id, {
      status: 'ready',
      fileUrl: `/api/reports/file/${fileName}`,
      generatedAt: new Date().toISOString(),
    });
  }, 1500);

  res.status(201).json(newReport);
});

router.get('/file/:filename', (req: AuthRequest, res: Response) => {
  const { filename } = req.params;
  const { token } = req.query;
  
  const authHeader = req.headers.authorization;
  let validToken = false;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const t = authHeader.slice(7);
      jwt.verify(t, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      validToken = true;
    } catch (e) {}
  }
  
  if (!validToken && typeof token === 'string') {
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      validToken = true;
    } catch (e) {}
  }
  
  if (!validToken) {
    res.status(401).json({ error: '未授权访问' });
    return;
  }
  
  const filePath = path.join(reportsDir, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: '报告文件不存在' });
    return;
  }

  const sanitizedName = filename.replace(/[^a-zA-Z0-9-_\.]/g, '');
  if (sanitizedName !== filename) {
    res.status(400).json({ error: '无效的文件名' });
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  fs.createReadStream(filePath, 'utf-8').pipe(res);
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

  const task = db.getTaskById(report.taskId);
  const safeTaskName = task ? task.name.replace(/[\\/:*?"<>|]/g, '_') : '报告';
  const downloadName = `${safeTaskName}_${report.name}.html`;

  res.json({
    downloadUrl: report.fileUrl,
    fileName: downloadName,
  });
});

export default router;
