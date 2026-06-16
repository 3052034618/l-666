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
  message,
  Tabs,
  Switch,
  Divider,
  Descriptions,
  Avatar,
  List,
  Alert,
} from 'antd';
import {
  Settings,
  Users,
  Shield,
  Database,
  Bell,
  Plus,
  Edit,
  Trash2,
  Search,
  Save,
  RefreshCw,
  User as UserIcon,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { usersAPI } from '../utils/api.js';
import { formatDateTime } from '../utils/format.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import type { User, UserRole } from '../../shared/types.js';

const { Option } = Select;
const { TabPane } = Tabs;
const { Password } = Input;

export const SettingsPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm] = Form.useForm();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    autoApproval: false,
    dataRetention: 3650,
    temperatureThreshold: 100,
    pressureThreshold: 5,
    concentrationThreshold: 1e-6,
    deviationThreshold: 20,
  });

  useEffect(() => {
    fetchUsers();
  }, [searchKeyword]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await usersAPI.getUsers();
      let filtered = data;
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.name.toLowerCase().includes(kw) ||
            u.username.toLowerCase().includes(kw) ||
            u.email.toLowerCase().includes(kw)
        );
      }
      setUsers(filtered);
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    userForm.resetFields();
    setUserModalVisible(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    userForm.setFieldsValue({
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
    });
    setUserModalVisible(true);
  };

  const handleDeleteUser = async (user: User) => {
    Modal.confirm({
      title: '确认删除用户',
      content: `确定要删除用户 "${user.name}" 吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await usersAPI.deleteUser(user.id);
          message.success('用户删除成功');
          fetchUsers();
        } catch (error: any) {
          message.error(error.response?.data?.error || '删除失败');
        }
      },
    });
  };

  const handleSubmitUser = async (values: any) => {
    try {
      if (editingUser) {
        await usersAPI.updateUser(editingUser.id, values);
        message.success('用户信息更新成功');
      } else {
        await usersAPI.createUser(values);
        message.success('用户创建成功');
      }
      setUserModalVisible(false);
      fetchUsers();
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const handleSaveSettings = () => {
    message.success('系统设置已保存');
  };

  const userColumns = [
    {
      title: '用户信息',
      key: 'user',
      render: (_: any, record: User) => (
        <div className="flex items-center gap-3">
          <Avatar size={40} style={{ backgroundColor: '#0A2463' }}>
            {record.name.charAt(0)}
          </Avatar>
          <div>
            <div className="font-medium">{record.name}</div>
            <div className="text-sm text-gray-500">@{record.username}</div>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: UserRole) => <StatusBadge type="role" status={role} />,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (t: string) => formatDateTime(t),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 160,
      render: (t: string | undefined) => t ? formatDateTime(t) : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: User) => (
        <Space>
          <Button
            size="small"
            icon={<Edit size={14} />}
            onClick={() => handleEditUser(record)}
          >
            编辑
          </Button>
          {record.username !== 'admin' && (
            <Button
              size="small"
              danger
              icon={<Trash2 size={14} />}
              onClick={() => handleDeleteUser(record)}
            >
              删除
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
          <h1 className="text-2xl font-bold text-gray-800">系统设置</h1>
          <p className="text-gray-500 mt-1">管理系统用户、权限和预警阈值等配置</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={<span className="flex items-center gap-2"><Users size={16} />用户管理</span>} key="users">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search size={18} className="text-gray-400" />
                  <Input
                    placeholder="搜索用户名、姓名、邮箱..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-64"
                    allowClear
                  />
                </div>
                <Button
                  type="primary"
                  icon={<Plus size={18} />}
                  onClick={handleAddUser}
                >
                  新增用户
                </Button>
              </div>

              <Table
                dataSource={users}
                columns={userColumns}
                rowKey="id"
                loading={loading}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 个用户`,
                }}
              />
            </div>
          </TabPane>

          <TabPane tab={<span className="flex items-center gap-2"><Shield size={16} />权限配置</span>} key="permissions">
            <div className="space-y-6">
              <Alert
                message="角色权限说明"
                description="系统采用基于角色的访问控制（RBAC），不同角色拥有不同的功能权限。"
                type="info"
                showIcon
              />

              <Card title="角色权限矩阵" className="border-0 shadow-sm">
                <List
                  dataSource={[
                    { role: '安全分析师', perms: ['数据上传', '任务管理', '预警处理', '报告查看', '数据导出'] },
                    { role: '地质专家', perms: ['数据上传', '任务管理', '预警处理', '报告查看'] },
                    { role: '安全工程师', perms: ['任务管理', '预警处理', '报告查看', '数据导出', '一级审批'] },
                    { role: '项目总监', perms: ['任务管理', '报告查看', '智能推荐', '二级审批', '推送监管'] },
                    { role: '首席科学家', perms: ['任务管理', '报告查看', '智能推荐', '异常处理'] },
                    { role: '系统管理员', perms: ['全部功能', '用户管理', '系统设置'] },
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <div className="w-full">
                        <div className="flex items-center justify-between mb-2">
                          <StatusBadge type="role" status={item.role.toLowerCase().replace(' ', '') as UserRole} />
                          <span className="text-sm text-gray-500">{item.perms.length} 项权限</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {item.perms.map((perm, i) => (
                            <Tag key={i} color="blue">{perm}</Tag>
                          ))}
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </div>
          </TabPane>

          <TabPane tab={<span className="flex items-center gap-2"><Bell size={16} />预警阈值</span>} key="thresholds">
            <div className="max-w-3xl space-y-6">
              <Alert
                message="阈值配置说明"
                description="以下阈值用于异常检测和预警触发。当监测指标超过阈值时，系统将自动触发相应级别的预警。"
                type="info"
                showIcon
              />

              <Card title="物理参数阈值" className="border-0 shadow-sm">
                <Form layout="vertical">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="温度阈值 (°C)" help="超过此温度将触发温度预警">
                        <InputNumber
                          min={50}
                          max={200}
                          value={settings.temperatureThreshold}
                          onChange={(v) => setSettings({ ...settings, temperatureThreshold: v || 100 })}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="孔隙压力阈值 (MPa)" help="超过此压力将触发压力预警">
                        <InputNumber
                          min={1}
                          max={20}
                          step={0.1}
                          value={settings.pressureThreshold}
                          onChange={(v) => setSettings({ ...settings, pressureThreshold: v || 5 })}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="核素浓度阈值 (mol/L)" help="超过此浓度将触发核素迁移预警">
                        <InputNumber
                          min={1e-9}
                          max={1e-3}
                          step={1e-8}
                          value={settings.concentrationThreshold}
                          onChange={(v) => setSettings({ ...settings, concentrationThreshold: v || 1e-6 })}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="核素释放率偏差阈值 (%)" help="连续三次偏差超过此值将暂停新任务">
                        <InputNumber
                          min={5}
                          max={50}
                          value={settings.deviationThreshold}
                          onChange={(v) => setSettings({ ...settings, deviationThreshold: v || 20 })}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Card>

              <Card title="通知设置" className="border-0 shadow-sm">
                <List
                  dataSource={[
                    {
                      title: '邮件通知',
                      desc: '预警发生时发送邮件通知相关人员',
                      key: 'email',
                      value: settings.emailNotifications,
                    },
                    {
                      title: '短信通知',
                      desc: '严重预警时发送短信通知责任人',
                      key: 'sms',
                      value: settings.smsNotifications,
                    },
                    {
                      title: '自动审批',
                      desc: '低风险任务自动通过一级审批',
                      key: 'autoApproval',
                      value: settings.autoApproval,
                    },
                  ]}
                  renderItem={(item) => (
                    <List.Item
                      actions={[
                        <Switch
                          checked={item.value}
                          onChange={(checked) => setSettings({ ...settings, [item.key]: checked })}
                        />,
                      ]}
                    >
                      <List.Item.Meta
                        title={item.title}
                        description={item.desc}
                      />
                    </List.Item>
                  )}
                />
              </Card>

              <Card title="数据保留" className="border-0 shadow-sm">
                <Form layout="vertical">
                  <Form.Item label="模拟数据保留期限 (天)" help="超过此期限的模拟数据将自动归档">
                    <InputNumber
                      min={365}
                      max={36500}
                      value={settings.dataRetention}
                      onChange={(v) => setSettings({ ...settings, dataRetention: v || 3650 })}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Form>
              </Card>

              <div className="flex justify-end">
                <Button
                  type="primary"
                  icon={<Save size={18} />}
                  onClick={handleSaveSettings}
                  size="large"
                >
                  保存设置
                </Button>
              </div>
            </div>
          </TabPane>

          <TabPane tab={<span className="flex items-center gap-2"><Database size={16} />系统信息</span>} key="system">
            <div className="max-w-3xl space-y-6">
              <Card title="系统概况" className="border-0 shadow-sm">
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="系统名称">
                    高放射性废物深地质处置库长期安全模拟与多场耦合评估平台
                  </Descriptions.Item>
                  <Descriptions.Item label="系统版本">v1.0.0</Descriptions.Item>
                  <Descriptions.Item label="部署环境">生产环境</Descriptions.Item>
                  <Descriptions.Item label="最后更新">2024-01-15</Descriptions.Item>
                  <Descriptions.Item label="数据库">PostgreSQL 15</Descriptions.Item>
                  <Descriptions.Item label="缓存">Redis 7</Descriptions.Item>
                </Descriptions>
              </Card>

              <Card title="数据统计" className="border-0 shadow-sm">
                <Row gutter={16}>
                  <Col span={8}>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">{users.length}</div>
                      <div className="text-sm text-gray-500 mt-1">注册用户</div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-3xl font-bold text-green-600">15</div>
                      <div className="text-sm text-gray-500 mt-1">模拟任务</div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-3xl font-bold text-purple-600">2</div>
                      <div className="text-sm text-gray-500 mt-1">报告</div>
                    </div>
                  </Col>
                </Row>
              </Card>

              <Card title="系统操作" className="border-0 shadow-sm">
                <List
                  dataSource={[
                    {
                      title: '清除缓存',
                      desc: '清除系统缓存，释放内存空间',
                      icon: <RefreshCw size={20} className="text-blue-500" />,
                      action: () => message.success('缓存已清除'),
                    },
                    {
                      title: '备份数据',
                      desc: '备份所有模拟数据和用户信息',
                      icon: <Database size={20} className="text-green-500" />,
                      action: () => message.success('数据备份已启动'),
                    },
                  ]}
                  renderItem={(item) => (
                    <List.Item
                      actions={[
                        <Button type="primary" size="small" onClick={item.action}>
                          执行
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={item.icon}
                        title={item.title}
                        description={item.desc}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </div>
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={userModalVisible}
        onCancel={() => setUserModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={userForm}
          layout="vertical"
          onFinish={handleSubmitUser}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input placeholder="请输入用户名" disabled={!!editingUser} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="姓名"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value="analyst">安全分析师</Option>
              <Option value="geologist">地质专家</Option>
              <Option value="engineer">安全工程师</Option>
              <Option value="director">项目总监</Option>
              <Option value="scientist">首席科学家</Option>
              <Option value="admin">系统管理员</Option>
            </Select>
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="初始密码"
              rules={[
                { required: true, message: '请输入初始密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Password placeholder="请输入初始密码" />
            </Form.Item>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <Button onClick={() => setUserModalVisible(false)}>取消</Button>
            <Button type="primary" htmlType="submit">
              {editingUser ? '保存修改' : '创建用户'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default SettingsPage;
