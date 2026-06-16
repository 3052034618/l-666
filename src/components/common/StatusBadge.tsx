import { Tag } from 'antd';
import type { TaskStatus, AlertLevel, UserRole } from '../../../shared/types.js';
import { taskStatusMap, alertLevelMap, userRoleMap, approvalStatusMap } from '../../utils/format.js';

interface StatusBadgeProps {
  type: 'task' | 'alert' | 'role' | 'approval';
  status: string;
}

export const StatusBadge = ({ type, status }: StatusBadgeProps) => {
  let config: { label: string; color: string } | undefined;

  switch (type) {
    case 'task':
      config = taskStatusMap[status as TaskStatus];
      break;
    case 'alert':
      config = alertLevelMap[status as AlertLevel];
      break;
    case 'role':
      config = userRoleMap[status as UserRole];
      break;
    case 'approval':
      config = approvalStatusMap[status];
      break;
  }

  if (!config) {
    return <Tag>{status}</Tag>;
  }

  return <Tag color={config.color}>{config.label}</Tag>;
};

export default StatusBadge;
