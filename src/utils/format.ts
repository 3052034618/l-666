import dayjs from 'dayjs';
import type { TaskStatus, AlertLevel, UserRole } from '../../shared/types.js';

export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

export const formatDate = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD');
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟${secs}秒`;
  }
  if (minutes > 0) {
    return `${minutes}分钟${secs}秒`;
  }
  return `${secs}秒`;
};

export const formatScientific = (num: number, digits: number = 2): string => {
  if (num === 0) return '0';
  if (Math.abs(num) >= 0.001 && Math.abs(num) < 10000) {
    return num.toFixed(digits);
  }
  return num.toExponential(digits);
};

export const formatPercentage = (value: number, digits: number = 1): string => {
  return `${(value * 100).toFixed(digits)}%`;
};

export const taskStatusMap: Record<TaskStatus, { label: string; color: string }> = {
  pending_validation: { label: '待校验', color: 'default' },
  parsing: { label: '参数解析中', color: 'processing' },
  meshing: { label: '网格生成中', color: 'processing' },
  computing: { label: '耦合计算中', color: 'processing' },
  evaluating: { label: '安全评估中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  failed: { label: '失败', color: 'error' },
  rollback: { label: '回退中', color: 'warning' },
};

export const alertLevelMap: Record<AlertLevel, { label: string; color: string }> = {
  critical: { label: '严重', color: 'error' },
  warning: { label: '警告', color: 'warning' },
  info: { label: '提示', color: 'info' },
};

export const alertTypeMap: Record<string, { label: string; unit: string }> = {
  temperature: { label: '温度', unit: '°C' },
  pressure: { label: '孔隙压力', unit: 'MPa' },
  seepage: { label: '渗流速度', unit: 'm/s' },
  concentration: { label: '核素浓度', unit: 'mol/L' },
};

export const userRoleMap: Record<UserRole, { label: string; color: string }> = {
  analyst: { label: '安全分析师', color: 'blue' },
  geologist: { label: '地质专家', color: 'cyan' },
  engineer: { label: '安全工程师', color: 'purple' },
  director: { label: '项目总监', color: 'gold' },
  scientist: { label: '首席科学家', color: 'magenta' },
  admin: { label: '系统管理员', color: 'red' },
};

export const approvalStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待审批', color: 'warning' },
  approved_level1: { label: '一级审批通过', color: 'processing' },
  approved_level2: { label: '二级审批通过', color: 'success' },
  rejected: { label: '已驳回', color: 'error' },
  pushed: { label: '已推送监管', color: 'default' },
};
