import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { User, Lock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore.js';

export const Login = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { login, user, token, error, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user && token) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, token, navigate, location.state]);

  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values);
      message.success('登录成功');
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      <Card className="w-full max-w-md mx-4 shadow-2xl backdrop-blur-sm bg-white/95 border-0 rounded-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">HD</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">高放处置库模拟平台</h1>
          <p className="text-gray-500 text-sm">长期安全模拟与多场耦合评估</p>
        </div>

        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
          initialValues={{ username: 'admin', password: '123456' }}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<User size={18} className="text-gray-400" />}
              placeholder="用户名"
              className="h-12 rounded-lg"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<Lock size={18} className="text-gray-400" />}
              placeholder="密码"
              className="h-12 rounded-lg"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading || isLoading}
              block
              className="h-12 rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 border-0 font-medium text-base shadow-lg shadow-blue-500/30"
            >
              登录系统
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center text-xs text-gray-400 mt-6 space-y-1">
          <p>测试账号: admin / 123456 (系统管理员)</p>
          <p>测试账号: analyst1 / 123456 (安全分析师)</p>
          <p>测试账号: engineer1 / 123456 (安全工程师)</p>
        </div>
      </Card>
    </div>
  );
};

export default Login;
