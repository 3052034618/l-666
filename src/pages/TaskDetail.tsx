import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Progress,
  Steps,
  Table,
  Button,
  Space,
  Tag,
  Row,
  Col,
  Statistic,
  List,
  Alert as AntAlert,
  Tabs,
  Empty,
  Spin,
  message,
} from 'antd';
import {
  ArrowLeft,
  ArrowRight,
  PlayCircle,
  StopCircle,
  FileText,
  AlertTriangle,
  Thermometer,
  Droplets,
  Atom,
  Gauge,
  Clock,
  AlertCircle,
  SlidersHorizontal,
  BarChart3,
} from 'lucide-react';
import { tasksAPI } from '../utils/api.js';
import { formatDateTime, formatScientific, formatDuration, taskStatusMap } from '../utils/format.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { TemperatureChart } from '../components/charts/TemperatureChart.js';
import { StressStrainChart } from '../components/charts/StressStrainChart.js';
import { GaugeChart } from '../components/charts/GaugeChart.js';
import type { SimulationTask, TaskLog, ParamAdjustment, TaskResult } from '../../shared/types.js';

const { Step } = Steps;
const { TabPane } = Tabs;

export const TaskDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<SimulationTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjustments, setAdjustments] = useState<ParamAdjustment[]>([]);

  useEffect(() => {
    if (id) {
      fetchTaskData(id);
    }
  }, [id]);

  const fetchTaskData = async (taskId: string) => {
    try {
      setLoading(true);
      const [taskData, adjustmentsData] = await Promise.all([
        tasksAPI.getTask(taskId),
        tasksAPI.getAdjustments(taskId),
      ]);
      setTask(taskData);
      setAdjustments(adjustmentsData);
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取任务详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTask = async () => {
    if (!task) return;
    try {
      await tasksAPI.cancelTask(task.id);
      message.success('任务已取消');
      fetchTaskData(task.id);
    } catch (error: any) {
      message.error(error.response?.data?.error || '取消任务失败');
    }
  };

  const getCurrentStep = (status: string): number => {
    const steps = ['pending_validation', 'parsing', 'meshing', 'computing', 'evaluating', 'completed'];
    const idx = steps.indexOf(status);
    return idx >= 0 ? idx : status === 'failed' || status === 'rollback' ? 0 : 0;
  };

  const stepItems = [
    { title: '待校验', description: '数据校验' },
    { title: '参数解析', description: '参数提取' },
    { title: '网格生成', description: '自适应网格' },
    { title: '耦合计算', description: 'THMC四场' },
    { title: '安全评估', description: '风险分析' },
    { title: '完成', description: '任务结束' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spin size="large" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <Empty description="任务不存在" />
        <Button className="mt-4" onClick={() => navigate('/tasks')}>
          返回任务列表
        </Button>
      </div>
    );
  }

  const logColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (t: string) => formatDateTime(t),
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: string) => {
        const colors: Record<string, string> = {
          info: 'blue',
          warning: 'orange',
          error: 'red',
          debug: 'default',
        };
        return <Tag color={colors[level] || 'default'}>{level}</Tag>;
      },
    },
    {
      title: '日志内容',
      dataIndex: 'message',
      key: 'message',
    },
  ];

  const adjustmentColumns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (t: string) => formatDateTime(t),
    },
    {
      title: '参数名称',
      dataIndex: 'paramName',
      key: 'paramName',
      width: 150,
    },
    {
      title: '原值',
      dataIndex: 'oldValue',
      key: 'oldValue',
      width: 120,
      render: (v: number) => formatScientific(v),
    },
    {
      title: '新值',
      dataIndex: 'newValue',
      key: 'newValue',
      width: 120,
      render: (v: number) => formatScientific(v),
    },
    {
      title: '调整原因',
      dataIndex: 'reason',
      key: 'reason',
    },
    {
      title: '调整人',
      dataIndex: 'adjustedByName',
      key: 'adjustedByName',
      width: 120,
    },
  ];

  const hasResult = task.result && task.status === 'completed';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            icon={<ArrowLeft size={18} />}
            onClick={() => navigate('/tasks')}
          >
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{task.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge type="task" status={task.status} />
              <StatusBadge type="approval" status={task.approvalStatus} />
              <span className="text-sm text-gray-500">
                创建人：{task.createdByName}
              </span>
              <span className="text-sm text-gray-500">
                创建时间：{formatDateTime(task.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <Space>
          {task.status !== 'completed' && task.status !== 'failed' && (
            <Button
              type="primary"
              danger
              icon={<StopCircle size={18} />}
              onClick={handleCancelTask}
            >
              终止任务
            </Button>
          )}
          <Button
            icon={<FileText size={18} />}
            onClick={() => navigate(`/reports?taskId=${task.id}`)}
          >
            生成报告
          </Button>
        </Space>
      </div>

      {task.status === 'computing' && (
        <AntAlert
          message="模拟计算进行中"
          description="系统正在实时监控温度场、孔隙压力和核素迁移浓度，如有异常将自动触发预警。"
          type="info"
          showIcon
          icon={<PlayCircle size={20} className="animate-pulse" />}
        />
      )}

      {task.deviationCount >= 3 && (
        <AntAlert
          message="核素释放率偏差警告"
          description={`该处置单元已连续${task.deviationCount}次模拟核素释放率偏差超过20%，新任务已自动暂停。请联系首席科学家进行复核。`}
          type="error"
          showIcon
          icon={<AlertTriangle size={20} />}
        />
      )}

      <Card className="border-0 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">任务进度</h3>
          <div className="flex items-center gap-2">
            <Progress percent={task.progress} size="small" className="w-48" />
            <span className="text-sm text-gray-600">{task.progress}%</span>
          </div>
        </div>
        <Steps
          current={getCurrentStep(task.status)}
          status={task.status === 'failed' || task.status === 'rollback' ? 'error' : 'process'}
          items={stepItems}
        />
      </Card>

      {hasResult && (
        <Row gutter={16}>
          <Col span={6}>
            <Card className="border-0 shadow-sm">
              <Statistic
                title="最高温度"
                value={task.result!.maxTemperature}
                suffix="°C"
                precision={1}
                prefix={<Thermometer size={20} className="text-red-500" />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="border-0 shadow-sm">
              <Statistic
                title="最大孔隙压力"
                value={task.result!.maxPressure}
                suffix="MPa"
                precision={2}
                prefix={<Droplets size={20} className="text-blue-500" />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="border-0 shadow-sm">
              <Statistic
                title="核素释放率"
                value={task.result!.nuclideReleaseRate}
                suffix="%"
                precision={4}
                prefix={<Atom size={20} className="text-green-500" />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="border-0 shadow-sm">
              <Statistic
                title="计算耗时"
                value={task.result!.computationTime}
                suffix="s"
                precision={0}
                prefix={<Clock size={20} className="text-purple-500" />}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Tabs defaultActiveKey="overview" className="bg-white rounded-lg">
        <TabPane tab="概览" key="overview">
          <div className="space-y-6 p-4">
            <Card title="基本信息" className="border-0 shadow-sm">
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="任务ID">{task.id}</Descriptions.Item>
                <Descriptions.Item label="任务名称">{task.name}</Descriptions.Item>
                <Descriptions.Item label="创建人">{task.createdByName}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{formatDateTime(task.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{formatDateTime(task.updatedAt)}</Descriptions.Item>
                <Descriptions.Item label="当前状态">
                  <StatusBadge type="task" status={task.status} />
                </Descriptions.Item>
                <Descriptions.Item label="审批状态">
                  <StatusBadge type="approval" status={task.approvalStatus} />
                </Descriptions.Item>
                <Descriptions.Item label="偏差次数">{task.deviationCount} 次</Descriptions.Item>
                <Descriptions.Item label="任务描述" span={2}>
                  {task.description || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="废物包参数" className="border-0 shadow-sm">
              <Descriptions column={3} bordered size="small">
                <Descriptions.Item label="废物类型">
                  {task.params.wastePackageParams.type}
                </Descriptions.Item>
                <Descriptions.Item label="包壳材料">
                  {task.params.wastePackageParams.material}
                </Descriptions.Item>
                <Descriptions.Item label="放射性活度">
                  {formatScientific(task.params.wastePackageParams.radioactivity)} Bq
                </Descriptions.Item>
                <Descriptions.Item label="热输出">
                  {task.params.wastePackageParams.heatOutput} W
                </Descriptions.Item>
                <Descriptions.Item label="废物包间距">
                  {task.params.wastePackageParams.spacing} m
                </Descriptions.Item>
                <Descriptions.Item label="废物包数量">
                  {task.params.wastePackageParams.count} 个
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="工程屏障参数" className="border-0 shadow-sm">
              <Row gutter={16}>
                <Col span={12}>
                  <h4 className="font-medium mb-3">缓冲层</h4>
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="材料">
                      {task.params.engineeringBarrierParams.bufferLayer.material}
                    </Descriptions.Item>
                    <Descriptions.Item label="厚度">
                      {task.params.engineeringBarrierParams.bufferLayer.thickness} m
                    </Descriptions.Item>
                    <Descriptions.Item label="渗透系数">
                      {formatScientific(task.params.engineeringBarrierParams.bufferLayer.permeability)} m/s
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
                <Col span={12}>
                  <h4 className="font-medium mb-3">回填材料</h4>
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="材料">
                      {task.params.engineeringBarrierParams.backfill.material}
                    </Descriptions.Item>
                    <Descriptions.Item label="配比">
                      {task.params.engineeringBarrierParams.backfill.ratio}
                    </Descriptions.Item>
                    <Descriptions.Item label="压实度">
                      {(task.params.engineeringBarrierParams.backfill.compactness * 100).toFixed(1)}%
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
              </Row>
            </Card>
          </div>
        </TabPane>

        <TabPane tab="实时监控" key="monitor">
          <div className="space-y-6 p-4">
            {hasResult ? (
              <>
                <Row gutter={16}>
                  <Col span={12}>
                    <Card title="温度场趋势" className="border-0 shadow-sm">
                      <TemperatureChart data={task.result!.temperatureField} />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="孔隙压力趋势" className="border-0 shadow-sm">
                      <TemperatureChart data={task.result!.porePressure} color="#3B82F6" />
                    </Card>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Card title="核素浓度趋势" className="border-0 shadow-sm">
                      <TemperatureChart data={task.result!.nuclideConcentration} color="#10B981" yAxisName="核素浓度 (mol/L)" threshold={0.001} />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="应力应变曲线" className="border-0 shadow-sm">
                      <StressStrainChart data={task.result!.stressStrain} />
                    </Card>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={8}>
                    <Card title="长期安全指数" className="border-0 shadow-sm text-center">
                      <GaugeChart value={task.result!.safetyIndex} />
                    </Card>
                  </Col>
                </Row>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <AlertCircle size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-500">暂无监控数据，请等待模拟计算完成</p>
              </div>
            )}
          </div>
        </TabPane>

        <TabPane tab="运行日志" key="logs">
          <div className="p-4">
            <Table
              dataSource={task.logs}
              columns={logColumns}
              rowKey="id"
              pagination={{ pageSize: 20 }}
              scroll={{ y: 500 }}
            />
          </div>
        </TabPane>

        <TabPane tab="调参记录" key="adjustments">
          <div className="p-4 space-y-4">
            {adjustments.length > 0 ? (
              adjustments.map((adj) => (
                <Card key={adj.id} className="border-0 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <SlidersHorizontal size={20} className="text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">参数调整</h4>
                        <p className="text-sm text-gray-500">
                          {formatDateTime(adj.createdAt)} · {adj.adjustedByName}
                        </p>
                      </div>
                    </div>
                    <Tag color="orange">第 {adjustments.indexOf(adj) + 1} 次调整</Tag>
                  </div>
                  
                  {adj.reason && (
                    <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-100">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={16} className="text-orange-500 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium text-orange-800">调整原因：</span>
                          <span className="text-sm text-orange-700">{adj.reason}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Row gutter={24}>
                    <Col span={12}>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                          <ArrowLeft size={14} />
                          调整前
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">{adj.paramName}</span>
                            <span className="font-medium text-gray-800">
                              {typeof adj.oldValue === 'number' 
                                ? adj.oldValue.toFixed(2) 
                                : adj.oldValue}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-sm text-green-600 mb-2 flex items-center gap-1">
                          <ArrowRight size={14} />
                          调整后
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">{adj.paramName}</span>
                            <span className="font-medium text-green-700">
                              {typeof adj.newValue === 'number' 
                                ? adj.newValue.toFixed(2) 
                                : adj.newValue}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Col>
                  </Row>
                  
                  {hasResult && adjustments.indexOf(adj) === 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <BarChart3 size={16} className="text-blue-500" />
                        重算结果变化
                      </h5>
                      <Row gutter={16}>
                        <Col span={6}>
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-xs text-gray-500 mb-1">最高温度</div>
                            <div className="text-lg font-bold text-blue-600">
                              {task.result!.maxTemperature.toFixed(1)}°C
                            </div>
                          </div>
                        </Col>
                        <Col span={6}>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-xs text-gray-500 mb-1">最大孔隙压力</div>
                            <div className="text-lg font-bold text-purple-600">
                              {task.result!.maxPressure.toFixed(2)}MPa
                            </div>
                          </div>
                        </Col>
                        <Col span={6}>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-xs text-gray-500 mb-1">核素释放率</div>
                            <div className="text-lg font-bold text-green-600">
                              {task.result!.nuclideReleaseRate.toFixed(4)}%
                            </div>
                          </div>
                        </Col>
                        <Col span={6}>
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <div className="text-xs text-gray-500 mb-1">安全指数</div>
                            <div className="text-lg font-bold text-orange-600">
                              {(task.result!.safetyIndex * 100).toFixed(1)}%
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <Empty description="暂无调参记录" />
              </div>
            )}
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default TaskDetailPage;
