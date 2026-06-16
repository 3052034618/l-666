import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface TemperatureChartProps {
  data: { time: number[]; values: number[]; units: string };
  title?: string;
  threshold?: number;
  color?: string;
  yAxisName?: string;
}

export const TemperatureChart = ({ data, title = '温度场变化趋势', threshold = 100, color = '#D8315B', yAxisName = '温度 (°C)' }: TemperatureChartProps) => {
  const option: EChartsOption = {
    title: {
      text: title,
      left: 'center',
      textStyle: {
        fontSize: 14,
        fontWeight: 500,
        color: '#1f2937',
      },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0];
        return `<div>
          <div>时间: ${data.value[0]} 年</div>
          <div>数值: ${data.value[1].toFixed(6)} ${data.units || ''}</div>
        </div>`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      name: '时间 (年)',
      nameTextStyle: {
        fontSize: 12,
        color: '#6b7280',
      },
      data: data.time,
      axisLabel: {
        rotate: 45,
        fontSize: 10,
      },
    },
    yAxis: {
      type: 'value',
      name: yAxisName,
      nameTextStyle: {
        fontSize: 12,
        color: '#6b7280',
      },
      axisLabel: {
        fontSize: 10,
      },
    },
    series: [
      {
        name: '温度',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: {
          width: 2,
          color: color,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: color + '4D' },
              { offset: 1, color: color + '0D' },
            ],
          },
        },
        data: data.time.map((t, i) => [t, data.values[i]]),
      },
      {
        name: '阈值',
        type: 'line',
        lineStyle: {
          width: 1,
          type: 'dashed',
          color: color,
        },
        symbol: 'none',
        data: data.time.map((t) => [t, threshold]),
        markLine: {
          silent: true,
          data: [
            {
              yAxis: threshold,
              lineStyle: {
                color: color,
                type: 'dashed',
              },
              label: {
                formatter: `阈值: ${threshold}`,
                position: 'end',
              },
            },
          ],
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '100%', minHeight: 300 }} />;
};

export default TemperatureChart;
