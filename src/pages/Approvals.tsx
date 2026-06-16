import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Modal,
  Form,
  Row,
  Col,
  List,
  Statistic,
  message,
  Drawer,
  Descriptions,
  Empty,
  Spin,
  Alert,
  Tabs,
  Radio,
} from 'antd';
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Eye,
  Search,
  Filter,
  Send,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Building2,
  Database,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { approvalsAPI, tasksAPI } from '../utils/api.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { formatDateTime, formatScientific } from '../utils/format.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import type { Approval, ApprovalStatus, SimulationTask } from '../../shared/types.js';

const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

export const ApprovalsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [tasks, setTasks] = useState<SimulationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [processModalVisible, setProcessModalVisible] = useState(false);
  const [processForm] = Form.useForm();
  const [processType, setProcessType] = useState<'approve' | 'reject'>('approve');
  const [activeTab, setActiveTab] = useState('pending');
  const [filters, setFilters] = useState({
    level: '',
    status: '',
    keyword: '',
  });

  useEffect(() => {
    fetchData();
  }, [filters, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (filters.level) params.level = parseInt(filters.level);
      
      let statusFilter = filters.status;
      if (activeTab === 'pending') statusFilter = 'pending';
      if (activeTab === 'approved') statusFilter = 'approved';
      if (activeTab === 'rejected') statusFilter = 'rejected';
      if (statusFilter) params.status = statusFilter;

      const [approvalData, taskData] = await Promise.all([
        approvalsAPI.getApprovals(params),
        tasksAPI.getTasks({ page: 1, size: 100 }),
      ]);
      
      let filtered = approvalData;
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        filtered = filtered.filter(
          (a) =>
            a.taskName.toLowerCase().includes(kw) ||
            (a.approverName && a.approverName.toLowerCase().includes(kw))
        );
      }
      
      setApprovals(filtered);
      setTasks(taskData.items);
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取审批列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (approval: Approval) => {
    setSelectedApproval(approval);
    setDrawerVisible(true);
  };

  const handleProcess = (approval: Approval, type: 'approve' | 'reject') => {
    setSelectedApproval(approval);
    setProcessType(type);
    processForm.resetFields();
    setProcessModalVisible(true);
  };

  const handleSubmitProcess = async (values: any) => {
    if (!selectedApproval) return;
    try {
      await approvalsAPI.processApproval(selectedApproval.id, {
        status: processType,
        comment: values.comment,
      });
      
      message.success(processType === 'approve' ? '审批通过' : '审批已驳回');
      setProcessModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const handlePushToRegulatory = async (approval: Approval) => {
    try {
      await approvalsAPI.pushToRegulatory(approval.taskId);
      message.success('已推送至监管数据库');
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.error || '推送失败');
    }
  };

  const canProcess = (approval: Approval): boolean => {
    if (!user) return false;
    if (approval.status !== 'pending') return false;
    if (approval.level === 1 && user.role === 'engineer') return true;
    if (approval.level === 2 && user.role === 'director') return true;
    return false;
  };

  const canPush = (approval: Approval): boolean => {
    if (!user) return false;
    return approval.status === 'approved' && approval.level === 2 && user.role === 'director';
  };

  const stats = {
    total: approvals.length,
    pending: approvals.filter((a) => a.status === 'pending').length,
    approved: approvals.filter((a) => a.status === 'approved').length,
    rejected: approvals.filter((a) => a.status === 'rejected').length,
  };

  const columns = [
    {
      title: '审批级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: number) => (
        <div className="flex items-center gap-1">
          {level === 1 ? (
            <ShieldCheck size={16} className="text-purple-500" />
          ) : (
            <Building2 size={16} className="text-gold-500" />
          )}
          <Tag color={level === 1 ? 'purple' : 'gold'}>
            {level === 1 ? '一级审批' : '二级审批'}
          </Tag>
        </div>
      ),
    },
    {
      title: '任务名称',
      dataIndex: 'taskName',
      key: 'taskName',
      ellipsis: true,
      render: (name: string, record: Approval) => (
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ApprovalStatus) => {
        const statusMap: Record<ApprovalStatus, { label: string; color: string }> = {
          pending: { label: '待审批', color: 'warning' },
          approved: { label: '已通过', color: 'success' },
          rejected: { label: '已驳回', color: 'error' },
        };
        const config = statusMap[status];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '审批人',
      dataIndex: 'approverName',
      key: 'approverName',
      width: 120,
      render: (name: string | undefined) => name || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (t: string) => formatDateTime(t),
    },
    {
      title: '审批时间',
      dataIndex: 'reviewedAt',
      key: 'reviewedAt',
      width: 160,
      render: (t: string | undefined) => t ? formatDateTime(t) : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right' as const,
      render: (_: any, record: Approval) => (
        <Space>
          <Button
            size="small"
            icon={<Eye size={14} />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {canProcess(record) && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckCircle size={14} />}
                onClick={() => handleProcess(record, 'approve')}
              >
                通过
              </Button>
              <Button
                size="small"
                danger
                icon={<XCircle size={14} />}
                onClick={() => handleProcess(record, 'reject')}
              >
                驳回
              </Button>
            </>
          )}
          {canPush(record) && (
            <Button
              size="small"
              type="primary"
              icon={<Database size={14} />}
              onClick={() => handlePushToRegulatory(record)}
            >
              推送监管
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
          <h1 className="text-2xl font-bold text-gray-800">审批中心</h1>
          <p className="text-gray-500 mt-1">两级审批机制：安全工程师验证 → 项目总监确认 → 推送监管数据库</p>
        </div>
      </div>

      <Alert
        message="审批流程说明"
        description={
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-purple-500 flex-shrink-0" />
              <span>一级审批：安全工程师验证计算收敛性和结果合理性</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-yellow-500 flex-shrink-0" />
              <span>二级审批：项目总监确认风险评估结论和安全指数</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0" />
              <span>审批通过后自动推送至监管数据库，完成归档</span>
            </div>
          </div>
        }
        type="info"
        showIcon
        icon={<ClipboardCheck size={20} />}
      />

      <Row gutter={16}>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="审批总数"
              value={stats.total}
              prefix={<ClipboardCheck size={20} className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="待审批"
              value={stats.pending}
              valueStyle={{ color: '#FAAD14' }}
              prefix={<Clock size={20} className="text-yellow-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="已通过"
              value={stats.approved}
              valueStyle={{ color: '#52C41A' }}
              prefix={<CheckCircle size={20} className="text-green-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="已驳回"
              value={stats.rejected}
              valueStyle={{ color: '#D8315B' }}
              prefix={<XCircle size={20} className="text-red-500" />}
            />
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'all', label: '全部' },
            { key: 'pending', label: `待审批 (${stats.pending})` },
            { key: 'approved', label: `已通过 (${stats.approved})` },
            { key: 'rejected', label: `已驳回 (${stats.rejected})` },
          ]}
        />

        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-gray-400" />
            <Input
              placeholder="搜索任务名称..."
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              className="w-64"
              allowClear
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <Select
              placeholder="审批级别"
              value={filters.level || undefined}
              onChange={(v) => setFilters({ ...filters, level: v })}
              className="w-32"
              allowClear
            >
              <Option value="1">一级审批</Option>
              <Option value="2">二级审批</Option>
            </Select>
          </div>
          <Button type="primary" onClick={fetchData}>
            查询
          </Button>
          <Button onClick={() => setFilters({ level: '', status: '', keyword: '' })}>
            重置
          </Button>
        </div>

        <Table
          dataSource={approvals}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条审批`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Drawer
        title="审批详情"
        placement="right"
        width={700}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>关闭</Button>
            {selectedApproval && canProcess(selectedApproval) && (
              <>
                <Button
                  danger
                  icon={<XCircle size={16} />}
                  onClick={() => {
                    setDrawerVisible(false);
                    handleProcess(selectedApproval, 'reject');
                  }}
                >
                  驳回
                </Button>
                <Button
                  type="primary"
                  icon={<CheckCircle size={16} />}
                  onClick={() => {
                    setDrawerVisible(false);
                    handleProcess(selectedApproval, 'approve');
                  }}
                >
                  通过
                </Button>
              </>
            )}
            {selectedApproval && canPush(selectedApproval) && (
              <Button
                type="primary"
                icon={<Database size={16} />}
                onClick={() => {
                  handlePushToRegulatory(selectedApproval);
                  setDrawerVisible(false);
                }}
              >
                推送监管数据库
              </Button>
            )}
          </Space>
        }
      >
        {selectedApproval && (
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  {selectedApproval.level === 1 ? (
                    <ShieldCheck size={24} className="text-purple-600" />
                  ) : (
                    <Building2 size={24} className="text-yellow-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {selectedApproval.level === 1 ? '一级审批' : '二级审批'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Tag color={selectedApproval.status === 'pending' ? 'warning' : selectedApproval.status === 'approved' ? 'success' : 'error'}>
                      {selectedApproval.status === 'pending' ? '待审批' : selectedApproval.status === 'approved' ? '已通过' : '已驳回'}
                    </Tag>
                    <span className="text-sm text-gray-500">
                      任务：{selectedApproval.taskName}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Card title="基本信息" className="border-0 shadow-sm">
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="审批ID">
                  {selectedApproval.id}
                </Descriptions.Item>
                <Descriptions.Item label="关联任务">
                  <Button
                    type="link"
                    onClick={() => {
                      setDrawerVisible(false);
                      navigate(`/tasks/${selectedApproval.taskId}`);
                    }}
                    className="p-0 h-auto"
                  >
                    {selectedApproval.taskName}
                  </Button>
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {formatDateTime(selectedApproval.createdAt)}
                </Descriptions.Item>
                <Descriptions.Item label="审批状态">
                  <Tag color={selectedApproval.status === 'pending' ? 'warning' : selectedApproval.status === 'approved' ? 'success' : 'error'}>
                    {selectedApproval.status === 'pending' ? '待审批' : selectedApproval.status === 'approved' ? '已通过' : '已驳回'}
                  </Tag>
                </Descriptions.Item>
                {selectedApproval.approverName && (
                  <>
                    <Descriptions.Item label="审批人">
                      <div className="flex items-center gap-1">
                        <User size={14} />
                        {selectedApproval.approverName}
                      </div>
                    </Descriptions.Item>
                    <Descriptions.Item label="审批时间">
                      {selectedApproval.reviewedAt && formatDateTime(selectedApproval.reviewedAt)}
                    </Descriptions.Item>
                  </>
                )}
                {selectedApproval.comment && (
                  <Descriptions.Item label="审批意见" span={2}>
                    {selectedApproval.comment}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {selectedApproval.level === 1 && (
              <Card title="一级审批要点" className="border-0 shadow-sm">
                <List
                  size="small"
                  dataSource={[
                    { title: '计算收敛性', desc: '验证数值计算是否收敛，残差是否满足要求' },
                    { title: '结果合理性', desc: '检查温度、压力、浓度等物理量是否在合理范围' },
                    { title: '网格质量', desc: '确认自适应网格质量是否满足计算要求' },
                    { title: '边界条件', desc: '核实边界条件设置是否正确，是否符合地质实际' },
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <div className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-gray-500">{item.desc}</div>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            )}

            {selectedApproval.level === 2 && (
              <Card title="二级审批要点" className="border-0 shadow-sm">
                <List
                  size="small"
                  dataSource={[
                    { title: '风险评估', desc: '确认整体风险评估结论是否可接受' },
                    { title: '安全指数', desc: '核实长期安全指数是否满足监管要求（≥0.8）' },
                    { title: '核素释放率', desc: '检查核素释放率是否低于法规限值' },
                    { title: '审批文档', desc: '确认所有支撑文档是否完整、规范' },
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <div className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-gray-500">{item.desc}</div>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            )}

            <Card title="相关操作" className="border-0 shadow-sm">
              <Space wrap>
                <Button
                  icon={<FileText size={16} />}
                  onClick={() => {
                    setDrawerVisible(false);
                    navigate(`/reports?taskId=${selectedApproval.taskId}`);
                  }}
                >
                  查看报告
                </Button>
                <Button
                  icon={<Eye size={16} />}
                  onClick={() => {
                    setDrawerVisible(false);
                    navigate(`/tasks/${selectedApproval.taskId}`);
                  }}
                >
                  查看任务
                </Button>
              </Space>
            </Card>
          </div>
        )}
      </Drawer>

      <Modal
        title={processType === 'approve' ? '审批通过' : '审批驳回'}
        open={processModalVisible}
        onCancel={() => setProcessModalVisible(false)}
        footer={null}
        width={500}
      >
        {selectedApproval && (
          <Form
            form={processForm}
            layout="vertical"
            onFinish={handleSubmitProcess}
          >
            {processType === 'approve' ? (
              <Alert
                message="确认通过此审批？"
                description="通过后将进入下一审批环节或推送至监管数据库。"
                type="success"
                showIcon
                icon={<CheckCircle size={20} />}
                className="mb-4"
              />
            ) : (
              <Alert
                message="确认驳回此审批？"
                description="驳回后任务将退回，需要重新提交模拟。请务必填写驳回原因。"
                type="error"
                showIcon
                icon={<XCircle size={20} />}
                className="mb-4"
              />
            )}

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">审批任务</div>
              <div className="font-medium">{selectedApproval.taskName}</div>
              <div className="text-sm text-gray-500 mt-1">
                {selectedApproval.level === 1 ? '一级审批' : '二级审批'}
              </div>
            </div>

            <Form.Item
              name="comment"
              label="审批意见"
              rules={[
                { required: true, message: '请输入审批意见' },
                { min: 5, message: '审批意见至少5个字符' },
              ]}
            >
              <TextArea
                rows={4}
                placeholder={processType === 'approve'
                  ? '请输入通过意见，说明计算收敛性、结果合理性等...'
                  : '请输入驳回原因，说明存在的问题和改进建议...'
                }
              />
            </Form.Item>

            {processType === 'reject' && (
              <Alert
                message="驳回建议"
                description={
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-orange-500" />
                      <span>请明确指出计算中存在的具体问题</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-orange-500" />
                      <span>提供改进建议和参考方案</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-orange-500" />
                      <span>说明需要重新提交的条件</span>
                    </div>
                  </div>
                }
                type="warning"
                showIcon
              />
            )}

            <div className="flex justify-end gap-3 mt-4">
              <Button onClick={() => setProcessModalVisible(false)}>取消</Button>
              <Button
                type={processType === 'approve' ? 'primary' : 'primary'}
                danger={processType === 'reject'}
                htmlType="submit"
                icon={processType === 'approve' ? <CheckCircle size={16} /> : <XCircle size={16} />}
              >
                {processType === 'approve' ? '确认通过' : '确认驳回'}
              </Button>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default ApprovalsPage;
