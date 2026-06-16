import { useState, useCallback } from 'react';
import { Card, Upload, Button, Progress, List, Alert, Form, Input, InputNumber, Select, message, Steps, Space, Divider, Row, Col } from 'antd';
import { Upload as UploadIcon, FileText, CheckCircle, AlertTriangle, Play } from 'lucide-react';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { uploadAPI, tasksAPI } from '../utils/api.js';
import { formatFileSize } from '../utils/format.js';
import type { ValidationResult, TaskParams } from '../../shared/types.js';

const { Step } = Steps;
const { Option } = Select;
const { TextArea } = Input;

interface UploadData {
  files: UploadFile[];
  params: TaskParams | null;
  validation: ValidationResult | null;
}

export const UploadPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadData, setUploadData] = useState<UploadData>({
    files: [],
    params: null,
    validation: null,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [form] = Form.useForm();

  const handleUploadChange: UploadProps['onChange'] = async (info) => {
    if (info.file.status === 'uploading') {
      setUploading(true);
      setUploadProgress(info.file.percent || 0);
      return;
    }

    if (info.fileList.length > 0) {
      setUploading(true);
      setUploadProgress(50);
      
      try {
        const files = info.fileList.map((f) => f.originFileObj!).filter(Boolean);
        const result = await uploadAPI.uploadFiles(files);
        
        setUploadData({
          files: info.fileList,
          params: result.params,
          validation: result.validation,
        });
        
        form.setFieldsValue({
          wasteType: result.params.wastePackageParams.type,
          wasteMaterial: result.params.wastePackageParams.material,
          radioactivity: result.params.wastePackageParams.radioactivity,
          heatOutput: result.params.wastePackageParams.heatOutput,
          spacing: result.params.wastePackageParams.spacing,
          count: result.params.wastePackageParams.count,
          bufferMaterial: result.params.engineeringBarrierParams.bufferLayer.material,
          bufferThickness: result.params.engineeringBarrierParams.bufferLayer.thickness,
          permeability: result.params.engineeringBarrierParams.bufferLayer.permeability,
          backfillMaterial: result.params.engineeringBarrierParams.backfill.material,
          backfillRatio: result.params.engineeringBarrierParams.backfill.ratio,
          compactness: result.params.engineeringBarrierParams.backfill.compactness,
        });
        
        setUploadProgress(100);
        if (result.validation.valid) {
          setCurrentStep(1);
          message.success('文件上传成功，参数校验通过');
        } else {
          message.warning(`参数校验未通过，发现 ${result.validation.errors.length} 个错误，请修正后重试`);
        }
      } catch (error: any) {
        message.error(error.response?.data?.error || '上传失败');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleValidate = async () => {
    if (!uploadData.validation?.valid) {
      message.error('参数校验未通过，请修正错误后重试');
      return;
    }
    setCurrentStep(2);
  };

  const handleCreateTask = async (values: any) => {
    if (!uploadData.params) return;

    try {
      const params: TaskParams = {
        ...uploadData.params,
        wastePackageParams: {
          type: values.wasteType,
          material: values.wasteMaterial,
          radioactivity: values.radioactivity,
          heatOutput: values.heatOutput,
          spacing: values.spacing,
          count: values.count,
        },
        engineeringBarrierParams: {
          bufferLayer: {
            material: values.bufferMaterial,
            thickness: values.bufferThickness,
            permeability: values.permeability,
          },
          backfill: {
            material: values.backfillMaterial,
            ratio: values.backfillRatio,
            compactness: values.compactness,
          },
        },
      };

      await tasksAPI.createTask({
        name: values.taskName,
        description: values.description,
        params,
      });

      message.success('模拟任务创建成功');
      setCurrentStep(3);
    } catch (error: any) {
      message.error(error.response?.data?.error || '创建任务失败');
    }
  };

  const uploadProps: UploadProps = {
    name: 'files',
    multiple: true,
    fileList: uploadData.files,
    onChange: handleUploadChange,
    showUploadList: false,
    accept: '.json,.csv,.txt,.dat,.inp,.msh',
    beforeUpload: () => false,
  };

  const steps = [
    { title: '上传文件', description: '地质模型、参数文件' },
    { title: '参数配置', description: '废物包、工程屏障参数' },
    { title: '创建任务', description: '确认并提交模拟' },
    { title: '完成', description: '任务已创建' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card className="border-0 shadow-sm">
        <Steps current={currentStep} items={steps} className="mb-8" />
      </Card>

      {currentStep === 0 && (
        <Card title="上传数据文件" className="border-0 shadow-sm">
          <Upload.Dragger {...uploadProps} disabled={uploading} className="mb-6">
            <p className="text-4xl mb-4 text-blue-600">
              <UploadIcon size={48} />
            </p>
            <p className="text-lg font-medium text-gray-700 mb-2">
              点击或拖拽文件到此处上传
            </p>
            <p className="text-sm text-gray-500">
              支持 .json, .csv, .txt, .dat, .inp, .msh 格式，单个文件最大100MB
            </p>
            <p className="text-xs text-gray-400 mt-2">
              需要上传：地质模型文件、废物包参数文件、工程屏障参数文件
            </p>
          </Upload.Dragger>

          {uploading && (
            <Progress percent={uploadProgress} showInfo status="active" className="mb-4" />
          )}

          {uploadData.files.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-700 mb-3">已上传文件</h4>
              <List
                dataSource={uploadData.files}
                renderItem={(file) => (
                  <List.Item className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-blue-600" />
                      <div>
                        <div className="font-medium">{file.name}</div>
                        <div className="text-sm text-gray-500">{formatFileSize(file.size || 0)}</div>
                      </div>
                    </div>
                    <CheckCircle size={20} className="text-green-500" />
                  </List.Item>
                )}
              />
            </div>
          )}

          {uploadData.validation && (
            <div className="mt-6 space-y-3">
              {uploadData.validation.errors.length > 0 && (
                <Alert
                  message="参数错误"
                  description={
                    <ul className="list-disc pl-5">
                      {uploadData.validation.errors.map((err, i) => (
                        <li key={i} className="text-red-600">{err.field}: {err.message}</li>
                      ))}
                    </ul>
                  }
                  type="error"
                  showIcon
                  icon={<AlertTriangle size={20} />}
                />
              )}
              {uploadData.validation.warnings.length > 0 && (
                <Alert
                  message="参数警告"
                  description={
                    <ul className="list-disc pl-5">
                      {uploadData.validation.warnings.map((warn, i) => (
                        <li key={i} className="text-yellow-600">{warn.field}: {warn.message}</li>
                      ))}
                    </ul>
                  }
                  type="warning"
                  showIcon
                />
              )}
              {uploadData.validation.valid && (
                <Alert
                  message="参数校验通过"
                  type="success"
                  showIcon
                  icon={<CheckCircle size={20} />}
                />
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              type="primary"
              size="large"
              onClick={handleValidate}
              disabled={!uploadData.validation?.valid}
              icon={<CheckCircle size={18} />}
            >
              下一步：配置参数
            </Button>
          </div>
        </Card>
      )}

      {currentStep === 1 && (
        <Card title="参数配置" className="border-0 shadow-sm">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateTask}
            initialValues={{
              taskName: `处置库模拟任务-${Date.now()}`,
            }}
          >
            <Form.Item
              name="taskName"
              label="任务名称"
              rules={[{ required: true, message: '请输入任务名称' }]}
            >
              <Input placeholder="请输入任务名称" size="large" />
            </Form.Item>

            <Form.Item
              name="description"
              label="任务描述"
            >
              <TextArea rows={3} placeholder="请输入任务描述（可选）" size="large" />
            </Form.Item>

            <Divider orientation="left">废物包参数</Divider>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="wasteType" label="废物类型" rules={[{ required: true }]}>
                  <Select size="large">
                    <Option value="UO2">UO2 燃料</Option>
                    <Option value="MOX">MOX 燃料</Option>
                    <Option value="玻璃固化体">玻璃固化体</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="wasteMaterial" label="包壳材料" rules={[{ required: true }]}>
                  <Input size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="radioactivity" label="放射性活度 (Bq)" rules={[{ required: true }]}>
                  <InputNumber size="large" style={{ width: '100%' }} min={0} step={1e12} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="heatOutput" label="热输出 (W)" rules={[{ required: true }]}>
                  <InputNumber size="large" style={{ width: '100%' }} min={0} max={5000} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="spacing" label="废物包间距 (m)" rules={[{ required: true }]}>
                  <InputNumber size="large" style={{ width: '100%' }} min={3} max={15} step={0.5} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="count" label="废物包数量" rules={[{ required: true }]}>
              <InputNumber size="large" style={{ width: '100%' }} min={1} />
            </Form.Item>

            <Divider orientation="left">工程屏障参数</Divider>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="bufferMaterial" label="缓冲层材料" rules={[{ required: true }]}>
                  <Select size="large">
                    <Option value="膨润土">膨润土</Option>
                    <Option value="水泥基材料">水泥基材料</Option>
                    <Option value="沥青">沥青</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="bufferThickness" label="缓冲层厚度 (m)" rules={[{ required: true }]}>
                  <InputNumber size="large" style={{ width: '100%' }} min={0.3} max={2} step={0.1} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="permeability" label="渗透系数 (m/s)" rules={[{ required: true }]}>
                  <InputNumber size="large" style={{ width: '100%' }} min={1e-15} max={1e-8} step={1e-13} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="backfillMaterial" label="回填材料" rules={[{ required: true }]}>
                  <Select size="large">
                    <Option value="膨润土/砂混合物">膨润土/砂混合物</Option>
                    <Option value="水泥">水泥</Option>
                    <Option value="碎石">碎石</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="backfillRatio" label="配比" rules={[{ required: true }]}>
                  <Input size="large" placeholder="如: 70:30" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="compactness" label="压实度" rules={[{ required: true }]}>
                  <InputNumber size="large" style={{ width: '100%' }} min={0} max={1} step={0.01} />
                </Form.Item>
              </Col>
            </Row>

            <div className="mt-6 flex justify-between">
              <Button size="large" onClick={() => setCurrentStep(0)}>
                上一步
              </Button>
              <Button type="primary" size="large" htmlType="submit" icon={<Play size={18} />}>
                创建模拟任务
              </Button>
            </div>
          </Form>
        </Card>
      )}

      {currentStep === 3 && (
        <Card className="border-0 shadow-sm text-center py-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">任务创建成功</h2>
          <p className="text-gray-500 mb-8">模拟任务已提交，您可以在任务列表中查看进度</p>
          <Space>
            <Button size="large" onClick={() => setCurrentStep(0)}>
              继续创建新任务
            </Button>
            <Button type="primary" size="large" onClick={() => window.location.hash = '#/tasks'}>
              查看任务列表
            </Button>
          </Space>
        </Card>
      )}
    </div>
  );
};

export default UploadPage;
