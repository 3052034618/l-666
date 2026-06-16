import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, Input, Select, Progress, Tooltip, Popconfirm, message } from 'antd';
import { Search, Eye, XCircle, RefreshCw, Plus, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tasksAPI } from '../utils/api.js';
import type { SimulationTask, TaskStatus } from '../../shared/types.js';
import { formatDateTime, formatDuration, taskStatusMap } from '../utils/format.js';
import StatusBadge from '../components/common/StatusBadge.js';

const { Search: SearchInput } = Input;
const { Option } = Select;

export const Tasks = () => {
  const [tasks, setTasks] = useState<SimulationTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const result = await tasksAPI.getTasks({
        status: statusFilter || undefined,
        page: page - 1,
        size: pageSize,
      });
      let filteredTasks = result.items;
      if (searchText) {
        filteredTasks = filteredTasks.filter(
          (t) => t.name.toLowerCase().includes(searchText.toLowerCase()) ||
                 t.description?.toLowerCase().includes(searchText.toLowerCase())
        );
      }
      setTasks(filteredTasks);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      message.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [page, pageSize, statusFilter]);

  const handleCancel = async (id: string) => {
    try {
      await tasksAPI.cancelTask(id);
      message.success('任务已取消');
      fetchTasks();
    } catch (error: any) {
      message.error(error.response?.data?.error || '取消失败');
    }
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: SimulationTask) => (
        <div>
          <div className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer" onClick={() => navigate(`/tasks/${record.id}`)}>
            {text}
          </div>
          <div className="text-xs text-gray-500 mt-1">{record.description}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: TaskStatus, record: SimulationTask) => (
        <div className="space-y-1">
          <StatusBadge type="task" status={status} />
          {status === 'computing' && (
            <Progress percent={record.progress} size="small" showInfo={false} />
          )}
        </div>
      ),
    },
    {
      title: '安全指数',
      dataIndex: ['result', 'safetyIndex'],
      key: 'safetyIndex',
      width: 120,
      render: (value: number | undefined) => {
        if (value === undefined) return <Tag color="default">计算中</Tag>;
        const color = value >= 0.8 ? 'green' : value >= 0.6 ? 'gold' : 'red';
        return <Tag color={color}>{value.toFixed(2)}</Tag>;
      },
    },
    {
      title: '最高温度',
      dataIndex: ['result', 'maxTemperature'],
      key: 'maxTemperature',
      width: 120,
      render: (value: number | undefined) => {
        if (value === undefined) return '-';
        const color = value >= 90 ? 'red' : value >= 75 ? 'gold' : 'green';
        return <Tag color={color}>{value.toFixed(1)} °C</Tag>;
      },
    },
    {
      title: '核素释放率',
      dataIndex: ['result', 'nuclideReleaseRate'],
      key: 'nuclideReleaseRate',
      width: 140,
      render: (value: number | undefined) => {
        if (value === undefined) return '-';
        return `${value.toExponential(2)}`;
      },
    },
    {
      title: '审批状态',
      dataIndex: 'approvalStatus',
      key: 'approvalStatus',
      width: 130,
      render: (status: string) => <StatusBadge type="approval" status={status} />,
    },
    {
      title: '连续偏差',
      dataIndex: 'deviationCount',
      key: 'deviationCount',
      width: 100,
      render: (count: number) => {
        if (count >= 3) {
          return (
            <Tooltip title="连续三次模拟偏差超过20%，已自动暂停新任务">
              <Tag color="red" icon={<AlertTriangle size={12} />}>{count}次</Tag>
            </Tooltip>
          );
        }
        if (count > 0) {
          return <Tag color="gold">{count}次</Tag>;
        }
        return <span className="text-gray-400">0次</span>;
      },
    },
    {
      title: '创建人',
      dataIndex: 'createdByName',
      key: 'createdByName',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '计算耗时',
      dataIndex: ['result', 'computationTime'],
      key: 'computationTime',
      width: 120,
      render: (time: number | undefined) => {
        if (time === undefined) return '-';
        return formatDuration(time);
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: SimulationTask) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<Eye size={16} />}
              onClick={() => navigate(`/tasks/${record.id}`)}
            />
          </Tooltip>
          {record.status === 'computing' && (
            <Popconfirm
              title="确定要取消该任务吗？"
              onConfirm={() => handleCancel(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="取消任务">
                <Button type="text" danger icon={<XCircle size={16} />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-800">模拟任务列表</h2>
          <div className="flex items-center gap-3">
            <SearchInput
              placeholder="搜索任务名称..."
              allowClear
              size="large"
              style={{ width: 240 }}
              prefix={<Search size={16} className="text-gray-400" />}
              onSearch={(value) => {
                setSearchText(value);
                fetchTasks();
              }}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Select
              placeholder="状态筛选"
              allowClear
              size="large"
              style={{ width: 160 }}
              value={statusFilter || undefined}
              onChange={(value) => {
                setStatusFilter(value || '');
                setPage(1);
              }}
            >
              {Object.entries(taskStatusMap).map(([key, { label }]) => (
                <Option key={key} value={key}>{label}</Option>
              ))}
            </Select>
            <Button
              icon={<RefreshCw size={16} />}
              size="large"
              onClick={fetchTasks}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<Plus size={16} />}
              size="large"
              onClick={() => navigate('/upload')}
            >
              新建任务
            </Button>
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          scroll={{ x: 1400 }}
        />
      </Card>
    </div>
  );
};

export default Tasks;
