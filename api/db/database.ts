import { v4 as uuidv4 } from 'uuid';
import type {
  User,
  SimulationTask,
  Alert,
  Approval,
  Report,
  ParamAdjustment,
  Recommendation,
  TaskLog,
  TaskResult,
  TaskParams,
  DashboardStats,
  UserRole,
  TaskStatus,
  PushRecord,
} from '../../shared/types.js';

class Database {
  private users: Map<string, User> = new Map();
  private tasks: Map<string, SimulationTask> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private approvals: Map<string, Approval> = new Map();
  private reports: Map<string, Report> = new Map();
  private paramAdjustments: Map<string, ParamAdjustment> = new Map();
  private recommendations: Map<string, Recommendation> = new Map();
  private pushRecords: Map<string, PushRecord> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    const mockUsers: User[] = [
      {
        id: '1',
        username: 'admin',
        name: '系统管理员',
        role: 'admin',
        email: 'admin@disposal.com',
        passwordHash: '$2a$10$gsSNyYYQFnCK7dVXUO20Re4B9mJ.RBfp7kK/v5oWJ0N/AluVdiFFW',
        createdAt: '2025-01-01T00:00:00Z',
        lastLoginAt: new Date().toISOString(),
      },
      {
        id: '2',
        username: 'analyst1',
        name: '张安全',
        role: 'analyst',
        email: 'zhang.anquan@disposal.com',
        passwordHash: '$2a$10$gsSNyYYQFnCK7dVXUO20Re4B9mJ.RBfp7kK/v5oWJ0N/AluVdiFFW',
        createdAt: '2025-01-15T00:00:00Z',
      },
      {
        id: '3',
        username: 'geologist1',
        name: '李地质',
        role: 'geologist',
        email: 'li.dizhi@disposal.com',
        passwordHash: '$2a$10$gsSNyYYQFnCK7dVXUO20Re4B9mJ.RBfp7kK/v5oWJ0N/AluVdiFFW',
        createdAt: '2025-01-20T00:00:00Z',
      },
      {
        id: '4',
        username: 'engineer1',
        name: '王工程',
        role: 'engineer',
        email: 'wang.gongcheng@disposal.com',
        passwordHash: '$2a$10$gsSNyYYQFnCK7dVXUO20Re4B9mJ.RBfp7kK/v5oWJ0N/AluVdiFFW',
        createdAt: '2025-02-01T00:00:00Z',
      },
      {
        id: '5',
        username: 'director1',
        name: '赵总监',
        role: 'director',
        email: 'zhao.zongjian@disposal.com',
        passwordHash: '$2a$10$gsSNyYYQFnCK7dVXUO20Re4B9mJ.RBfp7kK/v5oWJ0N/AluVdiFFW',
        createdAt: '2025-02-10T00:00:00Z',
      },
      {
        id: '6',
        username: 'scientist1',
        name: '陈首席',
        role: 'scientist',
        email: 'chen.shouxi@disposal.com',
        passwordHash: '$2a$10$gsSNyYYQFnCK7dVXUO20Re4B9mJ.RBfp7kK/v5oWJ0N/AluVdiFFW',
        createdAt: '2025-02-15T00:00:00Z',
      },
    ];

    mockUsers.forEach((user) => this.users.set(user.id, user));

    const now = new Date();
    const mockTasks: SimulationTask[] = [];

    for (let i = 1; i <= 15; i++) {
      const statuses: TaskStatus[] = ['completed', 'computing', 'completed', 'completed', 'failed', 'computing', 'completed'];
      const status = statuses[i % statuses.length];
      const createdAt = new Date(now.getTime() - (15 - i) * 86400000).toISOString();

      const task: SimulationTask = {
        id: `task-${i}`,
        name: `处置库模拟任务-${i}号`,
        description: `高放废物处置库${i}号处置单元四场耦合模拟分析`,
        status,
        progress: status === 'computing' ? 45 + (i % 3) * 15 : status === 'completed' ? 100 : status === 'failed' ? 80 : 30,
        createdBy: '2',
        createdByName: '张安全',
        createdAt,
        updatedAt: createdAt,
        deviationCount: i === 5 ? 3 : i === 10 ? 2 : 0,
        approvalStatus: status === 'completed' ? (i % 3 === 0 ? 'approved_level2' : i % 3 === 1 ? 'approved_level1' : 'pending') : 'pending',
        params: this.generateMockParams(),
        logs: this.generateMockLogs(status),
        result: status === 'completed' ? this.generateMockResult() : undefined,
      };

      mockTasks.push(task);
      this.tasks.set(task.id, task);
    }

