import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  Statistic,
  List,
  message,
  Drawer,
  Descriptions,
  Empty,
  Spin,
  Progress,
  Divider,
} from 'antd';
import {
  FileText,
  FileSearch,
  FileWarning,
  Thermometer,
  Gauge,
  Atom,
  Download,
  Eye,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  User,
} from 'lucide-react';
import { reportsAPI, tasksAPI } from '../utils/api.js';
import { formatDateTime, formatFileSize } from '../utils/format.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import type { Report, ReportType, ReportStatus, SimulationTask } from '../../shared/types.js';

const { Option } = Select;

export const ReportsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [tasks, setTasks] = useState<SimulationTask[]>([]);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    keyword: '',
  });

  useEffect(() => {
    fetchReports();
    fetchTasks();
  }, [filters, taskId]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await reportsAPI.getReports(taskId || undefined);
      
      let filtered = data;
      if (filters.type) {
        filtered = filtered.filter((r) => r.type === filters.type);
      }
      if (filters.status) {
        filtered = filtered.filter((r) => r.status === filters.status);
      }
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.name.toLowerCase().includes(kw) ||
            r.taskName.toLowerCase().includes(kw)
        );
      }
      
      setReports(filtered);
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取报告列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const data = await tasksAPI.getTasks({ page: 1, size: 100 });
      const completedTasks = data.items.filter((t) => t.status === 'completed');
      setTasks(completedTasks);
    } catch (error: any) {
      console.error('获取任务列表失败', error);
    }
  };

  const getTypeIcon = (type: ReportType) => {
    const icons: Record<ReportType, React.ReactNode> = {
      comprehensive: <FileText size={18} className="text-purple-500" />,
      temperature: <Thermometer size={18} className="text-red-500" />,
      stress: <Gauge size={18} className="text-blue-500" />,
      nuclide: <Atom size={18} className="text-green-500" />,
    };
    return icons[type] || <FileText size={18} />;
  };

  const getTypeLabel = (type: ReportType) => {
    const labels: Record<ReportType, string> = {
      comprehensive: '综合报告',
      temperature: '温度分析报告',
      stress: '应力应变报告',
      nuclide: '核素迁移报告',
    };
    return labels[type] || type;
  };

  const handleViewDetail = (report: Report) => {
    setSelectedReport(report);
    setDrawerVisible(true);
  };

  const handleCreateReport = () => {
    createForm.resetFields();
    if (taskId) {
      createForm.setFieldsValue({ taskId });
    }
    setCreateModalVisible(true);
  };

  const handleSubmitCreate = async (values: any) => {
    try {
      await reportsAPI.createReport({
        taskId: values.taskId,
        type: values.type,
      });
      message.success('报告生成中，请稍候...');
      setCreateModalVisible(false);
      setGenerating((prev) => ({ ...prev, [values.taskId]: true }));
      
      setTimeout(() => {
        fetchReports();
        setGenerating((prev) => ({ ...prev, [values.taskId]: false }));
      }, 3000);
    } catch (error: any) {
      message.error(error.response?.data?.error || '生成报告失败');
    }
  };

  const handleDownload = async (report: Report) => {
    if (report.status !== 'ready') {
      message.warning('报告尚未生成完成');
      return;
    }
    try {
      message.loading({ content: '正在获取下载链接...', key: 'download' });
      const result = await reportsAPI.downloadReport(report.id);
      
      const token = localStorage.getItem('token');
      const link = document.createElement('a');
      link.href = result.downloadUrl + (result.downloadUrl.includes('?') ? '&' : '?') + `token=${token}`;
      link.download = result.fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success({ content: '报告下载成功，可在浏览器中直接打开查看，或使用打印功能保存为PDF', key: 'download' });
    } catch (error: any) {
      message.error({ content: error.response?.data?.error || '下载失败', key: 'download' });
    }
  };

  const stats = {
    total: reports.length,
    generating: reports.filter((r) => r.status === 'generating').length,
    ready: reports.filter((r) => r.status === 'ready').length,
    failed: reports.filter((r) => r.status === 'failed').length,
  };

  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: ReportType) => (
        <div className="flex items-center gap-1">
          {getTypeIcon(type)}
          <span className="hidden sm:inline">{getTypeLabel(type)}</span>
        </div>
      ),
    },
    {
      title: '报告名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '关联任务',
      dataIndex: 'taskName',
      key: 'taskName',
      width: 200,
      ellipsis: true,
      render: (name: string, record: Report) => (
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
      width: 120,
      render: (status: ReportStatus) => {
        const statusMap: Record<ReportStatus, { label: string; color: string; icon: React.ReactNode }> = {
          generating: { label: '生成中', color: 'processing', icon: <Clock size={14} /> },
          ready: { label: '已就绪', color: 'success', icon: <CheckCircle size={14} /> },
          failed: { label: '失败', color: 'error', icon: <XCircle size={14} /> },
        };
        const config = statusMap[status];
        return (
          <div className="flex items-center gap-1">
            {config.icon}
            <Tag color={config.color}>{config.label}</Tag>
          </div>
        );
      },
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 70,
      render: (version: number) => (
        <Tag color="blue">V{version}</Tag>
      ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 120,
      render: (source: string) => source || '-',
    },
    {
      title: '审批状态',
      dataIndex: 'approvalStatus',
      key: 'approvalStatus',
      width: 120,
      render: (status: string | undefined) => {
        if (!status) return '-';
        const map: Record<string, { label: string; color: string }> = {
          pending: { label: '待审批', color: 'default' },
          approved_level1: { label: '一级通过', color: 'processing' },
          approved_level2: { label: '二级通过', color: 'success' },
          rejected: { label: '已驳回', color: 'error' },
          pushed: { label: '已推送', color: 'purple' },
        };
        const config = map[status] || { label: status, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (t: string) => formatDateTime(t),
    },
    {
      title: '生成时间',
      dataIndex: 'generatedAt',
      key: 'generatedAt',
      width: 160,
      render: (t: string | undefined) => t ? formatDateTime(t) : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: Report) => (
        <Space>
          <Button
            size="small"
            icon={<Eye size={14} />}
            onClick={() => handleViewDetail(record)}
          >
            预览
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<Download size={14} />}
            onClick={() => handleDownload(record)}
            disabled={record.status !== 'ready'}
          >
            下载
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">报告中心</h1>
          <p className="text-gray-500 mt-1">生成和下载模拟分析报告，包含温度云图、应力应变曲线和安全指数</p>
        </div>
        <Button
          type="primary"
          icon={<Plus size={18} />}
          onClick={handleCreateReport}
        >
          生成报告
        </Button>
      </div>

      <Row gutter={16}>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="报告总数"
              value={stats.total}
              prefix={<FileText size={20} className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="生成中"
              value={stats.generating}
              valueStyle={{ color: '#1890FF' }}
              prefix={<Clock size={20} className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="已就绪"
              value={stats.ready}
              valueStyle={{ color: '#52C41A' }}
              prefix={<CheckCircle size={20} className="text-green-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="失败"
              value={stats.failed}
              valueStyle={{ color: '#D8315B' }}
              prefix={<XCircle size={20} className="text-red-500" />}
            />
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-gray-400" />
            <Input
              placeholder="搜索报告名称..."
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              className="w-64"
              allowClear
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <Select
              placeholder="报告类型"
              value={filters.type || undefined}
              onChange={(v) => setFilters({ ...filters, type: v })}
              className="w-36"
              allowClear
            >
              <Option value="comprehensive">综合报告</Option>
              <Option value="temperature">温度分析</Option>
              <Option value="stress">应力应变</Option>
              <Option value="nuclide">核素迁移</Option>
            </Select>
            <Select
              placeholder="生成状态"
              value={filters.status || undefined}
              onChange={(v) => setFilters({ ...filters, status: v })}
              className="w-32"
              allowClear
            >
              <Option value="generating">生成中</Option>
              <Option value="ready">已就绪</Option>
              <Option value="failed">失败</Option>
            </Select>
          </div>
          <Button type="primary" onClick={fetchReports}>
            查询
          </Button>
          <Button onClick={() => setFilters({ type: '', status: '', keyword: '' })}>
            重置
          </Button>
        </div>

        <Table
          dataSource={reports}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 份报告`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Drawer
        title="报告预览"
        placement="right"
        width={800}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>关闭</Button>
            <Button
              type="primary"
              icon={<Download size={16} />}
              onClick={() => selectedReport && handleDownload(selectedReport)}
              disabled={selectedReport?.status !== 'ready'}
            >
              下载PDF
            </Button>
          </Space>
        }
      >
        {selectedReport && (
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                {getTypeIcon(selectedReport.type)}
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{selectedReport.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Tag color="purple">{getTypeLabel(selectedReport.type)}</Tag>
                    {selectedReport.status === 'ready' && <Tag color="success">已就绪</Tag>}
                    {selectedReport.status === 'generating' && <Tag color="processing">生成中</Tag>}
                    {selectedReport.status === 'failed' && <Tag color="error">生成失败</Tag>}
                  </div>
                </div>
              </div>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="关联任务">
                  <Button
                    type="link"
                    onClick={() => {
                      setDrawerVisible(false);
                      navigate(`/tasks/${selectedReport.taskId}`);
                    }}
                    className="p-0 h-auto"
                  >
                    {selectedReport.taskName}
                  </Button>
                </Descriptions.Item>
                <Descriptions.Item label="报告编号">
                  {selectedReport.id}
                </Descriptions.Item>
                <Descriptions.Item label="版本号">
                  <Tag color="blue">V{selectedReport.version || 1}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="生成来源">
                  {selectedReport.source || '系统自动生成'}
                </Descriptions.Item>
                <Descriptions.Item label="审批状态">
                  {selectedReport.approvalStatus ? (
                    <Tag color={
                      selectedReport.approvalStatus === 'pushed' ? 'purple' :
                      selectedReport.approvalStatus === 'approved_level2' ? 'success' :
                      selectedReport.approvalStatus === 'approved_level1' ? 'processing' :
                      selectedReport.approvalStatus === 'rejected' ? 'error' : 'default'
                    }>
                      {selectedReport.approvalStatus === 'pending' ? '待审批' :
                       selectedReport.approvalStatus === 'approved_level1' ? '一级审批通过' :
                       selectedReport.approvalStatus === 'approved_level2' ? '二级审批通过' :
                       selectedReport.approvalStatus === 'rejected' ? '已驳回' :
                       selectedReport.approvalStatus === 'pushed' ? '已推送监管' : selectedReport.approvalStatus}
                    </Tag>
                  ) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {formatDateTime(selectedReport.createdAt)}
                </Descriptions.Item>
                <Descriptions.Item label="生成完成时间" span={2}>
                  {selectedReport.generatedAt ? formatDateTime(selectedReport.generatedAt) : '-'}
                </Descriptions.Item>
              </Descriptions>
            </div>

            {selectedReport.status === 'ready' ? (
              <div className="space-y-4">
                <Card title="报告摘要" className="border-0 shadow-sm">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      <div>
                        <div className="font-medium">温度场分析</div>
                        <div className="text-sm text-gray-600">
                          处置库最高温度为 85.6°C，低于设计阈值 100°C，温度场分布均匀，无局部过热区域。
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                      <div>
                        <div className="font-medium">应力应变分析</div>
                        <div className="text-sm text-gray-600">
                          最大主应力为 25.3 MPa，低于岩体强度 35 MPa，应变最大值为 0.0012，处于弹性变形范围。
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                      <div>
                        <div className="font-medium">核素迁移分析</div>
                        <div className="text-sm text-gray-600">
                          1000年内核素释放率为 0.0023%，远低于监管限值 0.1%，工程屏障阻滞效果良好。
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                      <div>
                        <div className="font-medium">长期安全指数</div>
                        <div className="text-sm text-gray-600">
                          综合安全指数为 0.89，处于安全范围（≥0.8），处置库长期安全性达标。
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card title="报告目录" className="border-0 shadow-sm">
                  <List
                    size="small"
                    dataSource={[
                      '1. 概述',
                      '2. 计算模型与参数',
                      '3. 温度场模拟结果',
                      '4. 孔隙压力场模拟结果',
                      '5. 应力应变分析',
                      '6. 核素迁移模拟结果',
                      '7. 长期安全评估',
                      '8. 结论与建议',
                      '参考文献',
                      '附录：计算参数详表',
                    ]}
                    renderItem={(item) => <List.Item>{item}</List.Item>}
                  />
                </Card>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">PDF文件信息</div>
                      <div className="text-sm text-gray-500">文件大小：约 2.5 MB · 页数：45 页</div>
                    </div>
                    <Button
                      type="primary"
                      icon={<Download size={18} />}
                      onClick={() => handleDownload(selectedReport)}
                    >
                      下载完整报告
                    </Button>
                  </div>
                </div>
              </div>
            ) : selectedReport.status === 'generating' ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Spin size="large" />
                <p className="mt-4 text-gray-600">报告正在生成中，请稍候...</p>
                <Progress percent={65} className="w-64 mt-4" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <XCircle size={48} className="text-red-400 mb-4" />
                <p className="text-gray-600">报告生成失败</p>
                <Button className="mt-4" type="primary" onClick={handleCreateReport}>
                  重新生成
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        title="生成新报告"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleSubmitCreate}
        >
          <Form.Item
            name="taskId"
            label="选择模拟任务"
            rules={[{ required: true, message: '请选择模拟任务' }]}
          >
            <Select
              placeholder="请选择已完成的模拟任务"
              showSearch
              optionFilterProp="children"
              disabled={!!taskId}
            >
              {tasks.map((task) => (
                <Option key={task.id} value={task.id}>
                  {task.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="type"
            label="报告类型"
            rules={[{ required: true, message: '请选择报告类型' }]}
          >
            <Select placeholder="请选择报告类型">
              <Option value="comprehensive">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-purple-500" />
                  <span>综合报告</span>
                </div>
              </Option>
              <Option value="temperature">
                <div className="flex items-center gap-2">
                  <Thermometer size={16} className="text-red-500" />
                  <span>温度分析报告</span>
                </div>
              </Option>
              <Option value="stress">
                <div className="flex items-center gap-2">
                  <Gauge size={16} className="text-blue-500" />
                  <span>应力应变报告</span>
                </div>
              </Option>
              <Option value="nuclide">
                <div className="flex items-center gap-2">
                  <Atom size={16} className="text-green-500" />
                  <span>核素迁移报告</span>
                </div>
              </Option>
            </Select>
          </Form.Item>

          <div className="p-4 bg-blue-50 rounded-lg mb-4">
            <div className="text-blue-600 font-medium mb-1">报告内容说明</div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 综合报告：包含温度、应力、核素、安全指数等全部分析内容</li>
              <li>• 温度分析：温度云图、温度趋势、热影响范围分析</li>
              <li>• 应力应变：应力分布、应变曲线、岩体稳定性评估</li>
              <li>• 核素迁移：浓度等值面、释放率曲线、屏障效能评估</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3">
            <Button onClick={() => setCreateModalVisible(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={Object.values(generating).some(Boolean)}>
              开始生成
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ReportsPage;
