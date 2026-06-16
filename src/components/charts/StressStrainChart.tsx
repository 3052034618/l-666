import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface StressStrainChartProps {
  data: { strain: number[]; stress: number[]; maxStress: number; maxStrain: number };
  title?: string;
}

export const StressStrainChart = ({ data, title = '应力应变曲线' }: StressStrainChartProps) => {
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
          <div>应变: ${data.value[0].toFixed(4)}</div>
          <div>应力: ${data.value[1].toFixed(2)} MPa</div>
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
      type: 'value',
      name: '应变',
      nameTextStyle: {
        fontSize: 12,
        color: '#6b7280',
      },
      axisLabel: {
        fontSize: 10,
        formatter: (value: number) => value.toFixed(3),
      },
    },
    yAxis: {
      type: 'value',
      name: '应力 (MPa)',
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
        name: '应力应变',
        type: 'line',
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2,
          color: '#3E92CC',
        },
        itemStyle: {
          color: '#3E92CC',
        },
        data: data.strain.map((s, i) => [s, data.stress[i]]),
        markPoint: {
          data: [
            {
              type: 'max',
              name: '最大值',
              label: {
                formatter: `最大应力: ${data.maxStress} MPa`,
              },
            },
          ],
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '100%', minHeight: 300 }} />;
};

export default StressStrainChart;
