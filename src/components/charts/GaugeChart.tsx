import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface GaugeChartProps {
  value: number;
  title?: string;
  unit?: string;
  max?: number;
}

export const GaugeChart = ({ value, title = '安全指数', unit = '', max = 1 }: GaugeChartProps) => {
  const getColor = (val: number) => {
    if (val >= 0.8) return '#3FA34D';
    if (val >= 0.6) return '#f59e0b';
    return '#D8315B';
  };

  const option: EChartsOption = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: max,
        splitNumber: 5,
        itemStyle: {
          color: getColor(value),
        },
        progress: {
          show: true,
          width: 18,
        },
        pointer: {
          show: true,
          length: '60%',
          width: 6,
        },
        axisLine: {
          lineStyle: {
            width: 18,
            color: [
              [0.6, '#D8315B'],
              [0.8, '#f59e0b'],
              [1, '#3FA34D'],
            ],
          },
        },
        axisTick: {
          distance: -30,
          splitNumber: 5,
          lineStyle: {
            width: 1,
            color: '#999',
          },
        },
        splitLine: {
          distance: -35,
          length: 10,
          lineStyle: {
            width: 2,
            color: '#999',
          },
        },
        axisLabel: {
          distance: -20,
          color: '#999',
          fontSize: 10,
          formatter: (value: number) => value.toFixed(1),
        },
        anchor: {
          show: true,
          showAbove: true,
          size: 15,
          itemStyle: {
            borderWidth: 8,
            borderColor: getColor(value),
          },
        },
        title: {
          show: true,
          offsetCenter: [0, '70%'],
          fontSize: 14,
          color: '#6b7280',
        },
        detail: {
          valueAnimation: true,
          fontSize: 32,
          fontWeight: 'bold',
          offsetCenter: [0, '30%'],
          formatter: `{value}${unit}`,
          color: getColor(value),
        },
        data: [
          {
            value: parseFloat(value.toFixed(2)),
            name: title,
          },
        ],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '100%', minHeight: 200 }} />;
};

export default GaugeChart;
