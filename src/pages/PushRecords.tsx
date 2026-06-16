import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  message,
  Drawer,
  Descriptions,
  Empty,
  Spin,
  Tooltip,
} from 'antd';
import {
  Database,
  Send,
  CheckCircle,
  Clock,
  FileText,
  Eye,
  RefreshCw,
  Gauge,
  Search,
  Filter,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { pushRecordsAPI } from '../utils/api.js';
import { formatDateTime } from '../utils/format.js';
import { useAuthStore } from '../store/useAuthStore.js';
import type { PushRecord } from '../../shared/types.js';

const { Option } = Select;

export const PushRecordsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [records, setRecords] = useState<PushRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<PushRecord | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [retrying, setRetrying] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState({
    status: '',
    keyword: '',
  });

  useEffect(() => {
    fetchRecords();
  }, [filters]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await pushRecordsAPI.getPushRecords();
      
      let filtered = data;
      if (filters.status) {
        filtered = filtered.filter((r: PushRecord) => r.status === filters.status);
      }
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        filtered = filtered.filter(
          (r: PushRecord) =>
            r.taskName.toLowerCase().includes(kw) ||
            (r.reportName && r.reportName.toLowerCase().includes(kw))
        );
      }
      
      setRecords(filtered);
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取推送记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (record: PushRecord) => {
    setSelectedRecord(record);
    setDrawerVisible(true);
  };

  const handleRetry = async (record: PushRecord) => {
    try {
      setRetrying((prev) => ({ ...prev, [record.id]: true }));
      await pushRecordsAPI.retryPush(record.id);
      message.success('重新推送成功');
      fetchRecords();
    } catch (error: any) {
      message.error(error.response?.data?.error || '重新推送失败');
    } finally {
      setRetrying((prev) => ({ ...prev, [record.id]: false }));
    }
  };

  const getStatusConfig = (status: PushRecord['status']) => {
    const map: Record<PushRecord['status'], { label: string; color: string; icon: any }> = {
      pending: { label: '推送中', color: 'processing', icon: Clock },
      received: { label: '已接收', color: 'success', icon: CheckCircle },
      failed: { label: '推送失败', color: 'error', icon: AlertCircle },
    };
    return map[status];
  };

  const stats = {
    total: records.length,
    pending: records.filter((r) => r.status === 'pending').length,
    received: records.filter((r) => r.status === 'received').length,
    failed: records.filter((r) => r.status === 'failed').length,
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'taskName',
      key: 'taskName',
      ellipsis: true,
      render: (name: string, record: PushRecord) => (
        <Button
          type="link"
          onClick={() => navigate(`/tasks/${record.taskId}`)}
          className="p-0 h-auto"
        >
          {name}
        </Button>
      ),
    },
    {
      title: '关联报告',
      dataIndex: 'reportName',
      key: 'reportName',
      ellipsis: true,
      render: (name: string | undefined) => name || '-',
    },
    {
      title: '安全指数',
      dataIndex: 'safetyIndex',
      key: 'safetyIndex',
      width: 120,
      render: (val: number | undefined) =>
        val !== undefined ? (
          <span className="font-medium text-blue-600">
            {(val * 100).toFixed(1)}%
          </span>
        ) : (
          '-'
        ),
    },
    {
      title: '推送状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: PushRecord['status']) => {
        const config = getStatusConfig(status);
        const Icon = config.icon;
        return (
          <Tag color={config.color} className="flex items-center gap-1 w-fit">
            <Icon size={12} />
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: '推送人',
      dataIndex: 'pushedByName',
      key: 'pushedByName',
      width: 120,
    },
    {
      title: '推送时间',
      dataIndex: 'pushedAt',
      key: 'pushedAt',
      width: 180,
      render: (t: string) => formatDateTime(t),
    },
    {
      title: '接收时间',
      dataIndex: 'receivedAt',
      key: 'receivedAt',
      width: 180,
      render: (t: string | undefined) => (t ? formatDateTime(t) : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: PushRecord) => (
        <Space>
          <Button
            size="small"
            icon={<Eye size={14} />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.status === 'failed' && user?.role === 'director' && (
            <Button
              size="small"
              icon={<RefreshCw size={14} />}
              loading={retrying[record.id]}
              onClick={() => handleRetry(record)}
            >
              重推
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">监管推送记录</h1>
        <p className="text-gray-500 mt-1">
          查看所有推送至国家核安全监管数据库的记录，追溯推送状态和接收情况
        </p>
      </div>

      <Row gutter={16}>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="推送总数"
              value={stats.total}
              prefix={<Database size={20} className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="推送中"
              value={stats.pending}
              prefix={<Clock size={20} className="text-orange-500" />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="已接收"
              value={stats.received}
              prefix={<CheckCircle size={20} className="text-green-500" />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="推送失败"
              value={stats.failed}
              prefix={<AlertCircle size={20} className="text-red-500" />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">推送记录列表</h3>
          <Space>
            <Input
              placeholder="搜索任务名称或报告"
              prefix={<Search size={16} className="text-gray-400" />}
              value={filters.keyword}
              onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
              className="w-64"
              allowClear
            />
            <Select
              placeholder="状态筛选"
              value={filters.status || undefined}
              onChange={(v) => setFilters((f) => ({ ...f, status: v || '' }))}
              className="w-36"
              allowClear
            >
              <Option value="pending">推送中</Option>
              <Option value="received">已接收</Option>
              <Option value="failed">推送失败</Option>
            </Select>
            <Button icon={<RefreshCw size={16} />} onClick={fetchRecords}>
              刷新
            </Button>
          </Space>
        </div>

        <Table
          dataSource={records}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={{
            emptyText: (
              <Empty
                description="暂无推送记录"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>

      <Drawer
        title="推送记录详情"
        placement="right"
        width={520}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {selectedRecord && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Send size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {selectedRecord.taskName}
                </h3>
                <Tag color={getStatusConfig(selectedRecord.status).color}>
                  {getStatusConfig(selectedRecord.status).label}
                </Tag>
              </div>
            </div>

            <Card title="基本信息" size="small" className="border-0 shadow-sm">
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="任务名称">
                  <Button
                    type="link"
                    onClick={() => navigate(`/tasks/${selectedRecord.taskId}`)}
                    className="p-0 h-auto"
                  >
                    {selectedRecord.taskName}
                  </Button>
                </Descriptions.Item>
                <Descriptions.Item label="关联报告">
                  {selectedRecord.reportName || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="安全指数">
                  {selectedRecord.safetyIndex !== undefined ? (
                    <span className="font-medium text-blue-600">
                      {(selectedRecord.safetyIndex * 100).toFixed(1)}%
                    </span>
                  ) : (
                    '-'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="推送状态">
                  <Tag color={getStatusConfig(selectedRecord.status).color}>
                    {getStatusConfig(selectedRecord.status).label}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="推送人">
                  {selectedRecord.pushedByName}
                </Descriptions.Item>
                <Descriptions.Item label="推送时间">
                  {formatDateTime(selectedRecord.pushedAt)}
                </Descriptions.Item>
                <Descriptions.Item label="接收时间">
                  {selectedRecord.receivedAt
                    ? formatDateTime(selectedRecord.receivedAt)
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="备注">
                  {selectedRecord.remark || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {selectedRecord.status === 'failed' && user?.role === 'director' && (
              <div className="pt-4 border-t border-gray-100">
                <Button
                  type="primary"
                  block
                  icon={<RefreshCw size={16} />}
                  loading={retrying[selectedRecord.id]}
                  onClick={() => handleRetry(selectedRecord)}
                >
                  重新推送
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default PushRecordsPage;
