import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Form,
  Row,
  Col,
  DatePicker,
  message,
  Steps,
  Alert,
  Checkbox,
  Radio,
  Divider,
  Statistic,
  List,
} from 'antd';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Database,
  Clock,
  Thermometer,
  Droplets,
  Gauge,
  Atom,
  Filter,
  Search,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportAPI, tasksAPI } from '../utils/api.js';
import { formatDateTime, formatScientific } from '../utils/format.js';
import type { SimulationTask } from '../../shared/types.js';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Step } = Steps;
const { Group: CheckboxGroup } = Checkbox;
const { Group: RadioGroup } = Radio;

interface ExportPreview {
  totalRecords: number;
  fileSize: string;
  estimatedTime: string;
  sampleData: any[];
}

export const ExportPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [tasks, setTasks] = useState<SimulationTask[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const data = await tasksAPI.getTasks({ page: 1, size: 100 });
      const completedTasks = data.items.filter((t) => t.status === 'completed');
      setTasks(completedTasks);
    } catch (error: any) {
      console.error('获取任务列表失败', error);
    }
  };

  const handleTaskChange = async (taskId: string) => {
    if (taskId) {
      try {
        const data = await exportAPI.getExportOptions(taskId);
        setPreview(data);
        setCurrentStep(1);
      } catch (error: any) {
        message.error(error.response?.data?.error || '获取导出选项失败');
      }
    }
  };

  const handlePreview = async () => {
    const values = await form.validateFields();
    if (!values.taskId) {
      message.warning('请先选择模拟任务');
      return;
    }
    setCurrentStep(2);
  };

  const handleExport = async () => {
    const values = await form.validateFields();
    try {
      setExporting(true);
      setExportProgress(0);
      
      const progressInterval = setInterval(() => {
        setExportProgress((prev) => Math.min(prev + 10, 90));
      }, 300);

      await exportAPI.exportData(values);
      
      clearInterval(progressInterval);
      setExportProgress(100);
      setCurrentStep(3);
      message.success('数据导出成功');
      
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = '#';
        link.download = `export_${Date.now()}.${values.format}`;
        link.click();
      }, 500);
    } catch (error: any) {
      message.error(error.response?.data?.error || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const stepItems = [
    { title: '选择任务', description: '选择模拟任务' },
    { title: '配置参数', description: '设置导出选项' },
    { title: '预览数据', description: '确认导出内容' },
    { title: '完成导出', description: '下载数据文件' },
  ];

  const dataTypes = [
    { label: '温度场数据', value: 'temperature', icon: <Thermometer size={16} className="text-red-500" /> },
    { label: '孔隙压力数据', value: 'pressure', icon: <Droplets size={16} className="text-blue-500" /> },
    { label: '应力应变数据', value: 'stress', icon: <Gauge size={16} className="text-orange-500" /> },
    { label: '核素浓度数据', value: 'concentration', icon: <Atom size={16} className="text-green-500" /> },
    { label: '安全评估数据', value: 'safety', icon: <CheckCircle size={16} className="text-purple-500" /> },
  ];

  const formatOptions = [
    { label: 'CSV 格式', value: 'csv', icon: <FileSpreadsheet size={18} className="text-green-500" />, desc: '适合Excel分析' },
    { label: 'JSON 格式', value: 'json', icon: <FileJson size={18} className="text-yellow-500" />, desc: '适合程序处理' },
    { label: 'TXT 格式', value: 'txt', icon: <FileText size={18} className="text-blue-500" />, desc: '通用文本格式' },
    { label: 'DAT 格式', value: 'dat', icon: <Database size={18} className="text-purple-500" />, desc: '适合数值计算' },
  ];

  const sampleColumns = [
    {
      title: '时间 (年)',
      dataIndex: 'time',
      key: 'time',
      width: 100,
    },
    {
      title: '温度 (°C)',
      dataIndex: 'temperature',
      key: 'temperature',
      render: (v: number) => formatScientific(v),
    },
    {
      title: '孔隙压力 (MPa)',
      dataIndex: 'pressure',
      key: 'pressure',
      render: (v: number) => formatScientific(v),
    },
    {
      title: '核素浓度 (mol/L)',
      dataIndex: 'concentration',
      key: 'concentration',
      render: (v: number) => formatScientific(v),
    },
    {
      title: '处置单元',
      dataIndex: 'unit',
      key: 'unit',
      width: 120,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">数据导出</h1>
          <p className="text-gray-500 mt-1">按处置单元、时间窗口导出全场模拟数据，支持多种格式</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Steps current={currentStep} items={stepItems} className="mb-8" />
      </Card>

      {currentStep === 0 && (
        <Card title="选择模拟任务" className="border-0 shadow-sm">
          <Form form={form} layout="vertical">
            <Form.Item
              name="taskId"
              label="选择已完成的模拟任务"
              rules={[{ required: true, message: '请选择模拟任务' }]}
            >
              <Select
                placeholder="请选择要导出数据的模拟任务"
                showSearch
                optionFilterProp="children"
                size="large"
                onChange={handleTaskChange}
              >
                {tasks.map((task) => (
                  <Option key={task.id} value={task.id}>
                    <div className="flex items-center justify-between">
                      <span>{task.name}</span>
                      <Tag color="success">{task.status === 'completed' ? '已完成' : task.status}</Tag>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {tasks.length === 0 && (
              <Alert
                message="暂无已完成的模拟任务"
                description="请先创建并完成模拟任务后再进行数据导出"
                type="info"
                showIcon
                action={
                  <Button size="small" type="primary" onClick={() => navigate('/upload')}>
                    创建任务
                  </Button>
                }
              />
            )}
          </Form>
        </Card>
      )}

      {currentStep >= 1 && (
        <Card title="配置导出参数" className="border-0 shadow-sm">
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="数据类型" name="dataTypes" rules={[{ required: true, message: '请选择要导出的数据类型' }]}>
                  <CheckboxGroup>
                    <Space direction="vertical" className="w-full">
                      {dataTypes.map((item) => (
                        <Checkbox key={item.value} value={item.value} className="flex items-center gap-2">
                          {item.icon}
                          <span>{item.label}</span>
                        </Checkbox>
                      ))}
                    </Space>
                  </CheckboxGroup>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="时间窗口" name="timeRange">
                  <RangePicker
                    showTime
                    placeholder={['开始时间', '结束时间']}
                    style={{ width: '100%' }}
                    size="large"
                  />
                </Form.Item>
                <Form.Item label="处置单元" name="units">
                  <Select
                    mode="multiple"
                    placeholder="选择处置单元（默认全部）"
                    size="large"
                    allowClear
                  >
                    <Option value="unit1">处置单元 1</Option>
                    <Option value="unit2">处置单元 2</Option>
                    <Option value="unit3">处置单元 3</Option>
                    <Option value="unit4">处置单元 4</Option>
                    <Option value="unit5">处置单元 5</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="采样间隔" name="sampleInterval" help="时间采样间隔，单位：年">
                  <Select size="large" defaultValue={10}>
                    <Option value={1}>1 年</Option>
                    <Option value={5}>5 年</Option>
                    <Option value={10}>10 年</Option>
                    <Option value={50}>50 年</Option>
                    <Option value={100}>100 年</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item label="导出格式" name="format" rules={[{ required: true, message: '请选择导出格式' }]}>
                  <RadioGroup>
                    <Row gutter={16}>
                      {formatOptions.map((fmt) => (
                        <Col span={6} key={fmt.value}>
                          <Radio value={fmt.value} className="w-full">
                            <Card className="mt-2 border-2 hover:border-blue-500 transition-colors cursor-pointer">
                              <div className="flex flex-col items-center gap-2">
                                {fmt.icon}
                                <div className="font-medium">{fmt.label}</div>
                                <div className="text-xs text-gray-500">{fmt.desc}</div>
                              </div>
                            </Card>
                          </Radio>
                        </Col>
                      ))}
                    </Row>
                  </RadioGroup>
                </Form.Item>
              </Col>
            </Row>

            <div className="flex justify-between mt-6">
              <Button size="large" onClick={() => setCurrentStep(0)}>
                上一步
              </Button>
              <Button type="primary" size="large" onClick={handlePreview}>
                预览数据
              </Button>
            </div>
          </Form>
        </Card>
      )}

      {currentStep >= 2 && (
        <Card title="数据预览" className="border-0 shadow-sm">
          {preview && (
            <>
              <Row gutter={16} className="mb-6">
                <Col span={8}>
                  <Card className="border-0 shadow-sm">
                    <Statistic
                      title="预计导出记录数"
                      value={preview.totalRecords}
                      suffix="条"
                      prefix={<Database size={20} className="text-blue-500" />}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card className="border-0 shadow-sm">
                    <Statistic
                      title="预计文件大小"
                      value={preview.fileSize}
                      prefix={<FileText size={20} className="text-green-500" />}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card className="border-0 shadow-sm">
                    <Statistic
                      title="预计导出时间"
                      value={preview.estimatedTime}
                      prefix={<Clock size={20} className="text-orange-500" />}
                    />
                  </Card>
                </Col>
              </Row>

              <div className="mb-4">
                <h4 className="font-medium mb-3">数据样例（前10条）</h4>
                <Table
                  dataSource={preview.sampleData}
                  columns={sampleColumns}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  bordered
                />
              </div>

              <Alert
                message="导出说明"
                description={
                  <List size="small">
                    <List.Item>• 导出文件将包含所选时间范围内的所有模拟数据</List.Item>
                    <List.Item>• 数据坐标系采用处置库全局坐标系，单位为国际标准单位</List.Item>
                    <List.Item>• CSV格式可直接使用Excel打开，JSON格式适合程序批量处理</List.Item>
                    <List.Item>• 大文件导出可能需要较长时间，请耐心等待</List.Item>
                  </List>
                }
                type="info"
                showIcon
              />

              <div className="flex justify-between mt-6">
                <Button size="large" onClick={() => setCurrentStep(1)}>
                  上一步
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<Download size={18} />}
                  onClick={handleExport}
                  loading={exporting}
                >
                  确认导出
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {currentStep >= 3 && (
        <Card className="border-0 shadow-sm text-center py-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">导出成功</h2>
          <p className="text-gray-500 mb-8">数据文件已生成，下载即将开始</p>
          
          {exporting && (
            <div className="max-w-md mx-auto mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">导出进度</span>
                <span className="text-sm text-blue-600">{exportProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}

          <Space>
            <Button size="large" onClick={() => setCurrentStep(0)}>
              继续导出
            </Button>
            <Button type="primary" size="large" onClick={() => navigate('/tasks')}>
              返回任务列表
            </Button>
          </Space>
        </Card>
      )}
    </div>
  );
};

export default ExportPage;
