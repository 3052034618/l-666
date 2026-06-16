import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  InputNumber,
  Select,
  Modal,
  Form,
  Row,
  Col,
  Statistic,
  List,
  message,
  Drawer,
  Descriptions,
  Empty,
  Spin,
} from 'antd';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Search,
  Filter,
  Eye,
  CheckSquare,
  XCircle,
  Thermometer,
  Droplets,
  Waves,
  Atom,
  Clock,
  MapPin,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { alertsAPI } from '../utils/api.js';
import { formatDateTime, formatScientific, alertTypeMap } from '../utils/format.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import type { Alert, AlertLevel, AlertType, AlertStatus } from '../../shared/types.js';

const { Option } = Select;
const { TextArea } = Input;

interface ReviewFormData {
  comment: string;
  adjustSpacing?: number;
  adjustBufferThickness?: number;
}

export const AlertsPage = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewForm] = Form.useForm<ReviewFormData>();
  const [filters, setFilters] = useState({
    level: '',
    status: '',
    type: '',
    keyword: '',
  });

  useEffect(() => {
    fetchAlerts();
  }, [filters]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filters.level) params.level = filters.level;
      if (filters.status) params.status = filters.status;
      const data = await alertsAPI.getAlerts(params);
      
      let filtered = data;
      if (filters.type) {
        filtered = filtered.filter((a) => a.type === filters.type);
      }
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        filtered = filtered.filter(
          (a) =>
            a.message.toLowerCase().includes(kw) ||
            a.taskName.toLowerCase().includes(kw) ||
            a.location.toLowerCase().includes(kw)
        );
      }
      
      setAlerts(filtered);
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取预警列表失败');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: AlertType) => {
    const icons: Record<AlertType, React.ReactNode> = {
      temperature: <Thermometer size={18} className="text-red-500" />,
      pressure: <Droplets size={18} className="text-blue-500" />,
      seepage: <Waves size={18} className="text-cyan-500" />,
      concentration: <Atom size={18} className="text-green-500" />,
    };
    return icons[type] || <AlertCircle size={18} />;
  };

  const getLevelIcon = (level: AlertLevel) => {
    const icons: Record<AlertLevel, React.ReactNode> = {
      critical: <AlertTriangle size={20} className="text-red-500" />,
      warning: <AlertCircle size={20} className="text-yellow-500" />,
      info: <Info size={20} className="text-blue-500" />,
    };
    return icons[level] || <Info size={20} />;
  };

  const handleViewDetail = (alert: Alert) => {
    setSelectedAlert(alert);
    setDrawerVisible(true);
  };

  const handleReview = (alert: Alert) => {
    setSelectedAlert(alert);
    reviewForm.resetFields();
    setReviewModalVisible(true);
  };

  const handleSubmitReview = async (values: ReviewFormData) => {
    if (!selectedAlert) return;
    try {
      const adjustmentParams: any = {};
      if (values.adjustSpacing) adjustmentParams.spacing = values.adjustSpacing;
      if (values.adjustBufferThickness) adjustmentParams.bufferThickness = values.adjustBufferThickness;

      await alertsAPI.reviewAlert(selectedAlert.id, {
        comment: values.comment,
        adjustmentParams: Object.keys(adjustmentParams).length > 0 ? adjustmentParams : undefined,
      });
      
      message.success('预警复核成功');
      setReviewModalVisible(false);
      fetchAlerts();
    } catch (error: any) {
      message.error(error.response?.data?.error || '复核失败');
    }
  };

  const handleResolve = async (alert: Alert) => {
    try {
      await alertsAPI.resolveAlert(alert.id);
      message.success('预警已标记为已解决');
      fetchAlerts();
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const stats = {
    total: alerts.length,
    critical: alerts.filter((a) => a.level === 'critical').length,
    pending: alerts.filter((a) => a.status === 'pending').length,
    reviewed: alerts.filter((a) => a.status === 'reviewed').length,
  };

  const columns = [
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: AlertLevel) => (
        <div className="flex items-center justify-center">
          {getLevelIcon(level)}
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: AlertType) => (
        <div className="flex items-center gap-1">
          {getTypeIcon(type)}
          <span>{alertTypeMap[type]?.label || type}</span>
        </div>
      ),
    },
    {
      title: '预警信息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: '当前值/阈值',
      key: 'value',
      width: 180,
      render: (_: any, record: Alert) => {
        const typeInfo = alertTypeMap[record.type];
        return (
          <div>
            <div className="text-red-600 font-medium">
              {formatScientific(record.value)} {typeInfo?.unit}
            </div>
            <div className="text-gray-500 text-sm">
              阈值: {formatScientific(record.threshold)} {typeInfo?.unit}
            </div>
          </div>
        );
      },
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
      width: 120,
      ellipsis: true,
    },
    {
      title: '关联任务',
      dataIndex: 'taskName',
      key: 'taskName',
      width: 150,
      ellipsis: true,
      render: (name: string, record: Alert) => (
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
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (t: string) => formatDateTime(t),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: AlertStatus) => {
        const statusMap: Record<AlertStatus, { label: string; color: string }> = {
          pending: { label: '待处理', color: 'warning' },
          reviewed: { label: '已复核', color: 'processing' },
          resolved: { label: '已解决', color: 'success' },
        };
        return <Tag color={statusMap[status]?.color}>{statusMap[status]?.label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: Alert) => (
        <Space>
          <Button
            size="small"
            icon={<Eye size={14} />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.status === 'pending' && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckSquare size={14} />}
                onClick={() => handleReview(record)}
              >
                复核
              </Button>
              <Button
                size="small"
                type="default"
                icon={<CheckCircle size={14} />}
                onClick={() => handleResolve(record)}
              >
                解决
              </Button>
            </>
          )}
          {record.status === 'reviewed' && (
            <Button
              size="small"
              type="default"
              icon={<CheckCircle size={14} />}
              onClick={() => handleResolve(record)}
            >
              解决
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">预警中心</h1>
          <p className="text-gray-500 mt-1">实时监控处置库运行状态，及时处理异常预警</p>
        </div>
      </div>

      <Row gutter={16}>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="预警总数"
              value={stats.total}
              prefix={<Bell size={20} className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="严重预警"
              value={stats.critical}
              valueStyle={{ color: '#D8315B' }}
              prefix={<AlertTriangle size={20} className="text-red-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="待处理"
              value={stats.pending}
              valueStyle={{ color: '#FAAD14' }}
              prefix={<Clock size={20} className="text-yellow-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="已复核"
              value={stats.reviewed}
              valueStyle={{ color: '#52C41A' }}
              prefix={<CheckCircle size={20} className="text-green-500" />}
            />
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-gray-400" />
            <Input
              placeholder="搜索预警信息..."
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              className="w-64"
              allowClear
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <Select
              placeholder="预警级别"
              value={filters.level || undefined}
              onChange={(v) => setFilters({ ...filters, level: v })}
              className="w-32"
              allowClear
            >
              <Option value="critical">严重</Option>
              <Option value="warning">警告</Option>
              <Option value="info">提示</Option>
            </Select>
            <Select
              placeholder="预警类型"
              value={filters.type || undefined}
              onChange={(v) => setFilters({ ...filters, type: v })}
              className="w-32"
              allowClear
            >
              <Option value="temperature">温度</Option>
              <Option value="pressure">孔隙压力</Option>
              <Option value="seepage">渗流速度</Option>
              <Option value="concentration">核素浓度</Option>
            </Select>
            <Select
              placeholder="处理状态"
              value={filters.status || undefined}
              onChange={(v) => setFilters({ ...filters, status: v })}
              className="w-32"
              allowClear
            >
              <Option value="pending">待处理</Option>
              <Option value="reviewed">已复核</Option>
              <Option value="resolved">已解决</Option>
            </Select>
          </div>
          <Button type="primary" onClick={fetchAlerts}>
            查询
          </Button>
          <Button onClick={() => setFilters({ level: '', status: '', type: '', keyword: '' })}>
            重置
          </Button>
        </div>

        <Table
          dataSource={alerts}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条预警`,
          }}
          scroll={{ x: 1300 }}
        />
      </Card>

      <Drawer
        title="预警详情"
        placement="right"
        width={600}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {selectedAlert && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50">
              {getLevelIcon(selectedAlert.level)}
              <div>
                <div className="font-semibold text-lg">{selectedAlert.message}</div>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge type="alert" status={selectedAlert.level} />
                  <Tag color="blue">{alertTypeMap[selectedAlert.type]?.label}</Tag>
                </div>
              </div>
            </div>

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="关联任务">
                <Button
                  type="link"
                  onClick={() => {
                    setDrawerVisible(false);
                    navigate(`/tasks/${selectedAlert.taskId}`);
                  }}
                  className="p-0 h-auto"
                >
                  {selectedAlert.taskName}
                </Button>
              </Descriptions.Item>
              <Descriptions.Item label="预警时间">
                {formatDateTime(selectedAlert.timestamp)}
              </Descriptions.Item>
              <Descriptions.Item label="位置">
                <div className="flex items-center gap-1">
                  <MapPin size={14} />
                  {selectedAlert.location}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="当前值">
                <span className="text-red-600 font-medium">
                  {formatScientific(selectedAlert.value)} {alertTypeMap[selectedAlert.type]?.unit}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="设计阈值">
                {formatScientific(selectedAlert.threshold)} {alertTypeMap[selectedAlert.type]?.unit}
              </Descriptions.Item>
              <Descriptions.Item label="超出量">
                <span className="text-red-600 font-medium">
                  {((selectedAlert.value - selectedAlert.threshold) / selectedAlert.threshold * 100).toFixed(2)}%
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="处理状态">
                {selectedAlert.status === 'pending' && <Tag color="warning">待处理</Tag>}
                {selectedAlert.status === 'reviewed' && <Tag color="processing">已复核</Tag>}
                {selectedAlert.status === 'resolved' && <Tag color="success">已解决</Tag>}
              </Descriptions.Item>
              {selectedAlert.reviewedBy && (
                <>
                  <Descriptions.Item label="复核人">
                    <div className="flex items-center gap-1">
                      <User size={14} />
                      {selectedAlert.reviewedByName}
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="复核时间">
                    {selectedAlert.reviewedAt && formatDateTime(selectedAlert.reviewedAt)}
                  </Descriptions.Item>
                  <Descriptions.Item label="复核意见">
                    {selectedAlert.reviewComment}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>

            <div className="flex justify-end gap-3 pt-4 border-t">
              {selectedAlert.status === 'pending' && (
                <>
                  <Button onClick={() => setDrawerVisible(false)}>关闭</Button>
                  <Button
                    type="primary"
                    onClick={() => {
                      setDrawerVisible(false);
                      handleReview(selectedAlert);
                    }}
                  >
                    复核预警
                  </Button>
                </>
              )}
              {selectedAlert.status === 'reviewed' && (
                <>
                  <Button onClick={() => setDrawerVisible(false)}>关闭</Button>
                  <Button
                    type="primary"
                    onClick={() => {
                      handleResolve(selectedAlert);
                      setDrawerVisible(false);
                    }}
                  >
                    标记已解决
                  </Button>
                </>
              )}
              {selectedAlert.status === 'resolved' && (
                <Button onClick={() => setDrawerVisible(false)}>关闭</Button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        title="复核预警"
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedAlert && (
          <Form
            form={reviewForm}
            layout="vertical"
            onFinish={handleSubmitReview}
            initialValues={{
              adjustSpacing: selectedAlert.type === 'temperature' ? 8 : undefined,
              adjustBufferThickness: selectedAlert.type === 'temperature' ? 0.8 : undefined,
            }}
          >
            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 text-red-600 font-medium mb-2">
                <AlertTriangle size={18} />
                预警信息
              </div>
              <div className="text-gray-700">{selectedAlert.message}</div>
              <div className="mt-2 text-sm text-gray-500">
                当前值: {formatScientific(selectedAlert.value)} {alertTypeMap[selectedAlert.type]?.unit} / 
                阈值: {formatScientific(selectedAlert.threshold)} {alertTypeMap[selectedAlert.type]?.unit}
              </div>
            </div>

            <Form.Item
              name="comment"
              label="复核意见"
              rules={[{ required: true, message: '请输入复核意见' }]}
            >
              <TextArea
                rows={3}
                placeholder="请输入复核意见，说明异常原因及处理建议..."
              />
            </Form.Item>

            <div className="p-4 bg-blue-50 rounded-lg mb-4">
              <div className="text-blue-600 font-medium mb-2">参数调整建议（可选）</div>
              <p className="text-sm text-gray-600 mb-3">
                复核通过后，系统将使用以下参数自动重新模拟并记录调参日志
              </p>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="adjustSpacing"
                    label="调整废物包间距 (m)"
                    help="建议增大间距以降低温度叠加效应"
                  >
                    <InputNumber min={3} max={15} step={0.5} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="adjustBufferThickness"
                    label="调整缓冲层厚度 (m)"
                    help="建议增加厚度以增强隔热和阻滞性能"
                  >
                    <InputNumber min={0.3} max={2} step={0.1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div className="flex justify-end gap-3">
              <Button onClick={() => setReviewModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                确认复核
              </Button>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default AlertsPage;
