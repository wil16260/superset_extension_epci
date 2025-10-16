import { ChartProps, getNumberFormatter } from '@superset-ui/core';

export default function transformProps(chartProps: ChartProps) {
  const { width, height, formData, queriesData } = chartProps;
  const { show_labels, color_scheme, metric, siren_column, number_format } = formData as any;
  const data = (queriesData?.[0]?.data || []) as any[];

  const metricKey = (metric && (metric.label || metric)) || 'metric';
  const rows = data.map(d => ({
    name: String(d[siren_column]),
    value: Number(d[metricKey] ?? d.value ?? 0),
  }));

  const values = rows.map(r => r.value).filter(v => Number.isFinite(v));
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const formatter = getNumberFormatter(number_format || ',.2f');

  return {
    width,
    height,
    echartOptions: {
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => `${p.name}: ${p.value == null ? '—' : formatter(p.value)}`,
      },
      geo: {
        map: 'epci',
        roam: true,
        emphasis: { label: { show: !!show_labels } },
        label: { show: !!show_labels },
      },
      visualMap: {
        left: 'right',
        min,
        max,
        calculable: true,
      },
      series: [
        {
          type: 'map',
          map: 'epci',
          name: metricKey,
          data: rows,
          emphasis: { label: { show: !!show_labels } },
        },
      ],
    },
  };
}
