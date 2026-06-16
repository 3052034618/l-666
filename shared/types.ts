export type UserRole = 'analyst' | 'geologist' | 'engineer' | 'director' | 'scientist' | 'admin';

export type TaskStatus = 'pending_validation' | 'parsing' | 'meshing' | 'computing' | 'evaluating' | 'completed' | 'failed' | 'rollback';

export type AlertLevel = 'critical' | 'warning' | 'info';

export type AlertType = 'temperature' | 'pressure' | 'seepage' | 'concentration';

export type AlertStatus = 'pending' | 'reviewed' | 'resolved';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type ReportType = 'comprehensive' | 'temperature' | 'stress' | 'nuclide';

export type ReportStatus = 'generating' | 'ready' | 'failed';

export type ApprovalTaskStatus = 'pending' | 'approved_level1' | 'approved_level2' | 'rejected' | 'pushed';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email: string;
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadTime: string;
}

export interface WastePackageParams {
  type: string;
  material: string;
  radioactivity: number;
  heatOutput: number;
  spacing: number;
  count: number;
}

export interface EngineeringBarrierParams {
  bufferLayer: {
    material: string;
    thickness: number;
    permeability: number;
  };
  backfill: {
    material: string;
    ratio: string;
    compactness: number;
  };
}

export interface TaskParams {
  geologicalModel: FileInfo;
  wastePackageParams: WastePackageParams;
  engineeringBarrierParams: EngineeringBarrierParams;
}

export interface TimeSeriesData {
  time: number[];
  values: number[];
  units: string;
}

export interface StressStrainData {
  strain: number[];
  stress: number[];
  maxStress: number;
  maxStrain: number;
}

export interface TaskResult {
  temperatureField: TimeSeriesData;
  porePressure: TimeSeriesData;
  nuclideConcentration: TimeSeriesData;
  stressStrain: StressStrainData;
  safetyIndex: number;
  nuclideReleaseRate: number;
  maxTemperature: number;
  maxPressure: number;
  computationTime: number;
}

export interface TaskLog {
  id: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  timestamp: string;
}

export interface SimulationTask {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  progress: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  params: TaskParams;
  result?: TaskResult;
  approvalStatus: ApprovalTaskStatus;
  logs: TaskLog[];
  deviationCount: number;
}

export interface Alert {
  id: string;
  taskId: string;
  taskName: string;
  level: AlertLevel;
  type: AlertType;
  message: string;
  value: number;
  threshold: number;
  location: string;
  timestamp: string;
  status: AlertStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewComment?: string;
  reviewedAt?: string;
}

export interface Approval {
  id: string;
  taskId: string;
  taskName: string;
  level: 1 | 2;
  status: ApprovalStatus;
  approverId?: string;
  approverName?: string;
  comment?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface Report {
  id: string;
  taskId: string;
  taskName: string;
  name: string;
  type: ReportType;
  status: ReportStatus;
  fileUrl?: string;
  createdAt: string;
  generatedAt?: string;
}

export interface ParamAdjustment {
  id: string;
  taskId: string;
  paramName: string;
  oldValue: number;
  newValue: number;
  reason: string;
  adjustedBy: string;
  adjustedByName: string;
  createdAt: string;
}

export interface Recommendation {
  id: string;
  basedOnTaskId?: string;
  basedOnTaskName?: string;
  recommendedParams: {
    wasteSpacing: number;
    bufferThickness: number;
    backfillRatio: string;
  };
  confidenceScore: number;
  explanation: string;
  createdAt: string;
}

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  avgComputationTime: number;
  avgSafetyIndex: number;
  pendingApprovals: number;
  activeAlerts: number;
  safetyIndexTrend: { date: string; value: number }[];
  taskStatusDistribution: { status: string; count: number }[];
  dailyStats: {
    date: string;
    completed: number;
    failed: number;
    avgTime: number;
  }[];
}

export interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
