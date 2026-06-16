import { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge } from 'antd';
import {
  LayoutDashboard,
  Upload,
  ListTodo,
  Bell,
  FileText,
  Download,
  Lightbulb,
  ClipboardCheck,
  Settings,
  LogOut,
  User,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore.js';
import { userRoleMap } from '../../utils/format.js';

const { Header, Sider, Content } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <LayoutDashboard size={18} />,
      label: '首页仪表盘',
      roles: ['analyst', 'geologist', 'engineer', 'director', 'scientist', 'admin'],
    },
    {
      key: '/upload',
      icon: <Upload size={18} />,
      label: '数据上传',
      roles: ['analyst', 'geologist', 'admin'],
    },
    {
      key: '/tasks',
      icon: <ListTodo size={18} />,
      label: '任务列表',
      roles: ['analyst', 'geologist', 'engineer', 'director', 'scientist', 'admin'],
    },
    {
      key: '/alerts',
      icon: <Bell size={18} />,
      label: '预警中心',
      roles: ['analyst', 'geologist', 'engineer', 'admin'],
    },
    {
      key: '/reports',
      icon: <FileText size={18} />,
      label: '报告中心',
      roles: ['analyst', 'geologist', 'engineer', 'director', 'scientist', 'admin'],
    },
    {
      key: '/export',
      icon: <Download size={18} />,
      label: '数据导出',
      roles: ['analyst', 'engineer', 'admin'],
    },
    {
      key: '/recommendations',
      icon: <Lightbulb size={18} />,
      label: '智能推荐',
      roles: ['analyst', 'director', 'admin'],
    },
    {
      key: '/approvals',
      icon: <ClipboardCheck size={18} />,
      label: '审批中心',
      roles: ['engineer', 'director', 'admin'],
    },
    {
      key: '/settings',
      icon: <Settings size={18} />,
      label: '系统设置',
      roles: ['admin'],
    },
  ];

  const filteredItems = menuItems.filter((item) => user && item.roles.includes(user.role));

  const userMenuItems = [
    {
      key: 'profile',
      icon: <User size={16} />,
      label: '个人信息',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogOut size={16} />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        style={{
          background: 'linear-gradient(180deg, #0A2463 0%, #1a365d 100%)',
        }}
      >
        <div className="flex items-center justify-center h-16 px-4 border-b border-blue-800">
          <div className="text-white font-bold text-lg truncate">
            {collapsed ? 'HDWS' : '高放处置库模拟平台'}
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={filteredItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
            onClick: () => navigate(item.key),
          }))}
          className="bg-transparent border-r-0 mt-4"
        />
      </Sider>
      <Layout>
        <Header className="bg-white border-b border-gray-200 px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button
              className="text-gray-600 hover:text-blue-600 transition-colors"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
            <span className="text-gray-700 font-medium">
              欢迎回来，{user?.name}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Badge count={3} size="small">
              <Bell className="text-gray-600 hover:text-blue-600 cursor-pointer transition-colors" size={20} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
                <Avatar size={32} style={{ backgroundColor: '#0A2463' }}>
                  {user?.name?.charAt(0)}
                </Avatar>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-gray-800">{user?.name}</div>
                  <div className="text-xs text-gray-500">
                    {user && userRoleMap[user.role]?.label}
                  </div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="bg-gray-50 p-6">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