    const mockAlerts: Alert[] = [
      {
        id: 'alert-1',
        taskId: 'task-2',
        taskName: '处置库模拟任务-2号',
        level: 'warning',
        type: 'temperature',
        message: '处置单元A区温度接近设计阈值',
        value: 95.5,
        threshold: 100,
        location: '处置单元A-03',
        timestamp: new Date(now.getTime() - 3600000).toISOString(),
        status: 'pending',
      },
      {
        id: 'alert-2',
        taskId: 'task-2',
        taskName: '处置库模拟任务-2号',
        level: 'critical',
        type: 'seepage',
        message: '缓冲层渗流速度异常',
        value: 2.3e-8,
        threshold: 1.0e-8,
        location: '缓冲层B-02',
        timestamp: new Date(now.getTime() - 7200000).toISOString(),
        status: 'reviewed',
        reviewedBy: '3',
        reviewedByName: '李地质',
        reviewComment: '建议增加缓冲层厚度0.5米',
        reviewedAt: new Date(now.getTime() - 1800000).toISOString(),
      },
      {
        id: 'alert-3',
        taskId: 'task-6',
        taskName: '处置库模拟任务-6号',
        level: 'info',
        type: 'concentration',
        message: '核素浓度监测值正常波动',
        value: 1.2e-6,
        threshold: 1.0e-5,
        location: '远场监测点P-05',
        timestamp: new Date(now.getTime() - 86400000).toISOString(),
        status: 'resolved',
        reviewedBy: '2',
        reviewedByName: '张安全',
        reviewComment: '属于正常波动范围，无需调整',
        reviewedAt: new Date(now.getTime() - 43200000).toISOString(),
      },
    ];

    mockAlerts.forEach((alert) => this.alerts.set(alert.id, alert));

    const mockApprovals: Approval[] = [
      {
        id: 'approval-1',
        taskId: 'task-3',
        taskName: '处置库模拟任务-3号',
        level: 1,
        status: 'pending',
        createdAt: new Date(now.getTime() - 86400000).toISOString(),
      },
      {
        id: 'approval-2',
        taskId: 'task-3',
        taskName: '处置库模拟任务-3号',
        level: 2,
        status: 'pending',
        createdAt: new Date(now.getTime() - 86400000).toISOString(),
      },
      {
        id: 'approval-3',
        taskId: 'task-1',
        taskName: '处置库模拟任务-1号',
        level: 1,
        status: 'approved',
        approverId: '4',
        approverName: '王工程',
        comment: '计算收敛良好，数据完整',
        createdAt: new Date(now.getTime() - 172800000).toISOString(),
        reviewedAt: new Date(now.getTime() - 86400000).toISOString(),
      },
      {
        id: 'approval-4',
        taskId: 'task-1',
        taskName: '处置库模拟任务-1号',
        level: 2,
        status: 'approved',
        approverId: '5',
        approverName: '赵总监',
        comment: '风险评估结果可接受，同意推送',
        createdAt: new Date(now.getTime() - 172800000).toISOString(),
        reviewedAt: new Date(now.getTime() - 43200000).toISOString(),
      },
    ];

    mockApprovals.forEach((approval) => this.approvals.set(approval.id, approval));

    const mockReports: Report[] = [
      {
        id: 'report-1',
        taskId: 'task-1',
        taskName: '处置库模拟任务-1号',
        name: '综合评估报告',
        type: 'comprehensive',
        status: 'ready',
        fileUrl: '/reports/task-1-comprehensive.pdf',
        createdAt: new Date(now.getTime() - 259200000).toISOString(),
        generatedAt: new Date(now.getTime() - 172800000).toISOString(),
        version: 1,
        source: '系统自动生成',
        approvalStatus: 'approved_level2',
      },
      {
        id: 'report-2',
        taskId: 'task-3',
        taskName: '处置库模拟任务-3号',
        name: '温度场分析报告',
        type: 'temperature',
        status: 'generating',
        createdAt: new Date(now.getTime() - 86400000).toISOString(),
        version: 1,
        source: '系统自动生成',
        approvalStatus: 'pending',
      },
    ];

