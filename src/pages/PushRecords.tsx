import { useState, useEffect, useRef, useCallback } from 'react';
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
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const TIMEOUT_SECONDS = 15;

  const fetchRecords = useCallback(async () => {
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

      if (drawerVisible && selectedRecord) {
        const updated = filtered.find((r: PushRecord) => r.id === selectedRecord.id);
        if (updated) {
          setSelectedRecord(updated);
        }
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取推送记录失败');
    } finally {
      setLoading(false);
    }
  }, [filters, drawerVisible, selectedRecord]);

  useEffect(() => {
    fetchRecords();
  }, [filters]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    let count = 0;
    pollingRef.current = setInterval(() => {
      fetchRecords();
      count++;
      if (count >= 8) {
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    }, 2000);
  };

  const isTimeout = (record: PushRecord): boolean => {
    if (record.status !== 'pending') return false;
    const elapsed = (Date.now() - new Date(record.pushedAt).getTime()) / 1000;
    return elapsed > TIMEOUT_SECONDS;
  };

  const handleViewDetail = (record: PushRecord) => {
    setSelectedRecord(record);
    setDrawerVisible(true);
  };

  const handleRetry = async (record: PushRecord) => {
    try {
      setRetrying((prev) => ({ ...prev, [record.id]: true }));
      await pushRecordsAPI.retryPush(record.id);
      message.success('重新推送成功，新批次号已生成');
      await fetchRecords();
      startPolling();
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
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 180,
      render: (batchNo: string) => (
        <span className="font-mono text-xs text-blue-700">{batchNo}</span>
      ),
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
      render: (status: PushRecord['status'], record: PushRecord) => {
        const config = getStatusConfig(status);
        const Icon = config.icon;
        const timeout = isTimeout(record);
        return (
          <Space direction="vertical" size={0}>
            <Tag color={config.color} className="flex items-center gap-1 w-fit">
              <Icon size={12} />
              {config.label}
            </Tag>
            {timeout && (
              <Tag color="error" className="text-xs">超时</Tag>
            )}
          </Space>
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
          {(record.status === 'failed' || isTimeout(record)) && user?.role === 'director' && (
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
        width={600}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        extra={
          selectedRecord && (selectedRecord.status === 'failed' || selectedRecord.status === 'pending' || isTimeout(selectedRecord)) && user?.role === 'director' ? (
            <Button
              type="primary"
              icon={<RefreshCw size={16} />}
              loading={retrying[selectedRecord.id]}
              onClick={() => handleRetry(selectedRecord)}
            >
              重新推送
            </Button>
          ) : null
        }
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Send size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {selectedRecord.taskName}
                </h3>
                <Space>
                  <Tag color={getStatusConfig(selectedRecord.status).color}>
                    {getStatusConfig(selectedRecord.status).label}
                  </Tag>
                  <Tag color="blue">{selectedRecord.batchNo}</Tag>
                </Space>
              </div>
            </div>

            <Card title="基本信息" size="small" className="border-0 shadow-sm">
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="任务名称" span={2}>
                  <Button
                    type="link"
                    onClick={() => navigate(`/tasks/${selectedRecord.taskId}`)}
                    className="p-0 h-auto"
                  >
                    {selectedRecord.taskName}
                  </Button>
                </Descriptions.Item>
                <Descriptions.Item label="推送批次号" span={2}>
                  <span className="font-mono font-medium text-blue-700">{selectedRecord.batchNo}</span>
                </Descriptions.Item>
                <Descriptions.Item label="关联报告">
                  {selectedRecord.reportName || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="安全指数">
                  {selectedRecord.safetyIndex !== undefined ? (
                    <span className="font-medium text-blue-600">
                      {(selectedRecord.safetyIndex * 100).toFixed(1)}%
                    </span>
                  ) : '-'}
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
                <Descriptions.Item label="备注" span={2}>
                  {selectedRecord.remark || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {isTimeout(selectedRecord) && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-500" />
                  <span className="font-medium text-red-700">推送超时</span>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  推送已超过{TIMEOUT_SECONDS}秒未收到确认，可能存在网络异常。建议重新推送。
                </p>
              </div>
            )}

            {selectedRecord.receipt && (
              <Card title="监管接收回执" size="small" className="border-0 shadow-sm">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={18} className="text-green-600" />
                    <span className="font-medium text-green-800">监管已确认接收</span>
                  </div>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="回执编号">
                      <span className="font-mono text-green-700 font-medium">{selectedRecord.receipt.receiptNo}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="接收单位">
                      {selectedRecord.receipt.receivedOrg}
                    </Descriptions.Item>
                    <Descriptions.Item label="接收部门">
                      {selectedRecord.receipt.receivedBy}
                    </Descriptions.Item>
                    <Descriptions.Item label="回执信息">
                      {selectedRecord.receipt.message}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              </Card>
            )}

            {selectedRecord.syncLogs && selectedRecord.syncLogs.length > 0 && (
              <Card title="同步日志" size="small" className="border-0 shadow-sm">
                <div className="space-y-3">
                  {selectedRecord.syncLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${
                          log.status === 'success' ? 'bg-green-500' : 
                          log.status === 'pending' ? 'bg-orange-500' : 'bg-red-500'
                        }`} />
                        {idx < selectedRecord.syncLogs.length - 1 && (
                          <div className="w-0.5 h-8 bg-gray-200" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-gray-800">{log.action}</span>
                          <Tag color={
                            log.status === 'success' ? 'success' : 
                            log.status === 'pending' ? 'processing' : 'error'
                          } className="text-xs">
                            {log.status === 'success' ? '成功' : log.status === 'pending' ? '进行中' : '失败'}
                          </Tag>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{log.detail}</p>
                        <p className="text-xs text-gray-400">{formatDateTime(log.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default PushRecordsPage;
