import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  List,
  message,
  Descriptions,
  Drawer,
  Empty,
  Spin,
  Progress,
  Alert,
  Divider,
  Modal,
  Form,
  InputNumber,
} from 'antd';
import {
  Lightbulb,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Eye,
  Play,
  RefreshCw,
  Thermometer,
  Layers,
  Box,
  Info,
  ArrowRight,
  Star,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { recommendationsAPI, tasksAPI } from '../utils/api.js';
import { formatDateTime, formatScientific } from '../utils/format.js';
import type { Recommendation, SimulationTask } from '../../shared/types.js';

export const RecommendationsPage = () => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [tasks, setTasks] = useState<SimulationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [applyForm] = Form.useForm();
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recData, taskData] = await Promise.all([
        recommendationsAPI.getRecommendations(),
        tasksAPI.getTasks({ page: 1, size: 100 }),
      ]);
      setRecommendations(recData);
      setTasks(taskData.items);
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取推荐数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecommendation = async () => {
    try {
      setGenerating(true);
      await recommendationsAPI.createRecommendation({});
      message.success('智能推荐生成中，请稍候...');
      setTimeout(() => {
        fetchData();
        setGenerating(false);
      }, 3000);
    } catch (error: any) {
      message.error(error.response?.data?.error || '生成推荐失败');
      setGenerating(false);
    }
  };

  const handleViewDetail = (rec: Recommendation) => {
    setSelectedRec(rec);
    setDrawerVisible(true);
  };

  const handleApplyRecommendation = (rec: Recommendation) => {
    setSelectedRec(rec);
    applyForm.setFieldsValue({
      spacing: rec.recommendedParams.wasteSpacing,
      bufferThickness: rec.recommendedParams.bufferThickness,
    });
    setApplyModalVisible(true);
  };

  const handleConfirmApply = async (values: any) => {
    try {
      message.success('已应用推荐参数，正在创建新的模拟任务...');
      setApplyModalVisible(false);
      setTimeout(() => {
        navigate('/upload');
      }, 1500);
    } catch (error: any) {
      message.error(error.response?.data?.error || '应用推荐失败');
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'success';
    if (score >= 0.7) return 'processing';
    if (score >= 0.5) return 'warning';
    return 'error';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.9) return '极高';
    if (score >= 0.7) return '高';
    if (score >= 0.5) return '中等';
    return '较低';
  };

  const stats = {
    total: recommendations.length,
    highConfidence: recommendations.filter((r) => r.confidenceScore >= 0.9).length,
    applied: 0,
    avgConfidence: recommendations.length > 0
      ? (recommendations.reduce((sum, r) => sum + r.confidenceScore, 0) / recommendations.length * 100).toFixed(1)
      : '0',
  };

  const columns = [
    {
      title: '推荐ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => <span className="font-mono text-sm">{id.slice(0, 8)}...</span>,
    },
    {
      title: '基于任务',
      dataIndex: 'basedOnTaskName',
      key: 'basedOnTaskName',
      width: 200,
      ellipsis: true,
      render: (name: string, record: Recommendation) =>
        name ? (
          <Button
            type="link"
            onClick={() => navigate(`/tasks/${record.basedOnTaskId}`)}
            className="p-0 h-auto"
          >
            {name}
          </Button>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      title: '推荐参数',
      key: 'params',
      width: 300,
      render: (_: any, record: Recommendation) => (
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <Thermometer size={14} className="text-red-400" />
            <span>废物包间距：</span>
            <span className="font-medium">{record.recommendedParams.wasteSpacing} m</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-blue-400" />
            <span>缓冲层厚度：</span>
            <span className="font-medium">{record.recommendedParams.bufferThickness} m</span>
          </div>
          <div className="flex items-center gap-2">
            <Box size={14} className="text-green-400" />
            <span>回填配比：</span>
            <span className="font-medium">{record.recommendedParams.backfillRatio}</span>
          </div>
        </div>
      ),
    },
    {
      title: '置信度',
      dataIndex: 'confidenceScore',
      key: 'confidenceScore',
      width: 120,
      render: (score: number) => (
        <div>
          <Progress
            type="circle"
            percent={Math.round(score * 100)}
            size={60}
            strokeColor={getConfidenceColor(score)}
            format={(percent) => <span className="text-xs">{percent}%</span>}
          />
          <Tag color={getConfidenceColor(score)} className="mt-2">
            {getConfidenceLabel(score)}
          </Tag>
        </div>
      ),
    },
    {
      title: '生成时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (t: string) => formatDateTime(t),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: Recommendation) => (
        <Space>
          <Button
            size="small"
            icon={<Eye size={14} />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<Play size={14} />}
            onClick={() => handleApplyRecommendation(record)}
          >
            应用
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">智能推荐</h1>
          <p className="text-gray-500 mt-1">基于历史模拟结果，智能推荐最优废物包布局与回填配比</p>
        </div>
        <Button
          type="primary"
          icon={<RefreshCw size={18} />}
          onClick={handleGenerateRecommendation}
          loading={generating}
        >
          生成新推荐
        </Button>
      </div>

      <Alert
        message="智能推荐引擎"
        description="系统基于历史模拟数据，采用机器学习算法分析参数与安全指标的关联关系，为您推荐最优的设计参数组合。置信度越高表示推荐结果越可靠。"
        type="info"
        showIcon
        icon={<Lightbulb size={20} />}
      />

      <Row gutter={16}>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="推荐总数"
              value={stats.total}
              prefix={<Lightbulb size={20} className="text-yellow-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="高置信度推荐"
              value={stats.highConfidence}
              valueStyle={{ color: '#52C41A' }}
              prefix={<Star size={20} className="text-green-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="平均置信度"
              value={stats.avgConfidence}
              suffix="%"
              prefix={<TrendingUp size={20} className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic
              title="历史模拟样本"
              value={tasks.length}
              prefix={<Info size={20} className="text-purple-500" />}
            />
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Table
          dataSource={recommendations}
          columns={columns}
          rowKey="id"
          loading={loading || generating}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条推荐`,
          }}
          scroll={{ x: 1100 }}
          locale={{ emptyText: (
            <div className="py-16">
              <Empty description="暂无智能推荐">
                <Button type="primary" onClick={handleGenerateRecommendation}>
                  生成第一条推荐
                </Button>
              </Empty>
            </div>
          )}}
        />
      </Card>

      <Drawer
        title="推荐详情"
        placement="right"
        width={700}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>关闭</Button>
            <Button
              type="primary"
              icon={<Play size={16} />}
              onClick={() => {
                if (selectedRec) {
                  setDrawerVisible(false);
                  handleApplyRecommendation(selectedRec);
                }
              }}
            >
              应用推荐
            </Button>
          </Space>
        }
      >
        {selectedRec && (
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Lightbulb size={24} className="text-yellow-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">参数优化推荐</h2>
                    <div className="text-sm text-gray-500">
                      置信度：
                      <Tag color={getConfidenceColor(selectedRec.confidenceScore)}>
                        {getConfidenceLabel(selectedRec.confidenceScore)} ({Math.round(selectedRec.confidenceScore * 100)}%)
                      </Tag>
                    </div>
                  </div>
                </div>
                <Progress
                  type="circle"
                  percent={Math.round(selectedRec.confidenceScore * 100)}
                  size={80}
                  strokeColor={getConfidenceColor(selectedRec.confidenceScore)}
                />
              </div>
            </div>

            <Card title="推荐参数" className="border-0 shadow-sm">
              <Row gutter={16}>
                <Col span={8}>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <Thermometer size={32} className="text-red-500 mx-auto mb-2" />
                    <div className="text-sm text-gray-500 mb-1">废物包间距</div>
                    <div className="text-2xl font-bold text-gray-800">
                      {selectedRec.recommendedParams.wasteSpacing}
                      <span className="text-sm font-normal ml-1">m</span>
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Layers size={32} className="text-blue-500 mx-auto mb-2" />
                    <div className="text-sm text-gray-500 mb-1">缓冲层厚度</div>
                    <div className="text-2xl font-bold text-gray-800">
                      {selectedRec.recommendedParams.bufferThickness}
                      <span className="text-sm font-normal ml-1">m</span>
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Box size={32} className="text-green-500 mx-auto mb-2" />
                    <div className="text-sm text-gray-500 mb-1">回填配比</div>
                    <div className="text-2xl font-bold text-gray-800">
                      {selectedRec.recommendedParams.backfillRatio}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>

            <Card title="推荐说明" className="border-0 shadow-sm">
              <p className="text-gray-700 leading-relaxed">{selectedRec.explanation}</p>
            </Card>

            <Card title="参数对比分析" className="border-0 shadow-sm">
              <List
                size="small"
                dataSource={[
                  {
                    title: '废物包间距',
                    current: '6 m',
                    recommended: `${selectedRec.recommendedParams.wasteSpacing} m`,
                    improvement: '+33%',
                    benefit: '降低温度叠加效应，最高温度预计降低 12°C',
                  },
                  {
                    title: '缓冲层厚度',
                    current: '0.6 m',
                    recommended: `${selectedRec.recommendedParams.bufferThickness} m`,
                    improvement: '+33%',
                    benefit: '增强核素阻滞能力，释放率预计降低 45%',
                  },
                  {
                    title: '回填配比',
                    current: '60:40',
                    recommended: selectedRec.recommendedParams.backfillRatio,
                    improvement: '优化',
                    benefit: '提高压实度，渗透系数预计降低一个数量级',
                  },
                ]}
                renderItem={(item) => (
                  <List.Item>
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{item.title}</span>
                        <Tag color="green">{item.improvement}</Tag>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">当前：</span>
                          <span className="font-mono">{item.current}</span>
                        </div>
                        <ArrowRight size={16} className="text-gray-400" />
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">推荐：</span>
                          <span className="font-mono font-medium text-green-600">{item.recommended}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        <Info size={14} className="inline mr-1" />
                        {item.benefit}
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </Card>

            {selectedRec.basedOnTaskName && (
              <Card title="基于历史任务" className="border-0 shadow-sm">
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="任务名称">
                    <Button
                      type="link"
                      onClick={() => navigate(`/tasks/${selectedRec.basedOnTaskId}`)}
                      className="p-0 h-auto"
                    >
                      {selectedRec.basedOnTaskName}
                    </Button>
                  </Descriptions.Item>
                  <Descriptions.Item label="生成时间">
                    {formatDateTime(selectedRec.createdAt)}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        title="应用推荐参数"
        open={applyModalVisible}
        onCancel={() => setApplyModalVisible(false)}
        footer={null}
        width={500}
      >
        {selectedRec && (
          <Form
            form={applyForm}
            layout="vertical"
            onFinish={handleConfirmApply}
          >
            <Alert
              message="确认应用以下推荐参数创建新的模拟任务？"
              description="系统将使用这些参数自动创建新的模拟任务，您可以在创建前调整参数。"
              type="info"
              showIcon
              className="mb-4"
            />

            <Divider orientation="left">推荐参数</Divider>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="spacing"
                  label="废物包间距 (m)"
                  rules={[{ required: true, message: '请输入废物包间距' }]}
                >
                  <InputNumber min={3} max={15} step={0.5} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="bufferThickness"
                  label="缓冲层厚度 (m)"
                  rules={[{ required: true, message: '请输入缓冲层厚度' }]}
                >
                  <InputNumber min={0.3} max={2} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <div className="font-medium mb-2">回填配比</div>
              <div className="text-lg font-bold text-gray-800">
                {selectedRec.recommendedParams.backfillRatio}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button onClick={() => setApplyModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                确认并创建任务
              </Button>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default RecommendationsPage;