    mockReports.forEach((report) => this.reports.set(report.id, report));

    const mockRecommendations: Recommendation[] = [
      {
        id: 'rec-1',
        basedOnTaskId: 'task-1',
        basedOnTaskName: '处置库模拟任务-1号',
        recommendedParams: {
          wasteSpacing: 6.5,
          bufferThickness: 0.8,
          backfillRatio: '70:30',
        },
        confidenceScore: 0.92,
        explanation: '基于历史12个相似案例分析，该参数组合可使长期安全指数提升15%，计算效率提升8%',
        createdAt: new Date(now.getTime() - 43200000).toISOString(),
      },
      {
        id: 'rec-2',
        recommendedParams: {
          wasteSpacing: 7.0,
          bufferThickness: 1.0,
          backfillRatio: '60:40',
        },
        confidenceScore: 0.85,
        explanation: '针对高热释放废物包，建议采用更大间距和更厚缓冲层的保守设计方案',
        createdAt: new Date(now.getTime() - 21600000).toISOString(),
      },
    ];

    mockRecommendations.forEach((rec) => this.recommendations.set(rec.id, rec));
  }

  private generateMockParams(): TaskParams {
    return {
      geologicalModel: {
        id: uuidv4(),
        name: '花岗岩地质模型_v3.2',
        size: 15234567,
        type: 'application/octet-stream',
        uploadTime: new Date().toISOString(),
      },
      wastePackageParams: {
        type: 'UO2',
        material: '硼硅酸盐玻璃',
        radioactivity: 1.2e15,
        heatOutput: 1500,
        spacing: 6.0,
        count: 24,
      },
      engineeringBarrierParams: {
        bufferLayer: {
          material: '膨润土',
          thickness: 0.75,
          permeability: 1.0e-12,
        },
        backfill: {
          material: '膨润土/砂混合物',
          ratio: '70:30',
          compactness: 0.95,
        },
      },
    };
  }

  private generateMockLogs(status: TaskStatus): TaskLog[] {
    const logs: TaskLog[] = [
      {
        id: uuidv4(),
        level: 'info',
        message: '任务创建成功',
        timestamp: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        level: 'info',
        message: '数据格式校验通过',
        timestamp: new Date().toISOString(),
      },
    ];

    if (status !== 'pending_validation') {
      logs.push({
        id: uuidv4(),
        level: 'info',
        message: '参数解析完成',
        timestamp: new Date().toISOString(),
      });
    }

    if (status !== 'parsing') {
      logs.push({
        id: uuidv4(),
        level: 'info',
        message: '自适应网格生成完成，共125680个单元',
        timestamp: new Date().toISOString(),
      });
    }

    if (status === 'computing' || status === 'completed' || status === 'failed') {
      logs.push({
        id: uuidv4(),
        level: 'info',
        message: '耦合计算进行中...',
        timestamp: new Date().toISOString(),
      });
    }

    if (status === 'failed') {
      logs.push({
        id: uuidv4(),
        level: 'error',
        message: '计算收敛失败，迭代步数超过上限',
        timestamp: new Date().toISOString(),
      });
    }

    if (status === 'completed') {
      logs.push({
        id: uuidv4(),
        level: 'info',
        message: '计算完成，正在进行安全评估...',
        timestamp: new Date().toISOString(),
      });
      logs.push({
        id: uuidv4(),
        level: 'info',
        message: '安全评估完成，长期安全指数: 0.92',
        timestamp: new Date().toISOString(),
      });
    }

    return logs;
  }

  private generateMockResult(): TaskResult {
    const timePoints = Array.from({ length: 100 }, (_, i) => i * 100);
    const generateDecayData = (base: number, decay: number) =>
      timePoints.map((t) => base * Math.exp(-decay * t / 1000) + Math.random() * 5);

    return {
      temperatureField: {
        time: timePoints,
        values: generateDecayData(85, 0.05),
        units: '°C',
      },
      porePressure: {
        time: timePoints,
        values: generateDecayData(5, 0.02),
        units: 'MPa',
      },
      nuclideConcentration: {
        time: timePoints,
        values: generateDecayData(1e-5, 0.01),
        units: 'mol/L',
      },
      stressStrain: {
        strain: Array.from({ length: 50 }, (_, i) => i * 0.001),
        stress: Array.from({ length: 50 }, (_, i) => Math.min(25 * (1 - Math.exp(-i * 0.1)), 25)),
        maxStress: 24.5,
        maxStrain: 0.045,
      },
      safetyIndex: 0.85 + Math.random() * 0.1,
      nuclideReleaseRate: 1e-8 + Math.random() * 5e-9,
      maxTemperature: 92.5,
      maxPressure: 4.8,
      computationTime: 3600 + Math.floor(Math.random() * 1800),
    };
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByUsername(username: string): User | undefined {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  getUsers(): User[] {
    return Array.from(this.users.values());
  }

  createUser(user: Omit<User, 'id' | 'createdAt'>): User {
    const newUser: User = {
      ...user,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  deleteUser(id: string): boolean {
    return this.users.delete(id);
  }

  getTasks(params?: { status?: string; page?: number; size?: number }): { items: SimulationTask[]; total: number } {
    let tasks = Array.from(this.tasks.values());

    if (params?.status) {
      tasks = tasks.filter((t) => t.status === params.status);
    }

    const total = tasks.length;

    if (params?.page !== undefined && params?.size !== undefined) {
      const start = params.page * params.size;
      tasks = tasks.slice(start, start + params.size);
    }

    return { items: tasks, total };
  }

  getTaskById(id: string): SimulationTask | undefined {
    return this.tasks.get(id);
  }

  createTask(task: Omit<SimulationTask, 'id' | 'createdAt' | 'updatedAt' | 'logs'>): SimulationTask {
    const now = new Date().toISOString();
    const newTask: SimulationTask = {
      ...task,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      logs: [],
    };
    this.tasks.set(newTask.id, newTask);
    return newTask;
  }

  updateTask(id: string, updates: Partial<SimulationTask>): SimulationTask | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const updatedTask = { ...task, ...updates, updatedAt: new Date().toISOString() };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  addTaskLog(taskId: string, log: Omit<TaskLog, 'id' | 'timestamp'>): TaskLog {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('Task not found');
    const newLog: TaskLog = {
      ...log,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    task.logs.push(newLog);
    task.updatedAt = new Date().toISOString();
    return newLog;
  }

  getAlerts(params?: { level?: string; status?: string }): Alert[] {
    let alerts = Array.from(this.alerts.values());

    if (params?.level) {
      alerts = alerts.filter((a) => a.level === params.level);
    }

    if (params?.status) {
      alerts = alerts.filter((a) => a.status === params.status);
    }

    return alerts;
  }

  getAlertById(id: string): Alert | undefined {
    return this.alerts.get(id);
  }

  createAlert(alert: Omit<Alert, 'id'>): Alert {
    const newAlert: Alert = {
      ...alert,
      id: uuidv4(),
    };
    this.alerts.set(newAlert.id, newAlert);
    return newAlert;
  }

  updateAlert(id: string, updates: Partial<Alert>): Alert | undefined {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;
    const updatedAlert = { ...alert, ...updates };
    this.alerts.set(id, updatedAlert);
    return updatedAlert;
  }

  getApprovals(params?: { level?: number; status?: string; taskId?: string }): Approval[] {
    let approvals = Array.from(this.approvals.values());

    if (params?.level) {
      approvals = approvals.filter((a) => a.level === params.level);
    }

    if (params?.status) {
      approvals = approvals.filter((a) => a.status === params.status);
    }

    if (params?.taskId) {
      approvals = approvals.filter((a) => a.taskId === params.taskId);
    }

    return approvals;
  }

  getApprovalById(id: string): Approval | undefined {
    return this.approvals.get(id);
  }

  createApproval(approval: Omit<Approval, 'id'>): Approval {
    const newApproval: Approval = {
      ...approval,
      id: uuidv4(),
    };
    this.approvals.set(newApproval.id, newApproval);
    return newApproval;
  }

  updateApproval(id: string, updates: Partial<Approval>): Approval | undefined {
    const approval = this.approvals.get(id);
    if (!approval) return undefined;
    const updatedApproval = { ...approval, ...updates };
    this.approvals.set(id, updatedApproval);
    return updatedApproval;
  }

  getReports(taskId?: string): Report[] {
    let reports = Array.from(this.reports.values());
    if (taskId) {
      reports = reports.filter((r) => r.taskId === taskId);
    }
    return reports;
  }

  getReportById(id: string): Report | undefined {
    return this.reports.get(id);
  }

  createReport(report: Omit<Report, 'id'>): Report {
    const newReport: Report = {
      ...report,
      id: uuidv4(),
    };
    this.reports.set(newReport.id, newReport);
    return newReport;
  }

  updateReport(id: string, updates: Partial<Report>): Report | undefined {
    const report = this.reports.get(id);
    if (!report) return undefined;
    const updatedReport = { ...report, ...updates };
    this.reports.set(id, updatedReport);
    return updatedReport;
  }

  getRecommendations(): Recommendation[] {
    return Array.from(this.recommendations.values());
  }

  createRecommendation(rec: Omit<Recommendation, 'id'>): Recommendation {
    const newRec: Recommendation = {
      ...rec,
      id: uuidv4(),
    };
    this.recommendations.set(newRec.id, newRec);
    return newRec;
  }

  getParamAdjustments(taskId: string): ParamAdjustment[] {
    return Array.from(this.paramAdjustments.values()).filter((p) => p.taskId === taskId);
  }

  createParamAdjustment(adjustment: Omit<ParamAdjustment, 'id'>): ParamAdjustment {
    const newAdjustment: ParamAdjustment = {
      ...adjustment,
      id: uuidv4(),
    };
    this.paramAdjustments.set(newAdjustment.id, newAdjustment);
    return newAdjustment;
  }

  updateParamAdjustment(id: string, updates: Partial<ParamAdjustment>): ParamAdjustment | undefined {
    const adj = this.paramAdjustments.get(id);
    if (!adj) return undefined;
    const updated = { ...adj, ...updates };
    this.paramAdjustments.set(id, updated);
    return updated;
  }

  getPushRecords(): PushRecord[] {
    return Array.from(this.pushRecords.values()).sort(
      (a, b) => new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime()
    );
  }

  getPushRecordById(id: string): PushRecord | undefined {
    return this.pushRecords.get(id);
  }

  createPushRecord(record: Omit<PushRecord, 'id'>): PushRecord {
    const newRecord: PushRecord = {
      ...record,
      id: uuidv4(),
    };
    this.pushRecords.set(newRecord.id, newRecord);
    return newRecord;
  }

  updatePushRecord(id: string, updates: Partial<PushRecord>): PushRecord | undefined {
    const record = this.pushRecords.get(id);
    if (!record) return undefined;
    const updated = { ...record, ...updates };
    this.pushRecords.set(id, updated);
    return updated;
  }

  getDashboardStats(): DashboardStats {
    const tasks = Array.from(this.tasks.values());
    const alerts = Array.from(this.alerts.values());
    const approvals = Array.from(this.approvals.values());

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const completedTaskResults = tasks
      .filter((t) => t.status === 'completed' && t.result);

    const avgComputationTime = completedTaskResults.length > 0
      ? completedTaskResults.reduce((sum, t) => sum + t.result!.computationTime, 0) / completedTaskResults.length
      : 0;

    const avgSafetyIndex = completedTaskResults.length > 0
      ? completedTaskResults.reduce((sum, t) => sum + t.result!.safetyIndex, 0) / completedTaskResults.length
      : 0;

    const statusDistribution = tasks.reduce((acc, task) => {
      const existing = acc.find((s) => s.status === task.status);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ status: task.status, count: 1 });
      }
      return acc;
    }, [] as { status: string; count: number }[]);

    const pendingApprovals = approvals.filter((a) => a.status === 'pending').length;
    const activeAlerts = alerts.filter((a) => a.status !== 'resolved').length;

    const safetyIndexTrend = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        value: 0.82 + Math.random() * 0.12,
      };
    });

    const dailyStats = Array.from({ length: 14 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - i));
      return {
        date: date.toISOString().split('T')[0],
        completed: Math.floor(Math.random() * 5),
        failed: Math.floor(Math.random() * 2),
        avgTime: 3000 + Math.floor(Math.random() * 2000),
      };
    });

    return {
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? completedTasks / totalTasks : 0,
      avgComputationTime,
      avgSafetyIndex,
      pendingApprovals,
      activeAlerts,
      safetyIndexTrend,
      taskStatusDistribution: statusDistribution,
      dailyStats,
    };
  }

  generateTaskResult(params: TaskParams): TaskResult {
    const time = Array.from({ length: 100 }, (_, i) => Math.round((i * 100) / 99));
    const baseTemp = 25 + params.wastePackageParams.heatOutput / 30;
    const spacingFactor = params.wastePackageParams.spacing / 6.0;
    const bufferFactor = params.engineeringBarrierParams.bufferLayer.thickness / 0.75;

    const temperatureValues = time.map((t) => {
      const peakFactor = Math.min(1, t / 20);
      const decayFactor = Math.exp(-Math.max(0, t - 50) / 100);
      return baseTemp * peakFactor * (0.9 + 0.1 * Math.sin(t / 10)) * decayFactor / spacingFactor;
    });

    const pressureValues = time.map((t) => {
      const peakPressure = 2.5 + 0.5 * Math.sin(t / 15);
      const decayFactor = Math.exp(-Math.max(0, t - 30) / 200);
      return peakPressure * decayFactor + 1.0;
    });

    const concentrationValues = time.map((t) => {
      const baseConc = 1e-8 / bufferFactor;
      const delayFactor = t > 30 ? Math.pow((t - 30) / 70, 1.5) : 0;
      return Math.min(1e-5, baseConc * delayFactor + 1e-15);
    });

    const strain = Array.from({ length: 50 }, (_, i) => i * 0.001);
    const stress = strain.map((s) => {
      const elasticStiffness = 25000;
      const yieldStrain = 0.012;
      if (s <= yieldStrain) {
        return elasticStiffness * s / 1000;
      } else {
        const plasticPart = Math.min(20, (s - yieldStrain) * 800000 / 1000);
        return elasticStiffness * yieldStrain / 1000 + plasticPart;
      }
    });

    const maxTemp = Math.max(...temperatureValues);
    const safetyIndex = Math.max(0.5, 1.0 - (maxTemp - 80) / 80 - params.engineeringBarrierParams.bufferLayer.permeability * 1e10 / 2 + (bufferFactor - 1) * 0.05);

    return {
      temperatureField: { time, values: temperatureValues, units: '°C' },
      porePressure: { time, values: pressureValues, units: 'MPa' },
      nuclideConcentration: { time, values: concentrationValues, units: 'mol/L' },
      stressStrain: {
        strain,
        stress,
        maxStress: Math.max(...stress),
        maxStrain: strain[strain.length - 1],
      },
      safetyIndex: Math.min(0.99, Math.max(0.5, safetyIndex)),
      nuclideReleaseRate: concentrationValues[concentrationValues.length - 1] * 1e6,
      maxTemperature: maxTemp,
      maxPressure: Math.max(...pressureValues),
      computationTime: 3000 + Math.floor(Math.random() * 4000),
    };
  }

  async startTaskSimulation(taskId: string): Promise<void> {
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    
    const updateAndLog = (status: TaskStatus, progress: number, message: string, level: 'info' | 'warning' | 'error' = 'info') => {
      this.updateTask(taskId, { status, progress, updatedAt: new Date().toISOString() });
      this.addTaskLog(taskId, { level, message });
    };

    const task = this.getTaskById(taskId);
    if (!task) return;

    const failChance = Math.random();
    const shouldFailAt = failChance < 0.1 ? Math.floor(Math.random() * 4) : -1;

    try {
      await delay(800);
      updateAndLog('parsing', 10, '[1/5] 参数解析中：读取地质模型网格数据...');
      await delay(1200);
      updateAndLog('parsing', 20, '[1/5] 参数解析完成：废物包参数校验通过');

      if (shouldFailAt === 0) {
        throw new Error('地质模型格式错误：无法识别的网格单元类型');
      }

      await delay(800);
      updateAndLog('meshing', 30, '[2/5] 自适应网格生成中：初始化四面体剖分...');
      await delay(1200);
      updateAndLog('meshing', 40, '[2/5] 自适应网格生成中：工程屏障区域加密...');
      await delay(1000);
      updateAndLog('meshing', 50, '[2/5] 网格生成完成：共 ' + (50000 + Math.floor(Math.random() * 100000)) + ' 个单元');

      if (shouldFailAt === 1) {
        throw new Error('网格质量不达标：雅可比行列式小于阈值');
      }

      await delay(800);
      updateAndLog('computing', 55, '[3/5] 热-水-力-化学耦合计算中：温度场求解...');
      await delay(1500);
      updateAndLog('computing', 70, '[3/5] 耦合计算中：渗流-应力迭代...');
      await delay(1500);
      updateAndLog('computing', 85, '[3/5] 耦合计算中：核素迁移方程求解...');

      if (shouldFailAt === 2) {
        throw new Error('数值发散：耦合方程组迭代未收敛');
      }

      const result = this.generateTaskResult(task.params);
      
      await delay(800);
      updateAndLog('evaluating', 90, '[4/5] 安全评估中：计算安全指数...');
      
      if (result.maxTemperature > 100) {
        this.addTaskLog(taskId, { level: 'warning', message: `警告：最高温度 ${result.maxTemperature.toFixed(1)}°C 超过设计阈值 100°C` });
      }
      
      await delay(1200);
      this.updateTask(taskId, { 
        status: 'completed', 
        progress: 100, 
        result,
        updatedAt: new Date().toISOString(),
      });
      this.addTaskLog(taskId, { level: 'info', message: `[5/5] 模拟完成：安全指数 ${result.safetyIndex.toFixed(4)}，计算耗时 ${result.computationTime}s` });

      this.createApproval({
        taskId,
        taskName: task.name,
        level: 1,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

    } catch (error: any) {
      await delay(500);
      this.updateTask(taskId, { 
        status: 'rollback', 
        progress: 0,
        updatedAt: new Date().toISOString(),
      });
      this.addTaskLog(taskId, { level: 'error', message: `模拟失败：${error.message}` });
      this.addTaskLog(taskId, { level: 'warning', message: '进入异常回退流程：已清理临时文件，释放计算资源' });
      this.addTaskLog(taskId, { level: 'info', message: '建议：修正参数后重新提交模拟任务' });
    }
  }

  validateParams(params: TaskParams): { valid: boolean; errors: { field: string; message: string }[]; warnings: { field: string; message: string }[] } {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (params.wastePackageParams.radioactivity <= 0) {
      errors.push({ field: 'wastePackageParams.radioactivity', message: '放射性活度必须大于0' });
    }

    if (params.wastePackageParams.heatOutput <= 0 || params.wastePackageParams.heatOutput > 5000) {
      errors.push({ field: 'wastePackageParams.heatOutput', message: '热输出应在0-5000W范围内' });
    }

    if (params.wastePackageParams.spacing < 3 || params.wastePackageParams.spacing > 15) {
      errors.push({ field: 'wastePackageParams.spacing', message: '废物包间距应在3-15米范围内' });
    }

    if (params.engineeringBarrierParams.bufferLayer.thickness < 0.3 || params.engineeringBarrierParams.bufferLayer.thickness > 2.0) {
      errors.push({ field: 'engineeringBarrierParams.bufferLayer.thickness', message: '缓冲层厚度应在0.3-2.0米范围内' });
    }

    if (params.engineeringBarrierParams.bufferLayer.permeability > 1e-10) {
      warnings.push({ field: 'engineeringBarrierParams.bufferLayer.permeability', message: '缓冲层渗透系数偏高，可能影响隔离效果' });
    }

    if (params.wastePackageParams.count > 50) {
      warnings.push({ field: 'wastePackageParams.count', message: '废物包数量较多，建议分批处置' });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export const db = new Database();
