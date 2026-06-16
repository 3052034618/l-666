import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, List, Tag } from 'antd';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  Activity,
  ThermometerSun,
  Gauge,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { dashboardAPI, alertsAPI, tasksAPI } from '../utils/api.js';
import type { DashboardStats, Alert, SimulationTask } from '../../shared/types.js';
import { formatDateTime, formatDuration, formatPercentage } from '../utils/format.js';
import StatusBadge from '../components/common/StatusBadge.js';
import GaugeChart from '../components/charts/GaugeChart.js';

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [recentTasks, setRecentTasks] = useState<SimulationTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, alertsData, tasksData] = await Promise.all([
          dashboardAPI.getStats(),
          alertsAPI.getAlerts({ status: 'pending' }),
          tasksAPI.getTasks({ page: 0, size: 5 }),
        ]);
        setStats(statsData);
        setRecentAlerts(alertsData.slice(0, 5));
        setRecentTasks(tasksData.items);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const trendChartOption: EChartsOption = {
    title: {
      text: '安全指数趋势',
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 500 },
    },
    tooltip: {
      trigger: 'axis',
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: stats?.safetyIndexTrend.map((d) => d.date) || [],
      axisLabel: { fontSize: 10, rotate: 45 },
    },
    yAxis: {
      type: 'value',
      min: 0.7,
      max: 1,
      axisLabel: { fontSize: 10 },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: '#0A2463' },
        itemStyle: { color: '#0A2463' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(10, 36, 99, 0.3)' },
              { offset: 1, color: 'rgba(10, 36, 99, 0.05)' },
            ],
          },
        },
        data: stats?.safetyIndexTrend.map((d) => d.value) || [],
      },
    ],
  };

  const statusChartOption: EChartsOption = {
    title: {
      text: '任务状态分布',
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 500 },
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
      textStyle: { fontSize: 11 },
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
        },
        data: stats?.taskStatusDistribution.map((s) => ({
          value: s.count,
          name: s.status === 'completed' ? '已完成' :
                s.status === 'computing' ? '计算中' :
                s.status === 'failed' ? '失败' :
                s.status === 'pending_validation' ? '待校验' : '其他',
          itemStyle: {
            color: s.status === 'completed' ? '#3FA34D' :
                   s.status === 'computing' ? '#3E92CC' :
                   s.status === 'failed' ? '#D8315B' : '#f59e0b',
          },
        })) || [],
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title={
                <span className="flex items-center gap-2 text-gray-600">
                  <CheckCircle size={16} className="text-green-500" />
                  任务完成率
                </span>
              }
              value={formatPercentage(stats?.completionRate || 0)}
              valueStyle={{ color: '#3FA34D' }}
              prefix={<TrendingUp size={20} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title={
                <span className="flex items-center gap-2 text-gray-600">
                  <Clock size={16} className="text-blue-500" />
                  平均计算耗时
                </span>
              }
              value={formatDuration(stats?.avgComputationTime || 0)}
              valueStyle={{ color: '#3E92CC' }}
              prefix={<Activity size={20} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title={
                <span className="flex items-center gap-2 text-gray-600">
                  <AlertTriangle size={16} className="text-orange-500" />
                  待处理预警
                </span>
              }
              value={stats?.activeAlerts || 0}
              valueStyle={{ color: '#f59e0b' }}
              prefix={<ThermometerSun size={20} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title={
                <span className="flex items-center gap-2 text-gray-600">
                  <FileCheck size={16} className="text-purple-500" />
                  待审批任务
                </span>
              }
              value={stats?.pendingApprovals || 0}
              valueStyle={{ color: '#8b5cf6' }}
              prefix={<Gauge size={20} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card className="border-0 shadow-sm h-full">
            <GaugeChart value={stats?.avgSafetyIndex || 0} title="平均安全指数" />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="border-0 shadow-sm h-full">
            <ReactECharts option={trendChartOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="border-0 shadow-sm h-full">
            <ReactECharts option={statusChartOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="最近预警"
            className="border-0 shadow-sm"
            extra={<a href="#/alerts" className="text-blue-600 text-sm">查看全部</a>}
          >
            <List
              dataSource={recentAlerts}
              renderItem={(alert) => (
                <List.Item className="hover:bg-gray-50 px-2 rounded-lg transition-colors">
                  <List.Item.Meta
                    avatar={
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        alert.level === 'critical' ? 'bg-red-100' :
                        alert.level === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        <AlertTriangle size={20} className={
                          alert.level === 'critical' ? 'text-red-500' :
                          alert.level === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                        } />
                      </div>
                    }
                    title={
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{alert.message}</span>
                        <StatusBadge type="alert" status={alert.level} />
                      </div>
                    }
                    description={
                      <div className="text-sm text-gray-500">
                        <span>{alert.taskName}</span>
                        <span className="mx-2">·</span>
                        <span>{formatDateTime(alert.timestamp)}</span>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="最近任务"
            className="border-0 shadow-sm"
            extra={<a href="#/tasks" className="text-blue-600 text-sm">查看全部</a>}
          >
            <List
              dataSource={recentTasks}
              renderItem={(task) => (
                <List.Item className="hover:bg-gray-50 px-2 rounded-lg transition-colors">
                  <List.Item.Meta
                    title={
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{task.name}</span>
                        <StatusBadge type="task" status={task.status} />
                      </div>
                    }
                    description={
                      <div className="text-sm text-gray-500">
                        <span>创建人: {task.createdByName}</span>
                        <span className="mx-2">·</span>
                        <span>{formatDateTime(task.createdAt)}</span>
                        {task.result && (
                          <>
                            <span className="mx-2">·</span>
                            <Tag color="blue">安全指数: {task.result.safetyIndex.toFixed(2)}</Tag>
                          </>
                        )}
                      </div>
                    }
                  />
                  {task.status === 'computing' && (
                    <div className="w-24">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 text-right mt-1">{task.progress}%</div>
                    </div>
                  )}
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
